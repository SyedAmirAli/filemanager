/** MIME types / extensions browsers typically open inline (new tab). */

const PREVIEW_MIME_EXACT = new Set([
    'application/pdf',
    'text/plain',
    'text/html',
    'text/css',
    'text/csv',
    'application/json',
    'image/svg+xml',
]);

const PREVIEW_EXT = new Set([
    'pdf',
    'png',
    'jpg',
    'jpeg',
    'gif',
    'webp',
    'svg',
    'bmp',
    'ico',
    'txt',
    'csv',
    'json',
    'html',
    'htm',
    'css',
    'md',
    'mp4',
    'webm',
    'ogv',
    'mp3',
    'wav',
    'ogg',
    'm4a',
    'aac',
]);

export function canPreviewInBrowser(mimeType: string, originalName: string): boolean {
    const m = mimeType.toLowerCase().split(';')[0].trim();
    if (m.startsWith('image/') || m.startsWith('video/') || m.startsWith('audio/')) {
        return true;
    }
    if (PREVIEW_MIME_EXACT.has(m)) {
        return true;
    }
    if (m === 'application/octet-stream' || m === '') {
        const ext = originalName.includes('.') ? originalName.split('.').pop()!.toLowerCase() : '';
        return ext !== '' && PREVIEW_EXT.has(ext);
    }
    return false;
}
