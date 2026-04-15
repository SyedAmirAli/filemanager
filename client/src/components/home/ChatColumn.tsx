import type { Dispatch, FormEvent, MutableRefObject, RefObject, SetStateAction } from 'react';
import type { ChatMessage, DeleteConfirmState } from './types';
import { formatTime } from './utils';
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
                                                    <button type="button" role="menuitem" onClick={() => startEdit(m)}>
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
                            <div ref={chatBottomSentinelRef} className="chat-log-anchor" aria-hidden />
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
