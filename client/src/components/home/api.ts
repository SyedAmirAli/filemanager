import { getApiBase } from '@/apiConfig';
import { getActiveSecurityPin } from '@/securityPin';
import type { ChatMessage, FileRow } from './types';

export async function verifySecurityPinApi(pin: string): Promise<boolean> {
    const r = await fetch(`${getApiBase()}/security/pin/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
    });
    if (!r.ok) throw new Error('PIN verification failed');
    const data = (await r.json()) as { ok?: boolean };
    return data.ok === true;
}

function withSecurityPinHeader(headers?: HeadersInit): Headers {
    const next = new Headers(headers ?? {});
    const pin = getActiveSecurityPin();
    if (pin) {
        next.set('x-security-pin', pin);
    }
    return next;
}

async function authedFetch(input: string, init?: RequestInit): Promise<Response> {
    return fetch(input, {
        ...init,
        headers: withSecurityPinHeader(init?.headers),
    });
}

export async function patchMessageApi(id: string, patch: { body?: string; pinned?: boolean }) {
    const r = await authedFetch(`${getApiBase()}/messages/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
    });
    if (!r.ok) throw new Error('Failed to update message');
    return r.json() as Promise<ChatMessage>;
}

export async function deleteMessageApi(id: string) {
    const r = await authedFetch(`${getApiBase()}/messages/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!r.ok) throw new Error('Failed to delete message');
}

export async function bulkDeleteMessagesApi(ids: string[]) {
    const r = await authedFetch(`${getApiBase()}/messages/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
    });
    if (!r.ok) throw new Error('Bulk delete failed');
    return r.json() as Promise<{ ok: boolean; deleted: number }>;
}

export async function fetchFiles(): Promise<FileRow[]> {
    const r = await authedFetch(`${getApiBase()}/files`);
    if (!r.ok) throw new Error('Failed to load files');
    return r.json();
}

export async function fetchMessages(
    limit: number,
    before?: string,
): Promise<{ items: ChatMessage[]; nextCursor: string | null; hasMore: boolean }> {
    const q = new URLSearchParams({ limit: String(limit) });
    if (before) q.set('before', before);
    const r = await authedFetch(`${getApiBase()}/messages?${q}`);
    if (!r.ok) throw new Error('Failed to load messages');
    return r.json();
}

export async function deleteFileApi(id: string) {
    const r = await authedFetch(`${getApiBase()}/files/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!r.ok) throw new Error('Failed to delete file');
}

export async function openFilePreviewApi(id: string) {
    const r = await authedFetch(`${getApiBase()}/files/${encodeURIComponent(id)}/preview`);
    if (!r.ok) throw new Error('Preview failed');
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (!opened) {
        URL.revokeObjectURL(url);
        throw new Error('Popup blocked');
    }
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function downloadFileApi(id: string, filename: string) {
    const r = await authedFetch(`${getApiBase()}/files/${encodeURIComponent(id)}/download`);
    if (!r.ok) throw new Error('Download failed');
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
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
        const pin = getActiveSecurityPin();
        if (pin) {
            xhr.setRequestHeader('x-security-pin', pin);
        }
        xhr.send(fd);
    });
}
