import { basename, extname } from 'path';
import slug from '../lib/slugify';

/** Folder name under `public/uploads/` (e.g. jpg, pdf). */
export function extensionFolder(
  originalName: string,
  mimeType: string,
): string {
  const fromName = extname(originalName).replace(/^\./, '').toLowerCase();
  const cleaned = fromName.replace(/[^a-z0-9]/g, '');
  if (cleaned.length > 0) {
    return cleaned.slice(0, 32);
  }
  const fromMime: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    'application/pdf': 'pdf',
    'text/plain': 'txt',
    'text/csv': 'csv',
    'application/zip': 'zip',
    'application/x-zip-compressed': 'zip',
  };
  return fromMime[mimeType] ?? 'bin';
}

/** Final disk filename: slug-{microTimestamp}.ext */
export function buildStoredFilename(originalName: string): string {
  const dotExt = extname(originalName);
  const base = basename(originalName, dotExt) || 'file';
  const slugPart = slug(base) || 'file';
  const ns = process.hrtime.bigint();
  const micro = `${Date.now().toString(36)}-${ns.toString(36)}`;
  const extLower = dotExt ? dotExt.toLowerCase() : '';
  return `${slugPart}-${micro}${extLower}`;
}

/** DB + URL-relative path under `public/`: `uploads/jpg/name.jpg`. */
export function toStoredPath(folder: string, filename: string): string {
  return `uploads/${folder}/${filename}`.replace(/\\/g, '/');
}
