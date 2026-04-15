import type { ChatMessage } from './types';

/**
 * RFC 4122 v4 UUID for client-side IDs. On plain HTTP + LAN IP, `crypto.randomUUID`
 * is missing (not a secure context); `getRandomValues` still works for a v4 fallback.
 */
export function randomUUID(): string {
    const c = globalThis.crypto;
    if (typeof c?.randomUUID === 'function') return c.randomUUID();
    const bytes = new Uint8Array(16);
    if (c?.getRandomValues) c.getRandomValues(bytes);
    else for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function sortChatMessages(items: ChatMessage[]): ChatMessage[] {
    return [...items].sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        if (a.pinned && b.pinned) {
            const ta = a.pinnedAt ? new Date(a.pinnedAt).getTime() : 0;
            const tb = b.pinnedAt ? new Date(b.pinnedAt).getTime() : 0;
            if (tb !== ta) return tb - ta;
        }
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
}

export function formatTime(iso: string) {
    try {
        return new Date(iso).toLocaleString(undefined, {
            dateStyle: 'short',
            timeStyle: 'short',
        });
    } catch {
        return iso;
    }
}

export function formatSize(s: string) {
    const n = Number(s);
    if (!Number.isFinite(n)) return s;
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatBytes(n: number) {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/** Use the last path segment so pasted paths do not escape the intended name. */
export function safeDisplayFileName(raw: string): string {
    const t = raw.trim();
    if (!t) return '';
    const base = t.split(/[/\\]/).pop() ?? t;
    return base.trim();
}
