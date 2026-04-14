import { mkdir } from 'fs/promises';
import { join } from 'path';
import { extensionFolder } from './file-naming';

/** Project `public/` root (static files + uploads). */
export function getPublicRoot(): string {
    const p = process.env.PUBLIC_DIR;
    if (p && (p.startsWith('/') || /^[A-Za-z]:[\\/]/.test(p))) {
        return p;
    }
    return join(process.cwd(), p ?? 'public');
}

/** @deprecated use getPublicRoot + storedPath */
export function getUploadRoot(): string {
    return join(getPublicRoot(), 'uploads');
}

/** Ensure `public/uploads/{folder}/` exists. Returns absolute path to that folder. */
export async function ensureCategoryUploadDir(
    originalName: string,
    mimeType: string,
): Promise<{ dir: string; folder: string }> {
    const folder = extensionFolder(originalName, mimeType);
    const dir = join(getPublicRoot(), 'uploads', folder);
    await mkdir(dir, { recursive: true });
    return { dir, folder };
}
