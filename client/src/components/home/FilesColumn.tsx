import { Download, Eye, Trash2 } from 'lucide-react';
import { formatBytes, formatSize, formatTime } from './utils';
import { RawFileModal } from './RawFileModal';
import { useHomeContext } from './HomeContext';

export function FilesColumn() {
    const {
        files,
        filesErr,
        uploadBusy,
        drag,
        setDrag,
        fileInputRef,
        runUploadQueue,
        onDrop,
        uploadJobs,
        rawFileModalOpen,
        setRawFileModalOpen,
        rawFileName,
        rawFileContent,
        rawFileNameInputRef,
        closeRawFileModal,
        submitRawFile,
        setRawFileName,
        setRawFileContent,
        openFilePreview,
        downloadFile,
        setDeleteConfirm,
    } = useHomeContext();

    return (
        <section className="layout-section layout-section--files">
            <h2>Files</h2>
            <div className="panel">
                <div className="files-upload-head flex justify-between items-center">
                    <h3>Upload or create raw files</h3>
                    <button
                        className="bg-emerald-700! font-semibold! tracking-wide btn"
                        type="button"
                        disabled={uploadBusy}
                        onClick={() => setRawFileModalOpen(true)}
                    >
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
                <RawFileModal
                    open={rawFileModalOpen}
                    uploadBusy={uploadBusy}
                    rawFileName={rawFileName}
                    rawFileContent={rawFileContent}
                    rawFileNameInputRef={rawFileNameInputRef}
                    onClose={closeRawFileModal}
                    onSubmit={submitRawFile}
                    onRawFileNameChange={setRawFileName}
                    onRawFileContentChange={setRawFileContent}
                />
                {filesErr && <p className="empty">{filesErr}</p>}
                {!files.length && !filesErr ? (
                    <p className="empty">No files yet.</p>
                ) : (
                    <ul className="file-list scrollbar-thin scrollbar-light" style={{ marginTop: '1rem' }}>
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
                                    <button
                                        type="button"
                                        className="icon-btn"
                                        aria-label="Download"
                                        title="Download"
                                        onClick={() => downloadFile(f)}
                                    >
                                        <Download size={18} strokeWidth={2} aria-hidden />
                                    </button>
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
    );
}
