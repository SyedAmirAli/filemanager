/** Built-in default from index.html (`window.SERVER_URL`). Override via localStorage from settings UI. */
declare global {
    interface Window {
        SERVER_URL?: string;
    }
}

export const SERVER_URL_STORAGE_KEY = 'filemanager.serverUrl';

/** `null` = no override (use `window.SERVER_URL`). Otherwise the stored string (may be empty). */
export function readServerUrlOverride(): string | null {
    if (typeof window === 'undefined') return null;
    try {
        const v = localStorage.getItem(SERVER_URL_STORAGE_KEY);
        return v;
    } catch {
        return null;
    }
}

export function setServerUrlOverride(url: string): void {
    try {
        localStorage.setItem(SERVER_URL_STORAGE_KEY, url);
    } catch {
        /* ignore */
    }
}

export function clearServerUrlOverride(): void {
    try {
        localStorage.removeItem(SERVER_URL_STORAGE_KEY);
    } catch {
        /* ignore */
    }
}

/** Origin/base URL without `/api` — from localStorage override, else `window.SERVER_URL`, else `""` (same origin). */
export function getEffectiveServerUrl(): string {
    const override = readServerUrlOverride();
    if (override !== null) {
        return override.trim();
    }
    if (typeof window === 'undefined') return '';
    return (window.SERVER_URL ?? '').trim();
}

export function getApiBase(): string {
    const effective = getEffectiveServerUrl();
    if (effective) return `${effective.replace(/\/$/, '')}/api`;
    return '/api';
}

/** `undefined` = Socket.IO uses the current page origin (and `/socket.io` path). */
export function getSocketOrigin(): string | undefined {
    const effective = getEffectiveServerUrl();
    return effective ? effective.replace(/\/$/, '') : undefined;
}
