import { useMemo, useState } from 'react';
import type { ChatMessage } from './types';
import { formatTime } from './utils';
import { useHomeContext } from './HomeContext';

type ChatMessageItemProps = {
    message: ChatMessage;
};

function stripHtml(html: string): string {
    if (typeof DOMParser === 'undefined') {
        return html.replace(/<[^>]*>/g, '');
    }

    const parsed = new DOMParser().parseFromString(html, 'text/html');
    return parsed.body.textContent ?? '';
}

function sanitizeHtml(html: string): string {
    if (typeof document === 'undefined') {
        return '';
    }

    const template = document.createElement('template');
    template.innerHTML = html;

    template.content.querySelectorAll('script, style, iframe, object, embed, link, meta, base').forEach((node) => {
        node.remove();
    });

    template.content.querySelectorAll('*').forEach((node) => {
        [...node.attributes].forEach((attr) => {
            const name = attr.name.toLowerCase();
            const value = attr.value.trim().toLowerCase();
            const isUnsafeUrl = (name === 'href' || name === 'src') && value.startsWith('javascript:');

            if (name.startsWith('on') || name === 'style' || isUnsafeUrl) {
                node.removeAttribute(attr.name);
            }
        });

        if (node.tagName.toLowerCase() === 'a') {
            node.setAttribute('target', '_blank');
            node.setAttribute('rel', 'noreferrer');
        }
    });

    return template.innerHTML;
}

function ChatMessageBody({ body }: { body: string }) {
    const [expanded, setExpanded] = useState(false);
    const plainText = useMemo(() => stripHtml(body), [body]);
    const htmlPreview = useMemo(() => sanitizeHtml(body), [body]);

    const toggleExpanded = () => setExpanded((value) => !value);

    return (
        <div
            className={`chat-msg-text${expanded ? ' chat-msg-text--expanded' : ' chat-msg-text--collapsed'}`}
            role="button"
            tabIndex={0}
            aria-expanded={expanded}
            onClick={toggleExpanded}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleExpanded();
                }
            }}
        >
            {expanded ? (
                <div className="chat-msg-html" dangerouslySetInnerHTML={{ __html: htmlPreview }} />
            ) : (
                <div className="chat-msg-plain">{plainText}</div>
            )}
        </div>
    );
}

export function ChatMessageItem({ message }: ChatMessageItemProps) {
    const {
        selectionMode,
        selectedIds,
        newIds,
        editingId,
        editDraft,
        setEditDraft,
        menuOpenId,
        setMenuOpenId,
        chatMenuPos,
        setChatMenuPos,
        chatMenuPopoverRef,
        chatMenuBtnRefs,
        toggleSelected,
        startEdit,
        cancelEdit,
        saveEdit,
        copyPlainText,
        togglePinMsg,
        enterSelectionForMessage,
        setDeleteConfirm,
    } = useHomeContext();
    const selected = selectedIds.includes(message.id);
    const isNew = newIds.has(message.id);
    const editing = editingId === message.id;
    const menuOpen = menuOpenId === message.id;

    return (
        <article
            className={`chat-msg${selectionMode ? ' chat-msg--select-mode' : ''}${isNew ? ' chat-msg--new' : ''}${message.pinned ? ' chat-msg--pinned' : ''}`}
        >
            {selectionMode && (
                <label className="chat-msg-select">
                    <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleSelected(message.id)}
                        aria-label={`Select message ${message.id.slice(0, 8)}`}
                    />
                </label>
            )}
            <div className="chat-msg-main">
                <div className="chat-msg-head">
                    <time>{formatTime(message.createdAt)}</time>
                    {message.editedAt && <span className="msg-tag msg-tag--edited">edited</span>}
                    {message.pinned && <span className="msg-tag msg-tag--pinned">pinned</span>}
                </div>
                {editing ? (
                    <div className="chat-msg-edit">
                        <textarea
                            value={editDraft}
                            onChange={(e) => setEditDraft(e.target.value)}
                            rows={3}
                            className="chat-msg-textarea"
                        />
                        <div className="chat-msg-edit-actions">
                            <button type="button" className="primary" onClick={() => void saveEdit()}>
                                Save
                            </button>
                            <button type="button" onClick={cancelEdit}>
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <ChatMessageBody body={message.body} />
                )}
            </div>
            <div className="chat-msg-menu-wrap" data-chat-menu-root>
                <button
                    type="button"
                    className="chat-msg-menu-btn"
                    aria-expanded={menuOpen}
                    aria-haspopup="menu"
                    aria-label="Message actions"
                    ref={(el) => {
                        if (el) chatMenuBtnRefs.current.set(message.id, el);
                        else chatMenuBtnRefs.current.delete(message.id);
                    }}
                    onClick={(e) => {
                        if (menuOpen) {
                            setMenuOpenId(null);
                            setChatMenuPos(null);
                        } else {
                            const r = e.currentTarget.getBoundingClientRect();
                            const gap = 4;
                            setMenuOpenId(message.id);
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
                {menuOpen && chatMenuPos && (
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
                            <button type="button" role="menuitem" onClick={() => startEdit(message)}>
                                Edit
                            </button>
                        </li>
                        <li role="none">
                            <button type="button" role="menuitem" onClick={() => void togglePinMsg(message)}>
                                {message.pinned ? 'Unpin' : 'Pin'}
                            </button>
                        </li>
                        <li role="none">
                            <button type="button" role="menuitem" onClick={() => enterSelectionForMessage(message)}>
                                Select message
                            </button>
                        </li>
                        <li role="none">
                            <button type="button" role="menuitem" onClick={() => void copyPlainText(message)}>
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
                                    setDeleteConfirm({ type: 'message', id: message.id });
                                }}
                            >
                                Delete
                            </button>
                        </li>
                    </ul>
                )}
            </div>
        </article>
    );
}
