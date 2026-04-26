import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { DragEvent, FormEvent } from 'react';
import Fuse from 'fuse.js';
import { io, type Socket } from 'socket.io-client';
import { getSocketOrigin } from '@/apiConfig';
import { canPreviewInBrowser } from '@/previewableFile';
import { getActiveSecurityPin } from '@/securityPin';
import {
    bulkDeleteMessagesApi,
    deleteFileApi,
    deleteMessageApi,
    downloadFileApi,
    fetchFiles,
    fetchMessages,
    openFilePreviewApi,
    patchMessageApi,
    uploadFileWithProgress,
} from '@/components/home/api';
import { ChatColumn } from '@/components/home/ChatColumn';
import { DeleteConfirmModal } from '@/components/home/DeleteConfirmModal';
import { FileToast } from '@/components/home/FileToast';
import { FilesColumn } from '@/components/home/FilesColumn';
import { SocketBanner } from '@/components/home/SocketBanner';
import type { ChatMessage, DeleteConfirmState, FileRow, UploadJob } from '@/components/home/types';
import { randomUUID, safeDisplayFileName, sortChatMessages } from '@/components/home/utils';
import { HomePageHeader } from './HomePageHeader';

export default function HomePage() {
    const [files, setFiles] = useState<FileRow[]>([]);
    const [filesErr, setFilesErr] = useState<string | null>(null);
    const [socketStatus, setSocketStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
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
    const [serverUrlRevision, setServerUrlRevision] = useState(0);
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

    const applyServerUrlChange = useCallback(() => {
        setServerUrlRevision((n) => n + 1);
        reloadFiles();
        loadInitialMessages();
    }, [reloadFiles, loadInitialMessages]);

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
            auth: { pin: getActiveSecurityPin() },
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
    }, [reloadFiles, serverUrlRevision]);

    const runUploadQueue = useCallback(
        async (fileList: FileList | File[]) => {
            const files = Array.from(fileList);
            if (files.length === 0) return;

            if (uploadClearTimerRef.current) {
                clearTimeout(uploadClearTimerRef.current);
                uploadClearTimerRef.current = null;
            }

            const jobs: UploadJob[] = files.map((f) => ({
                id: randomUUID(),
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

    const onDrop = (e: DragEvent) => {
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
        void openFilePreviewApi(f.id).catch(() => {
            setFileToast('Preview failed. Please try again.');
        });
    };

    const downloadFile = (f: FileRow) => {
        void downloadFileApi(f.id, f.originalName).catch(() => {
            setFileToast('Download failed. Please try again.');
        });
    };

    const executeDeleteConfirm = async () => {
        if (!deleteConfirm) return;
        const pending = deleteConfirm;
        setDeleteConfirm(null);
        try {
            if (pending.type === 'file') {
                await deleteFileApi(pending.id);
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

    const submitRawFile = (e: FormEvent) => {
        e.preventDefault();
        if (uploadBusy) return;
        const name = safeDisplayFileName(rawFileName);
        if (!name) return;
        const file = new File([rawFileContent], name, { type: 'text/plain;charset=utf-8' });
        void runUploadQueue([file]);
        closeRawFileModal();
    };

    const sendChat = (e: FormEvent) => {
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
        <Fragment>
            <HomePageHeader onServerUrlChanged={applyServerUrlChange} />

            <SocketBanner socketStatus={socketStatus} socketErr={socketErr} />

            <div className="layout">
                <FilesColumn
                    files={files}
                    filesErr={filesErr}
                    uploadBusy={uploadBusy}
                    drag={drag}
                    setDrag={setDrag}
                    fileInputRef={fileInputRef}
                    runUploadQueue={runUploadQueue}
                    onDrop={onDrop}
                    uploadJobs={uploadJobs}
                    rawFileModalOpen={rawFileModalOpen}
                    setRawFileModalOpen={setRawFileModalOpen}
                    rawFileName={rawFileName}
                    rawFileContent={rawFileContent}
                    rawFileNameInputRef={rawFileNameInputRef}
                    closeRawFileModal={closeRawFileModal}
                    submitRawFile={submitRawFile}
                    setRawFileName={setRawFileName}
                    setRawFileContent={setRawFileContent}
                    openFilePreview={openFilePreview}
                    downloadFile={downloadFile}
                    setDeleteConfirm={setDeleteConfirm}
                />

                <ChatColumn
                    hasMore={hasMore}
                    loadingMore={loadingMore}
                    loadMore={loadMore}
                    messages={messages}
                    visibleMessages={visibleMessages}
                    chatSearch={chatSearch}
                    setChatSearch={setChatSearch}
                    selectionMode={selectionMode}
                    selectedIds={selectedIds}
                    visibleIds={visibleIds}
                    allVisibleSelected={allVisibleSelected}
                    someVisibleSelected={someVisibleSelected}
                    setSelectedIds={setSelectedIds}
                    selectAllVisible={selectAllVisible}
                    clearSelection={clearSelection}
                    exitSelectionMode={exitSelectionMode}
                    chatInput={chatInput}
                    setChatInput={setChatInput}
                    sendChat={sendChat}
                    socketConnected={socketConnected}
                    newIds={newIds}
                    editingId={editingId}
                    editDraft={editDraft}
                    setEditDraft={setEditDraft}
                    menuOpenId={menuOpenId}
                    setMenuOpenId={setMenuOpenId}
                    chatMenuPos={chatMenuPos}
                    setChatMenuPos={setChatMenuPos}
                    chatLogRef={chatLogRef}
                    chatBottomSentinelRef={chatBottomSentinelRef}
                    chatMenuPopoverRef={chatMenuPopoverRef}
                    chatMenuBtnRefs={chatMenuBtnRefs}
                    toggleSelected={toggleSelected}
                    startEdit={startEdit}
                    cancelEdit={cancelEdit}
                    saveEdit={saveEdit}
                    copyPlainText={copyPlainText}
                    togglePinMsg={togglePinMsg}
                    enterSelectionForMessage={enterSelectionForMessage}
                    setDeleteConfirm={setDeleteConfirm}
                />
            </div>

            {fileToast && <FileToast message={fileToast} />}

            {deleteConfirm && (
                <DeleteConfirmModal
                    deleteConfirm={deleteConfirm}
                    selectedCount={selectedIds.length}
                    onDismiss={() => setDeleteConfirm(null)}
                    onConfirm={executeDeleteConfirm}
                />
            )}
        </Fragment>
    );
}
