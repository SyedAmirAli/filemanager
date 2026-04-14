import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Fuse from 'fuse.js';
import { Download, Eye, Trash2 } from 'lucide-react';
import { io, type Socket } from 'socket.io-client';
import { API, getSocketOrigin } from './apiConfig';
import { canPreviewInBrowser } from './previewableFile';
import './App.css';

type FileRow = {
    id: string;
    originalName: string;
    mimeType: string;
    size: string;
    createdAt: string;
};

type ChatMessage = {
    id: string;
    body: string;
    createdAt: string;
    editedAt: string | null;
    pinned: boolean;
    pinnedAt: string | null;
};

function sortChatMessages(items: ChatMessage[]): ChatMessage[] {
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

async function patchMessageApi(id: string, patch: { body?: string; pinned?: boolean }) {
    const r = await fetch(`${API}/messages/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
    });
    if (!r.ok) throw new Error('Failed to update message');
    return r.json() as Promise<ChatMessage>;
}

async function deleteMessageApi(id: string) {
    const r = await fetch(`${API}/messages/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!r.ok) throw new Error('Failed to delete message');
}

async function bulkDeleteMessagesApi(ids: string[]) {
    const r = await fetch(`${API}/messages/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
    });
    if (!r.ok) throw new Error('Bulk delete failed');
    return r.json() as Promise<{ ok: boolean; deleted: number }>;
}

async function fetchFiles(): Promise<FileRow[]> {
    const r = await fetch(`${API}/files`);
    if (!r.ok) throw new Error('Failed to load files');
    return r.json();
}

async function fetchMessages(
    limit: number,
    before?: string,
): Promise<{ items: ChatMessage[]; nextCursor: string | null; hasMore: boolean }> {
    const q = new URLSearchParams({ limit: String(limit) });
    if (before) q.set('before', before);
    const r = await fetch(`${API}/messages?${q}`);
    if (!r.ok) throw new Error('Failed to load messages');
    return r.json();
}

function formatTime(iso: string) {
    try {
        return new Date(iso).toLocaleString(undefined, {
            dateStyle: 'short',
            timeStyle: 'short',
        });
    } catch {
        return iso;
    }
}

function formatSize(s: string) {
    const n = Number(s);
    if (!Number.isFinite(n)) return s;
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatBytes(n: number) {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/** Use the last path segment so pasted paths do not escape the intended name. */
function safeDisplayFileName(raw: string): string {
    const t = raw.trim();
    if (!t) return '';
    const base = t.split(/[/\\]/).pop() ?? t;
    return base.trim();
}

function uploadFileWithProgress(file: File, onProgress: (loaded: number, total: number) => void): Promise<void> {
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
        xhr.open('POST', `${API}/files`);
        xhr.send(fd);
    });
}

type UploadJob = {
    id: string;
    name: string;
    size: number;
    status: 'pending' | 'uploading' | 'done' | 'error';
    progress: number;
    error?: string;
};

type SocketStatus = 'connecting' | 'connected' | 'disconnected';

type DeleteConfirmState =
    | null
    | { type: 'file'; id: string; name: string }
    | { type: 'message'; id: string }
    | { type: 'bulk' };

export default function App() {
    const [files, setFiles] = useState<FileRow[]>([]);
    const [filesErr, setFilesErr] = useState<string | null>(null);
    const [socketStatus, setSocketStatus] = useState<SocketStatus>('connecting');
    const [socketErr, setSocketErr] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [chatInput, setChatInput] = useState('');
    const [newIds, setNewIds] = useState<Set<string>>(new Set());
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [selectionMode, setSelectionMode] = useState(false);
    const [chatSearch, setChatSearch] = useState('');
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editDraft, setEditDraft] = useState('');
    const socketRef = useRef<Socket | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [drag, setDrag] = useState(false);
    const [uploadJobs, setUploadJobs] = useState<UploadJob[]>([]);
    const uploadClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const uploadBusy = uploadJobs.some((j) => j.status === 'pending' || j.status === 'uploading');
    const [rawFileModalOpen, setRawFileModalOpen] = useState(false);
    const [rawFileName, setRawFileName] = useState('');
    const [rawFileContent, setRawFileContent] = useState('');
    const rawFileNameInputRef = useRef<HTMLInputElement>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>(null);
    const [fileToast, setFileToast] = useState<string | null>(null);
    const [chatMenuPos, setChatMenuPos] = useState<{ top: number; right: number } | null>(null);
    const chatMenuPopoverRef = useRef<HTMLUListElement | null>(null);
    const chatMenuBtnRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
    const chatLogRef = useRef<HTMLDivElement | null>(null);
    const chatBottomSentinelRef = useRef<HTMLDivElement | null>(null);
    const prevMessageCountRef = useRef(0);
    const pendingLoadMoreScrollRef = useRef(false);
    const loadMoreScrollSnapshotRef = useRef<{ height: number; top: number } | null>(null);

    const updateFloatingChatMenuPosition = useCallback(() => {
        const id = menuOpenId;
        if (!id) return;
        const btn = chatMenuBtnRefs.current.get(id);
        if (!btn) return;
        const r = btn.getBoundingClientRect();
        const gap = 4;
        const menu = chatMenuPopoverRef.current;
        const mh = menu?.offsetHeight ?? 0;
        let top = r.bottom + gap;
        if (mh > 0 && top + mh > window.innerHeight - 8) {
            top = Math.max(8, r.top - mh - gap);
        }
        setChatMenuPos({ top, right: window.innerWidth - r.right });
    }, [menuOpenId]);

    useLayoutEffect(() => {
        if (!menuOpenId) {
            setChatMenuPos(null);
            return;
        }
        updateFloatingChatMenuPosition();
        const raf = requestAnimationFrame(() => updateFloatingChatMenuPosition());
        return () => cancelAnimationFrame(raf);
    }, [menuOpenId, updateFloatingChatMenuPosition]);

    useEffect(() => {
        if (!menuOpenId) return;
        const fn = () => updateFloatingChatMenuPosition();
        window.addEventListener('scroll', fn, true);
        window.addEventListener('resize', fn);
        return () => {
            window.removeEventListener('scroll', fn, true);
            window.removeEventListener('resize', fn);
        };
    }, [menuOpenId, updateFloatingChatMenuPosition]);

    const reloadFiles = useCallback(() => {
        fetchFiles()
            .then(setFiles)
            .catch((e: Error) => setFilesErr(e.message));
    }, []);

    const loadInitialMessages = useCallback(() => {
        fetchMessages(200)
            .then((res) => {
                const chronological = sortChatMessages([...res.items].reverse());
                setMessages(chronological);
                setNextCursor(res.nextCursor);
                setHasMore(res.hasMore);
            })
            .catch(() => {
                /* ignore */
            });
    }, []);

    useEffect(() => {
        reloadFiles();
        loadInitialMessages();
    }, [reloadFiles, loadInitialMessages]);

    useEffect(() => {
        return () => {
            if (uploadClearTimerRef.current) {
                clearTimeout(uploadClearTimerRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (!rawFileModalOpen) return;
        const t = window.setTimeout(() => rawFileNameInputRef.current?.focus(), 0);
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setRawFileModalOpen(false);
                setRawFileName('');
                setRawFileContent('');
            }
        };
        document.addEventListener('keydown', onKey);
        return () => {
            clearTimeout(t);
            document.removeEventListener('keydown', onKey);
        };
    }, [rawFileModalOpen]);

    useEffect(() => {
        if (!deleteConfirm) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setDeleteConfirm(null);
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [deleteConfirm]);

    useEffect(() => {
        if (!fileToast) return;
        const t = window.setTimeout(() => setFileToast(null), 4200);
        return () => clearTimeout(t);
    }, [fileToast]);

    useEffect(() => {
        const onDoc = (e: MouseEvent) => {
            if (menuOpenId === null) return;
            const el = e.target as HTMLElement;
            if (el.closest('[data-chat-menu-root]')) return;
            setMenuOpenId(null);
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, [menuOpenId]);

    useEffect(() => {
        const socket = io(getSocketOrigin(), {
            path: '/socket.io',
            transports: ['websocket', 'polling'],
        });
        socketRef.current = socket;

        const setConnected = () => {
            setSocketStatus('connected');
            setSocketErr(null);
        };
        const setDisconnected = () => {
            setSocketStatus('disconnected');
        };

        if (socket.connected) {
            setConnected();
        }

        socket.on('connect', () => {
            setConnected();
        });

        socket.on('disconnect', () => {
            setDisconnected();
        });

        socket.on('connect_error', (err: Error) => {
            setSocketStatus('disconnected');
            setSocketErr(err.message || 'Connection failed');
        });

        socket.on('newMessage', (msg: ChatMessage) => {
            setMessages((prev) => {
                if (prev.some((m) => m.id === msg.id)) return prev;
                return sortChatMessages([...prev, msg]);
            });
            setNewIds((prev) => new Set(prev).add(msg.id));
            setTimeout(() => {
                setNewIds((prev) => {
                    const next = new Set(prev);
                    next.delete(msg.id);
                    return next;
                });
            }, 400);
        });

        socket.on('messageUpdated', (msg: ChatMessage) => {
            setMessages((prev) => sortChatMessages(prev.map((x) => (x.id === msg.id ? msg : x))));
        });

        socket.on('messageDeleted', ({ id }: { id: string }) => {
            setMessages((prev) => prev.filter((x) => x.id !== id));
            setSelectedIds((s) => s.filter((x) => x !== id));
        });

        socket.on('messagesBulkDeleted', ({ ids }: { ids: string[] }) => {
            const gone = new Set(ids);
            setMessages((prev) => prev.filter((x) => !gone.has(x.id)));
            setSelectedIds((s) => s.filter((x) => !gone.has(x)));
        });

        socket.on('filesChanged', () => {
            reloadFiles();
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [reloadFiles]);

    const runUploadQueue = useCallback(
        async (fileList: FileList | File[]) => {
            const files = Array.from(fileList);
            if (files.length === 0) return;

            if (uploadClearTimerRef.current) {
                clearTimeout(uploadClearTimerRef.current);
                uploadClearTimerRef.current = null;
            }

            const jobs: UploadJob[] = files.map((f) => ({
                id: crypto.randomUUID(),
                name: f.name,
                size: f.size,
                status: 'pending',
                progress: 0,
            }));
            setUploadJobs(jobs);

            for (let i = 0; i < files.length; i++) {
                const jobId = jobs[i].id;
                const file = files[i];

                setUploadJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, status: 'uploading' as const } : j)));

                try {
                    await uploadFileWithProgress(file, (loaded, total) => {
                        const pct = total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0;
                        setUploadJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, progress: pct } : j)));
                    });
                    setUploadJobs((prev) =>
                        prev.map((j) => (j.id === jobId ? { ...j, status: 'done' as const, progress: 100 } : j)),
                    );
                } catch (e) {
                    const msg = e instanceof Error ? e.message : 'Upload failed';
                    setUploadJobs((prev) =>
                        prev.map((j) => (j.id === jobId ? { ...j, status: 'error' as const, error: msg } : j)),
                    );
                }
            }

            reloadFiles();
            uploadClearTimerRef.current = setTimeout(() => {
                setUploadJobs([]);
                uploadClearTimerRef.current = null;
            }, 2000);
        },
        [reloadFiles],
    );

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDrag(false);
        if (uploadBusy) return;
        if (e.dataTransfer.files?.length) {
            void runUploadQueue(e.dataTransfer.files);
        }
    };

    const openFilePreview = (f: FileRow) => {
        if (!canPreviewInBrowser(f.mimeType, f.originalName)) {
            setFileToast('This file type cannot be previewed in the browser.');
            return;
        }
        window.open(`${API}/files/${encodeURIComponent(f.id)}/preview`, '_blank', 'noopener,noreferrer');
    };

    const executeDeleteConfirm = async () => {
        if (!deleteConfirm) return;
        const pending = deleteConfirm;
        setDeleteConfirm(null);
        try {
            if (pending.type === 'file') {
                await fetch(`${API}/files/${pending.id}`, { method: 'DELETE' });
                reloadFiles();
            } else if (pending.type === 'message') {
                await deleteMessageApi(pending.id);
            } else {
                if (selectedIds.length === 0) return;
                await bulkDeleteMessagesApi(selectedIds);
                setSelectedIds([]);
                setSelectionMode(false);
            }
        } catch {
            /* ignore */
        }
    };

    const closeRawFileModal = () => {
        setRawFileModalOpen(false);
        setRawFileName('');
        setRawFileContent('');
    };

    const submitRawFile = (e: React.FormEvent) => {
        e.preventDefault();
        if (uploadBusy) return;
        const name = safeDisplayFileName(rawFileName);
        if (!name) return;
        const file = new File([rawFileContent], name, { type: 'text/plain;charset=utf-8' });
        void runUploadQueue([file]);
        closeRawFileModal();
    };

    const sendChat = (e: React.FormEvent) => {
        e.preventDefault();
        const text = chatInput.trim();
        if (!text || !socketRef.current?.connected) return;
        socketRef.current.emit('sendMessage', { text });
        setChatInput('');
    };

    const socketConnected = socketStatus === 'connected';

    const visibleMessages = useMemo(() => {
        const q = chatSearch.trim();
        if (!q) return messages;
        const fuse = new Fuse(messages, {
            keys: ['body'],
            threshold: 0.38,
            ignoreLocation: true,
        });
        return sortChatMessages(fuse.search(q).map((r) => r.item));
    }, [messages, chatSearch]);

    const visibleIds = useMemo(() => visibleMessages.map((m) => m.id), [visibleMessages]);

    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
    const someVisibleSelected = visibleIds.some((id) => selectedIds.includes(id)) && !allVisibleSelected;

    const loadMore = async () => {
        if (!nextCursor || loadingMore) return;
        const log = chatLogRef.current;
        if (log) {
            loadMoreScrollSnapshotRef.current = { height: log.scrollHeight, top: log.scrollTop };
            pendingLoadMoreScrollRef.current = true;
        }
        setLoadingMore(true);
        try {
            const res = await fetchMessages(200, nextCursor);
            const olderChronological = sortChatMessages([...res.items].reverse());
            setMessages((prev) => sortChatMessages([...olderChronological, ...prev]));
            setNextCursor(res.nextCursor);
            setHasMore(res.hasMore);
        } catch {
            pendingLoadMoreScrollRef.current = false;
            loadMoreScrollSnapshotRef.current = null;
        } finally {
            setLoadingMore(false);
        }
    };

    useLayoutEffect(() => {
        const log = chatLogRef.current;
        if (pendingLoadMoreScrollRef.current && loadMoreScrollSnapshotRef.current && log) {
            const s = loadMoreScrollSnapshotRef.current;
            log.scrollTop = s.top + (log.scrollHeight - s.height);
            pendingLoadMoreScrollRef.current = false;
            loadMoreScrollSnapshotRef.current = null;
            prevMessageCountRef.current = messages.length;
            return;
        }

        const count = messages.length;
        if (count === 0) {
            prevMessageCountRef.current = 0;
            return;
        }

        const grew = count > prevMessageCountRef.current;
        prevMessageCountRef.current = count;

        if (!grew) {
            return;
        }

        chatBottomSentinelRef.current?.scrollIntoView({ block: 'end' });
    }, [messages]);

    const toggleSelected = (id: string) => {
        setSelectedIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
    };

    const selectAllVisible = () => {
        setSelectedIds((s) => {
            const set = new Set(s);
            visibleIds.forEach((id) => set.add(id));
            return [...set];
        });
    };

    const clearSelection = () => setSelectedIds([]);

    const exitSelectionMode = () => {
        setSelectionMode(false);
        setSelectedIds([]);
    };

    const enterSelectionForMessage = (m: ChatMessage) => {
        setSelectionMode(true);
        setSelectedIds((s) => (s.includes(m.id) ? s : [...s, m.id]));
        setMenuOpenId(null);
    };

    const startEdit = (m: ChatMessage) => {
        setEditingId(m.id);
        setEditDraft(m.body);
        setMenuOpenId(null);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditDraft('');
    };

    const saveEdit = async () => {
        if (!editingId) return;
        const text = editDraft.trim();
        if (!text) return;
        try {
            await patchMessageApi(editingId, { body: text });
            cancelEdit();
        } catch {
            /* ignore */
        }
    };

    const copyPlainText = async (m: ChatMessage) => {
        try {
            await navigator.clipboard.writeText(m.body);
        } catch {
            /* ignore */
        }
        setMenuOpenId(null);
    };

    const togglePinMsg = async (m: ChatMessage) => {
        try {
            await patchMessageApi(m.id, { pinned: !m.pinned });
        } catch {
            /* ignore */
        }
        setMenuOpenId(null);
    };

    return (
        <>
            <h1>Shared files & chat</h1>

            {socketStatus !== 'connected' && (
                <div
                    className={`socket-banner${socketStatus === 'connecting' ? ' socket-banner--pending' : ''}`}
                    role="alert"
                >
                    {socketStatus === 'connecting' ? (
                        <p>Connecting to the server…</p>
                    ) : (
                        <>
                            <p>
                                <strong>Not connected.</strong> Chat and live file updates will not work until the
                                connection is restored. Make sure the API is running (e.g. port 5180) and reload if
                                needed.
                            </p>
                            {socketErr && <p className="socket-banner-detail">{socketErr}</p>}
                        </>
                    )}
                </div>
            )}

            <div className="layout">
                <section className="layout-section layout-section--files">
                    <h2>Files</h2>
                    <div className="panel">
                        <div className="files-upload-head">
                            <button type="button" disabled={uploadBusy} onClick={() => setRawFileModalOpen(true)}>
                                Create raw file
                            </button>
                        </div>
                        <div
                            className={`dropzone${drag ? ' drag' : ''}${uploadBusy ? ' dropzone--busy' : ''}`}
                            role="button"
                            tabIndex={uploadBusy ? -1 : 0}
                            aria-busy={uploadBusy}
                            onKeyDown={(e) => {
                                if (uploadBusy) return;
                                if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
                            }}
                            onClick={() => {
                                if (!uploadBusy) fileInputRef.current?.click();
                            }}
                            onDragEnter={(e) => {
                                e.preventDefault();
                                if (!uploadBusy) setDrag(true);
                            }}
                            onDragLeave={() => setDrag(false)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={onDrop}
                        >
                            <p>{uploadBusy ? 'Uploading…' : 'Drop files here or click to upload'}</p>
                            <p className="hint">
                                {uploadBusy
                                    ? 'Please wait — files upload one at a time.'
                                    : 'Select multiple files — they upload one after another with progress.'}
                            </p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                hidden
                                disabled={uploadBusy}
                                onChange={(e) => {
                                    if (uploadBusy) return;
                                    if (e.target.files?.length) void runUploadQueue(e.target.files);
                                    e.target.value = '';
                                }}
                            />
                        </div>
                        {uploadJobs.length > 0 && (
                            <ul className="upload-queue" aria-label="Upload progress">
                                {uploadJobs.map((job) => (
                                    <li key={job.id} className={`upload-job upload-job--${job.status}`}>
                                        <div className="upload-job-head">
                                            <span className="upload-job-name" title={job.name}>
                                                {job.name}
                                            </span>
                                            <span className="upload-job-meta">
                                                {formatBytes(job.size)}
                                                {job.status === 'pending' && ' · Waiting'}
                                                {job.status === 'uploading' && ` · ${job.progress}%`}
                                                {job.status === 'done' && ' · Done'}
                                                {job.status === 'error' && ` · ${job.error ?? 'Failed'}`}
                                            </span>
                                        </div>
                                        <div
                                            className="progress-track"
                                            role="progressbar"
                                            aria-valuemin={0}
                                            aria-valuemax={100}
                                            aria-valuenow={
                                                job.status === 'error' ? 0 : job.status === 'done' ? 100 : job.progress
                                            }
                                        >
                                            <div
                                                className="progress-fill"
                                                style={{
                                                    width:
                                                        job.status === 'error'
                                                            ? '0%'
                                                            : job.status === 'done'
                                                              ? '100%'
                                                              : `${job.progress}%`,
                                                }}
                                            />
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                        {rawFileModalOpen && (
                            <div
                                className="modal-backdrop"
                                role="presentation"
                                onMouseDown={(e) => {
                                    if (e.target === e.currentTarget) closeRawFileModal();
                                }}
                            >
                                <div
                                    className="modal-dialog"
                                    role="dialog"
                                    aria-modal="true"
                                    aria-labelledby="raw-file-modal-title"
                                    onMouseDown={(e) => e.stopPropagation()}
                                >
                                    <h3 id="raw-file-modal-title" className="modal-dialog-title">
                                        Create raw file
                                    </h3>
                                    <form className="modal-dialog-form" onSubmit={submitRawFile}>
                                        <label className="modal-field">
                                            <span>File name</span>
                                            <input
                                                ref={rawFileNameInputRef}
                                                type="text"
                                                value={rawFileName}
                                                onChange={(e) => setRawFileName(e.target.value)}
                                                placeholder="notes.txt"
                                                autoComplete="off"
                                                required
                                            />
                                        </label>
                                        <label className="modal-field">
                                            <span>Content</span>
                                            <textarea
                                                value={rawFileContent}
                                                onChange={(e) => setRawFileContent(e.target.value)}
                                                rows={14}
                                                placeholder="Paste or type file contents…"
                                                spellCheck={false}
                                            />
                                        </label>
                                        <div className="modal-dialog-actions">
                                            <button type="button" onClick={closeRawFileModal}>
                                                Cancel
                                            </button>
                                            <button type="submit" className="primary" disabled={uploadBusy}>
                                                Create & upload
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}
                        {filesErr && <p className="empty">{filesErr}</p>}
                        {!files.length && !filesErr ? (
                            <p className="empty">No files yet.</p>
                        ) : (
                            <ul className="file-list" style={{ marginTop: '1rem' }}>
                                {files.map((f) => (
                                    <li key={f.id}>
                                        <div className="file-meta">
                                            <strong title={f.originalName}>{f.originalName}</strong>
                                            <span>
                                                {formatSize(f.size)} · {formatTime(f.createdAt)}
                                            </span>
                                        </div>
                                        <div className="actions">
                                            <button
                                                type="button"
                                                className="icon-btn"
                                                aria-label="Preview in new tab"
                                                title="Preview"
                                                onClick={() => openFilePreview(f)}
                                            >
                                                <Eye size={18} strokeWidth={2} aria-hidden />
                                            </button>
                                            <a
                                                className="icon-btn"
                                                href={`${API}/files/${f.id}/download`}
                                                download
                                                aria-label="Download"
                                                title="Download"
                                            >
                                                <Download size={18} strokeWidth={2} aria-hidden />
                                            </a>
                                            <button
                                                type="button"
                                                className="icon-btn danger delete"
                                                aria-label="Delete file"
                                                title="Delete"
                                                onClick={() =>
                                                    setDeleteConfirm({ type: 'file', id: f.id, name: f.originalName })
                                                }
                                            >
                                                <Trash2 size={18} strokeWidth={2} aria-hidden className="text-danger" />
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </section>

                <section className="layout-section layout-section--chat">
                    <h2>Chat</h2>
                    <div className="panel panel-chat">
                        {hasMore && (
                            <button
                                type="button"
                                className="load-more"
                                disabled={loadingMore}
                                onClick={() => void loadMore()}
                            >
                                {loadingMore ? 'Loading…' : 'Load older messages'}
                            </button>
                        )}
                        {messages.length > 0 && (
                            <div className="chat-search-row">
                                <input
                                    type="search"
                                    value={chatSearch}
                                    onChange={(e) => setChatSearch(e.target.value)}
                                    placeholder="Search messages…"
                                    aria-label="Search messages"
                                    autoComplete="off"
                                />
                            </div>
                        )}
                        {selectionMode && messages.length > 0 && (
                            <div className="chat-toolbar">
                                <label className="chat-toolbar-label">
                                    <input
                                        type="checkbox"
                                        disabled={visibleIds.length === 0}
                                        checked={allVisibleSelected}
                                        ref={(el) => {
                                            if (el) el.indeterminate = someVisibleSelected;
                                        }}
                                        onChange={() => {
                                            if (allVisibleSelected) {
                                                setSelectedIds((s) => s.filter((id) => !visibleIds.includes(id)));
                                            } else {
                                                selectAllVisible();
                                            }
                                        }}
                                    />
                                    <span>Select all</span>
                                </label>
                                {selectedIds.length > 0 && (
                                    <div className="chat-bulk-actions">
                                        <span className="chat-bulk-count">{selectedIds.length} selected</span>
                                        <button
                                            type="button"
                                            className="danger"
                                            onClick={() => setDeleteConfirm({ type: 'bulk' })}
                                        >
                                            Delete
                                        </button>
                                        <button type="button" className="ghost" onClick={clearSelection}>
                                            Clear
                                        </button>
                                        <button type="button" className="ghost" onClick={exitSelectionMode}>
                                            Done
                                        </button>
                                    </div>
                                )}
                                {selectedIds.length === 0 && (
                                    <button type="button" className="ghost" onClick={exitSelectionMode}>
                                        Done
                                    </button>
                                )}
                            </div>
                        )}
                        <div ref={chatLogRef} className="chat-log scrollbar-thin">
                            {messages.length === 0 ? (
                                <p className="empty">No messages yet.</p>
                            ) : visibleMessages.length === 0 ? (
                                <p className="empty">No messages match your search.</p>
                            ) : (
                                <>
                                    {visibleMessages.map((m) => (
                                    <article
                                        key={m.id}
                                        className={`chat-msg${selectionMode ? ' chat-msg--select-mode' : ''}${newIds.has(m.id) ? ' chat-msg--new' : ''}${m.pinned ? ' chat-msg--pinned' : ''}`}
                                    >
                                        {selectionMode && (
                                            <label className="chat-msg-select">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.includes(m.id)}
                                                    onChange={() => toggleSelected(m.id)}
                                                    aria-label={`Select message ${m.id.slice(0, 8)}`}
                                                />
                                            </label>
                                        )}
                                        <div className="chat-msg-main">
                                            <div className="chat-msg-head">
                                                <time>{formatTime(m.createdAt)}</time>
                                                {m.editedAt && <span className="msg-tag msg-tag--edited">edited</span>}
                                                {m.pinned && <span className="msg-tag msg-tag--pinned">pinned</span>}
                                            </div>
                                            {editingId === m.id ? (
                                                <div className="chat-msg-edit">
                                                    <textarea
                                                        value={editDraft}
                                                        onChange={(e) => setEditDraft(e.target.value)}
                                                        rows={3}
                                                        className="chat-msg-textarea"
                                                    />
                                                    <div className="chat-msg-edit-actions">
                                                        <button
                                                            type="button"
                                                            className="primary"
                                                            onClick={() => void saveEdit()}
                                                        >
                                                            Save
                                                        </button>
                                                        <button type="button" onClick={cancelEdit}>
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="chat-msg-text">{m.body}</p>
                                            )}
                                        </div>
                                        <div className="chat-msg-menu-wrap" data-chat-menu-root>
                                            <button
                                                type="button"
                                                className="chat-msg-menu-btn"
                                                aria-expanded={menuOpenId === m.id}
                                                aria-haspopup="menu"
                                                aria-label="Message actions"
                                                ref={(el) => {
                                                    if (el) chatMenuBtnRefs.current.set(m.id, el);
                                                    else chatMenuBtnRefs.current.delete(m.id);
                                                }}
                                                onClick={(e) => {
                                                    if (menuOpenId === m.id) {
                                                        setMenuOpenId(null);
                                                        setChatMenuPos(null);
                                                    } else {
                                                        const r = e.currentTarget.getBoundingClientRect();
                                                        const gap = 4;
                                                        setMenuOpenId(m.id);
                                                        setChatMenuPos({
                                                            top: r.bottom + gap,
                                                            right: window.innerWidth - r.right,
                                                        });
                                                    }
                                                }}
                                            >
                                                <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
                                                    <circle cx="12" cy="5" r="2" fill="currentColor" />
                                                    <circle cx="12" cy="12" r="2" fill="currentColor" />
                                                    <circle cx="12" cy="19" r="2" fill="currentColor" />
                                                </svg>
                                            </button>
                                            {menuOpenId === m.id && chatMenuPos && (
                                                <ul
                                                    ref={chatMenuPopoverRef}
                                                    className="chat-msg-menu chat-msg-menu--floating"
                                                    role="menu"
                                                    style={{
                                                        top: chatMenuPos.top,
                                                        right: chatMenuPos.right,
                                                    }}
                                                >
                                                    <li role="none">
                                                        <button
                                                            type="button"
                                                            role="menuitem"
                                                            onClick={() => startEdit(m)}
                                                        >
                                                            Edit
                                                        </button>
                                                    </li>
                                                    <li role="none">
                                                        <button
                                                            type="button"
                                                            role="menuitem"
                                                            onClick={() => void togglePinMsg(m)}
                                                        >
                                                            {m.pinned ? 'Unpin' : 'Pin'}
                                                        </button>
                                                    </li>
                                                    <li role="none">
                                                        <button
                                                            type="button"
                                                            role="menuitem"
                                                            onClick={() => enterSelectionForMessage(m)}
                                                        >
                                                            Select message
                                                        </button>
                                                    </li>
                                                    <li role="none">
                                                        <button
                                                            type="button"
                                                            role="menuitem"
                                                            onClick={() => void copyPlainText(m)}
                                                        >
                                                            Copy plain text
                                                        </button>
                                                    </li>
                                                    <li role="none">
                                                        <button
                                                            type="button"
                                                            role="menuitem"
                                                            className="menu-danger"
                                                            onClick={() => {
                                                                setMenuOpenId(null);
                                                                setDeleteConfirm({ type: 'message', id: m.id });
                                                            }}
                                                        >
                                                            Delete
                                                        </button>
                                                    </li>
                                                </ul>
                                            )}
                                        </div>
                                    </article>
                                ))}
                                    <div
                                        ref={chatBottomSentinelRef}
                                        className="chat-log-anchor"
                                        aria-hidden
                                    />
                                </>
                            )}
                        </div>
                        <form className="chat-form" onSubmit={sendChat}>
                            <input
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                placeholder="Write a message…"
                                autoComplete="off"
                            />
                            <button type="submit" className="primary" disabled={!chatInput.trim() || !socketConnected}>
                                Send
                            </button>
                        </form>
                    </div>
                </section>
            </div>

            {fileToast && (
                <div className="app-toast" role="status">
                    {fileToast}
                </div>
            )}

            {deleteConfirm && (
                <div
                    className="modal-backdrop"
                    role="presentation"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) setDeleteConfirm(null);
                    }}
                >
                    <div
                        className="modal-dialog modal-dialog--confirm"
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="delete-confirm-title"
                        aria-describedby="delete-confirm-desc"
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <h3 id="delete-confirm-title" className="modal-dialog-title">
                            {deleteConfirm.type === 'file' && 'Delete file?'}
                            {deleteConfirm.type === 'message' && 'Delete message?'}
                            {deleteConfirm.type === 'bulk' && 'Delete messages?'}
                        </h3>
                        <p id="delete-confirm-desc" className="modal-dialog-body">
                            {deleteConfirm.type === 'file' && (
                                <>
                                    Delete <strong>{deleteConfirm.name}</strong>? This cannot be undone.
                                </>
                            )}
                            {deleteConfirm.type === 'message' && (
                                <>This message will be removed for everyone. This cannot be undone.</>
                            )}
                            {deleteConfirm.type === 'bulk' && (
                                <>
                                    Delete <strong>{selectedIds.length}</strong> selected message
                                    {selectedIds.length === 1 ? '' : 's'}? This cannot be undone.
                                </>
                            )}
                        </p>
                        <div className="modal-dialog-actions">
                            <button type="button" onClick={() => setDeleteConfirm(null)}>
                                Cancel
                            </button>
                            <button type="button" className="danger" onClick={() => void executeDeleteConfirm()}>
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
