/** Set in index.html (injected at build). Production: full origin; dev: "". */
declare global {
    interface Window {
        SERVER_URL?: string;
    }
}

/** API base: dev uses same-origin `/api` (Vite proxy). Prod uses `window.SERVER_URL` when set. */
export function getApiBase(): string {
    if (import.meta.env.DEV) return '/api';
    if (typeof window === 'undefined') return '/api';
    const base = window.SERVER_URL?.trim();
    return base ? `${base.replace(/\/$/, '')}/api` : '/api';
}

/** Socket.IO origin: undefined = current page origin (dev proxy or same-host prod). */
export function getSocketOrigin(): string | undefined {
    if (import.meta.env.DEV) return undefined;
    if (typeof window === 'undefined') return undefined;
    const base = window.SERVER_URL?.trim();
    return base ? base.replace(/\/$/, '') : undefined;
}

export const API = getApiBase();
