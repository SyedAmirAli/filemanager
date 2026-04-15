import type { DeleteConfirmState } from './types';

type Props = {
    deleteConfirm: NonNullable<DeleteConfirmState>;
    selectedCount: number;
    onDismiss: () => void;
    onConfirm: () => void;
};

export function DeleteConfirmModal({ deleteConfirm, selectedCount, onDismiss, onConfirm }: Props) {
    return (
        <div
            className="modal-backdrop"
            role="presentation"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onDismiss();
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
                            Delete <strong>{selectedCount}</strong> selected message
                            {selectedCount === 1 ? '' : 's'}? This cannot be undone.
                        </>
                    )}
                </p>
                <div className="modal-dialog-actions">
                    <button type="button" onClick={onDismiss}>
                        Cancel
                    </button>
                    <button type="button" className="danger" onClick={() => void onConfirm()}>
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}
