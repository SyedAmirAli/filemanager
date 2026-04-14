import { Controller, Delete, Get, Param, Post, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { diskStorage } from 'multer';
import { FilesService } from './files.service';
import { buildStoredFilename, extensionFolder, toStoredPath } from './file-naming';
import { decodeMultipartFilename } from './decode-multipart-filename';
import { ensureCategoryUploadDir } from './upload-path';

function contentDispositionAttachment(filename: string): string {
    const ascii = filename
        .replace(/[^\x20-\x7E]/g, '_')
        .replace(/["\\]/g, '_')
        .slice(0, 200);
    const safe = ascii || 'download';
    const star = encodeURIComponent(filename);
    return `attachment; filename="${safe}"; filename*=UTF-8''${star}`;
}

function contentDispositionInline(filename: string): string {
    const ascii = filename
        .replace(/[^\x20-\x7E]/g, '_')
        .replace(/["\\]/g, '_')
        .slice(0, 200);
    const safe = ascii || 'preview';
    const star = encodeURIComponent(filename);
    return `inline; filename="${safe}"; filename*=UTF-8''${star}`;
}

@Controller('api/files')
export class FilesController {
    constructor(private readonly files: FilesService) {}

    @Post()
    @UseInterceptors(
        FileInterceptor('file', {
            storage: diskStorage({
                destination: (req, file, cb) => {
                    const name = decodeMultipartFilename(file.originalname);
                    void ensureCategoryUploadDir(name, file.mimetype)
                        .then(({ dir }) => cb(null, dir))
                        .catch((err: Error) => cb(err, ''));
                },
                filename: (req, file, cb) => {
                    try {
                        const name = decodeMultipartFilename(file.originalname);
                        cb(null, buildStoredFilename(name));
                    } catch (err) {
                        cb(err as Error, '');
                    }
                },
            }),
            limits: { fileSize: Number.MAX_SAFE_INTEGER },
        }),
    )
    async upload(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            return { error: 'No file' };
        }
        const originalName = decodeMultipartFilename(file.originalname);
        const folder = extensionFolder(originalName, file.mimetype);
        const storedPath = toStoredPath(folder, file.filename);
        const row = await this.files.createRecord(
            originalName,
            storedPath,
            file.mimetype || 'application/octet-stream',
            BigInt(file.size),
        );
        return {
            id: row.id,
            originalName: row.originalName,
            mimeType: row.mimeType,
            size: row.size.toString(),
            createdAt: row.createdAt.toISOString(),
            storedPath: row.storedPath,
        };
    }

    @Get()
    async list() {
        const rows = await this.files.list();
        return rows.map((r) => ({
            id: r.id,
            originalName: r.originalName,
            mimeType: r.mimeType,
            size: r.size.toString(),
            createdAt: r.createdAt.toISOString(),
            storedPath: r.storedPath,
        }));
    }

    @Get(':id/download')
    async download(@Param('id') id: string, @Res({ passthrough: false }) res: Response) {
        const row = await this.files.getOne(id);
        const stream = this.files.createReadStreamForFile(row);
        res.setHeader('Content-Disposition', contentDispositionAttachment(row.originalName));
        res.setHeader('Content-Type', row.mimeType || 'application/octet-stream');
        stream.pipe(res);
    }

    @Get(':id/preview')
    async preview(@Param('id') id: string, @Res({ passthrough: false }) res: Response) {
        const row = await this.files.getOne(id);
        const stream = this.files.createReadStreamForFile(row);
        res.setHeader('Content-Disposition', contentDispositionInline(row.originalName));
        res.setHeader('Content-Type', row.mimeType || 'application/octet-stream');
        stream.pipe(res);
    }

    @Delete(':id')
    async delete(@Param('id') id: string) {
        await this.files.remove(id);
        return { ok: true };
    }
}
