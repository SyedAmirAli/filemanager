import { Injectable, NotFoundException } from '@nestjs/common';
import { createReadStream, existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { getPublicRoot } from './upload-path';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import type { FileRecord } from '@prisma/client';

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async createRecord(
    originalName: string,
    storedPath: string,
    mimeType: string,
    size: bigint,
  ): Promise<FileRecord> {
    const row = await this.prisma.fileRecord.create({
      data: {
        originalName,
        storedPath,
        mimeType,
        size,
      },
    });
    this.realtime.emitFilesChanged();
    return row;
  }

  async list(): Promise<FileRecord[]> {
    return this.prisma.fileRecord.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOne(id: string): Promise<FileRecord> {
    const row = await this.prisma.fileRecord.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException('File not found');
    }
    return row;
  }

  createReadStreamForFile(row: FileRecord) {
    const full = join(getPublicRoot(), row.storedPath);
    if (!existsSync(full)) {
      throw new NotFoundException('File missing on disk');
    }
    return createReadStream(full);
  }

  async remove(id: string): Promise<void> {
    const row = await this.prisma.fileRecord.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException('File not found');
    }
    const full = join(getPublicRoot(), row.storedPath);
    try {
      if (existsSync(full)) {
        unlinkSync(full);
      }
    } catch {
      // ignore unlink errors; still remove DB row
    }
    await this.prisma.fileRecord.delete({ where: { id } });
    this.realtime.emitFilesChanged();
  }
}
