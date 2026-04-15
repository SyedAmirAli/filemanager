import { type FormEvent, useEffect, useState } from 'react';
import {
    clearServerUrlOverride,
    getEffectiveServerUrl,
    readServerUrlOverride,
    setServerUrlOverride,
} from '@/apiConfig';

function getInitialDraft(): string {
    if (typeof window === 'undefined') return '';
    const stored = readServerUrlOverride();
    return stored !== null ? stored : (window.SERVER_URL ?? '');
}

function normalizeServerBase(input: string): string {
    const t = input.trim();
    if (!t) return '';
    const candidate = t.includes('://') ? t : `https://${t}`;
    const u = new URL(candidate);
    return u.origin;
}

type Props = {
    open: boolean;
    onClose: () => void;
    /** Called after save or clear so the app can reconnect sockets and refetch. */
    onApplied: () => void;
};

export function ServerUrlSettingsModal({ open, onClose, onApplied }: Props) {
    const [draft, setDraft] = useState(getInitialDraft);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open) return null;

    const handleSave = (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        try {
            const normalized = normalizeServerBase(draft);
            if (normalized) {
                setServerUrlOverride(normalized);
            } else {
                clearServerUrlOverride();
            }
            onApplied();
            onClose();
        } catch {
            setError('Enter a valid URL (e.g. https://api.example.com or http://127.0.0.1:5180).');
        }
    };

    const handleClear = () => {
        setError(null);
        clearServerUrlOverride();
        setDraft(typeof window !== 'undefined' ? (window.SERVER_URL ?? '') : '');
        onApplied();
        onClose();
    };

    const effective = typeof window !== 'undefined' ? getEffectiveServerUrl() : '';

    return (
        <div
            className="modal-backdrop"
            role="presentation"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                className="modal-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="server-url-modal-title"
                onMouseDown={(e) => e.stopPropagation()}
            >
                <h3 id="server-url-modal-title" className="modal-dialog-title">
                    Server URL
                </h3>
                <p className="modal-dialog-body" style={{ marginTop: 0 }}>
                    API and chat use this origin (paths{' '}
                    <span style={{ fontFamily: 'monospace', fontSize: '0.85em' }}>/api</span> and{' '}
                    <span style={{ fontFamily: 'monospace', fontSize: '0.85em' }}>/socket.io</span>). Leave empty and
                    save to drop the saved override and use{' '}
                    <span style={{ fontFamily: 'monospace', fontSize: '0.85em' }}>index.html</span> (same origin when
                    empty). Stored in this browser only.
                </p>
                <form className="modal-dialog-form" onSubmit={handleSave}>
                    <label className="modal-field">
                        <span>Base URL</span>
                        <input
                            type="text"
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            placeholder="https://your-server.com"
                            autoComplete="off"
                            aria-invalid={!!error}
                            aria-describedby={error ? 'server-url-error' : undefined}
                        />
                    </label>
                    {error && (
                        <p
                            id="server-url-error"
                            className="modal-dialog-body"
                            style={{ color: 'var(--danger)', marginTop: 0 }}
                            role="alert"
                        >
                            {error}
                        </p>
                    )}
                    <p className="modal-dialog-body" style={{ fontSize: '0.8rem', margin: 0 }}>
                        Active origin: <strong>{effective ? effective : '(same as this page)'}</strong>
                    </p>
                    <div className="modal-dialog-actions">
                        <button type="button" onClick={onClose} className="btn ghost">
                            Cancel
                        </button>
                        <button type="button" className="btn ghost" onClick={handleClear}>
                            Use default
                        </button>
                        <button type="submit" className="btn primary">
                            Save
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
