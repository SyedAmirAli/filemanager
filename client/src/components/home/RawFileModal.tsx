import type { FormEvent, RefObject } from 'react';

type Props = {
    open: boolean;
    uploadBusy: boolean;
    rawFileName: string;
    rawFileContent: string;
    rawFileNameInputRef: RefObject<HTMLInputElement | null>;
    onClose: () => void;
    onSubmit: (e: FormEvent) => void;
    onRawFileNameChange: (v: string) => void;
    onRawFileContentChange: (v: string) => void;
};

export function RawFileModal({
    open,
    uploadBusy,
    rawFileName,
    rawFileContent,
    rawFileNameInputRef,
    onClose,
    onSubmit,
    onRawFileNameChange,
    onRawFileContentChange,
}: Props) {
    if (!open) return null;

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
                aria-labelledby="raw-file-modal-title"
                onMouseDown={(e) => e.stopPropagation()}
            >
                <h3 id="raw-file-modal-title" className="modal-dialog-title">
                    Create raw file
                </h3>
                <form className="modal-dialog-form" onSubmit={onSubmit}>
                    <label className="modal-field">
                        <span>File name</span>
                        <input
                            ref={rawFileNameInputRef}
                            type="text"
                            value={rawFileName}
                            onChange={(e) => onRawFileNameChange(e.target.value)}
                            placeholder="notes.txt"
                            autoComplete="off"
                            required
                        />
                    </label>
                    <label className="modal-field">
                        <span>Content</span>
                        <textarea
                            value={rawFileContent}
                            onChange={(e) => onRawFileContentChange(e.target.value)}
                            rows={14}
                            placeholder="Paste or type file contents…"
                            spellCheck={false}
                        />
                    </label>
                    <div className="modal-dialog-actions">
                        <button type="button" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="primary" disabled={uploadBusy}>
                            Create & upload
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
