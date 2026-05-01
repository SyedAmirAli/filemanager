import { useLayoutEffect, useRef } from 'react';
import { ChatMessageItem } from './ChatMessageItem';
import { useHomeContext } from './HomeContext';
import { SendIcon } from 'lucide-react';

export function ChatColumn() {
    const {
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
        chatLogRef,
        chatBottomSentinelRef,
        setDeleteConfirm,
    } = useHomeContext();
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
                                <ChatMessageItem key={m.id} message={m} />
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
