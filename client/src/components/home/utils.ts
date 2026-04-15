import type { ChatMessage } from './types';

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
