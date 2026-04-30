import {
    useLayoutEffect,
    useRef,
    type Dispatch,
    type FormEvent,
    type MutableRefObject,
    type RefObject,
    type SetStateAction,
} from 'react';
import type { ChatMessage, DeleteConfirmState } from './types';
import { ChatMessageItem } from './ChatMessageItem';
import { SendIcon } from 'lucide-react';

type Props = {
    hasMore: boolean;
    loadingMore: boolean;
    loadMore: () => void;
    messages: ChatMessage[];
    visibleMessages: ChatMessage[];
    chatSearch: string;
    setChatSearch: (v: string) => void;
    selectionMode: boolean;
    selectedIds: string[];
    visibleIds: string[];
    allVisibleSelected: boolean;
    someVisibleSelected: boolean;
    setSelectedIds: Dispatch<SetStateAction<string[]>>;
    selectAllVisible: () => void;
    clearSelection: () => void;
    exitSelectionMode: () => void;
    chatInput: string;
    setChatInput: (v: string) => void;
    sendChat: (e: FormEvent) => void;
    socketConnected: boolean;
    newIds: Set<string>;
    editingId: string | null;
    editDraft: string;
    setEditDraft: (v: string) => void;
    menuOpenId: string | null;
    setMenuOpenId: (v: string | null) => void;
    chatMenuPos: { top: number; right: number } | null;
    setChatMenuPos: (v: { top: number; right: number } | null) => void;
    chatLogRef: RefObject<HTMLDivElement | null>;
    chatBottomSentinelRef: RefObject<HTMLDivElement | null>;
    chatMenuPopoverRef: RefObject<HTMLUListElement | null>;
    chatMenuBtnRefs: MutableRefObject<Map<string, HTMLButtonElement>>;
    toggleSelected: (id: string) => void;
    startEdit: (m: ChatMessage) => void;
    cancelEdit: () => void;
    saveEdit: () => void;
    copyPlainText: (m: ChatMessage) => void;
    togglePinMsg: (m: ChatMessage) => void;
    enterSelectionForMessage: (m: ChatMessage) => void;
    setDeleteConfirm: (v: DeleteConfirmState) => void;
};

export function ChatColumn({
    hasMore,
    loadingMore,
    loadMore,
    messages,
    visibleMessages,
    chatSearch,
    setChatSearch,
    selectionMode,
    selectedIds,
    visibleIds,
    allVisibleSelected,
    someVisibleSelected,
    setSelectedIds,
    selectAllVisible,
    clearSelection,
    exitSelectionMode,
    chatInput,
    setChatInput,
    sendChat,
    socketConnected,
    newIds,
    editingId,
    editDraft,
    setEditDraft,
    menuOpenId,
    setMenuOpenId,
    setChatMenuPos,
    chatLogRef,
    chatBottomSentinelRef,
    chatMenuPopoverRef,
    chatMenuBtnRefs,
    toggleSelected,
    startEdit,
    cancelEdit,
    saveEdit,
    copyPlainText,
    togglePinMsg,
    enterSelectionForMessage,
    chatMenuPos,
    setDeleteConfirm,
}: Props) {
    const chatInputRef = useRef<HTMLTextAreaElement | null>(null);

    useLayoutEffect(() => {
        const textarea = chatInputRef.current;

        if (!textarea) {
            return;
        }

        textarea.style.height = '40px';
        textarea.style.height = `${Math.min(textarea.scrollHeight, 280)}px`;
        textarea.style.overflowY = textarea.scrollHeight > 280 ? 'auto' : 'hidden';
    }, [chatInput]);

    return (
        <section className="layout-section layout-section--chat">
            <h2>Chat</h2>
            <div className="panel panel-chat">
                {hasMore && (
                    <button type="button" className="load-more" disabled={loadingMore} onClick={() => void loadMore()}>
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
                                <ChatMessageItem
                                    key={m.id}
                                    message={m}
                                    selectionMode={selectionMode}
                                    selected={selectedIds.includes(m.id)}
                                    isNew={newIds.has(m.id)}
                                    editing={editingId === m.id}
                                    editDraft={editDraft}
                                    setEditDraft={setEditDraft}
                                    menuOpen={menuOpenId === m.id}
                                    setMenuOpenId={setMenuOpenId}
                                    chatMenuPos={chatMenuPos}
                                    setChatMenuPos={setChatMenuPos}
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
                            ))}
                            <div ref={chatBottomSentinelRef} className="chat-log-anchor" aria-hidden />
                        </>
                    )}
                </div>
                <form className="chat-form" onSubmit={sendChat}>
                    <textarea
                        ref={chatInputRef}
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Write a message…"
                        autoComplete="off"
                        rows={1}
                    />
                    <button
                        type="submit"
                        className="px-2 rounded-xl h-9 bg-blue-500 text-white mt-1 hover:bg-blue-600 cursor-pointer disabled:bg-slate-700"
                        disabled={!chatInput.trim() || !socketConnected}
                    >
                        <SendIcon size={18} />
                    </button>
                </form>
            </div>
        </section>
    );
}
