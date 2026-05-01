import { useHomeContext } from './HomeContext';

export function DeleteConfirmModal() {
    const { deleteConfirm, selectedCount, setDeleteConfirm, executeDeleteConfirm } = useHomeContext();

    if (!deleteConfirm) return null;

    return (
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
                            Delete <strong>{selectedCount}</strong> selected message
                            {selectedCount === 1 ? '' : 's'}? This cannot be undone.
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
    );
}
