import { getApiBase } from '@/apiConfig';
import type { ChatMessage, FileRow } from './types';

export async function patchMessageApi(id: string, patch: { body?: string; pinned?: boolean }) {
    const r = await fetch(`${getApiBase()}/messages/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
    });
    if (!r.ok) throw new Error('Failed to update message');
    return r.json() as Promise<ChatMessage>;
}

export async function deleteMessageApi(id: string) {
    const r = await fetch(`${getApiBase()}/messages/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!r.ok) throw new Error('Failed to delete message');
}

export async function bulkDeleteMessagesApi(ids: string[]) {
    const r = await fetch(`${getApiBase()}/messages/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
    });
    if (!r.ok) throw new Error('Bulk delete failed');
    return r.json() as Promise<{ ok: boolean; deleted: number }>;
}

export async function fetchFiles(): Promise<FileRow[]> {
    const r = await fetch(`${getApiBase()}/files`);
    if (!r.ok) throw new Error('Failed to load files');
    return r.json();
}

export async function fetchMessages(
    limit: number,
    before?: string,
): Promise<{ items: ChatMessage[]; nextCursor: string | null; hasMore: boolean }> {
    const q = new URLSearchParams({ limit: String(limit) });
    if (before) q.set('before', before);
    const r = await fetch(`${getApiBase()}/messages?${q}`);
    if (!r.ok) throw new Error('Failed to load messages');
    return r.json();
}

export function uploadFileWithProgress(file: File, onProgress: (loaded: number, total: number) => void): Promise<void> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const fd = new FormData();
        fd.append('file', file);
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                onProgress(e.loaded, e.total);
            }
        });
        xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve();
            } else {
                reject(new Error(xhr.statusText || `Upload failed (${xhr.status})`));
            }
        });
        xhr.addEventListener('error', () => reject(new Error('Network error')));
        xhr.addEventListener('abort', () => reject(new Error('Aborted')));
        xhr.open('POST', `${getApiBase()}/files`);
        xhr.send(fd);
    });
}
