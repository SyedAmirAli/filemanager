export type FileRow = {
    id: string;
    originalName: string;
    mimeType: string;
    size: string;
    createdAt: string;
};

export type ChatMessage = {
    id: string;
    body: string;
    createdAt: string;
    editedAt: string | null;
    pinned: boolean;
    pinnedAt: string | null;
};

export type UploadJob = {
    id: string;
    name: string;
    size: number;
    status: 'pending' | 'uploading' | 'done' | 'error';
    progress: number;
    error?: string;
};

export type SocketStatus = 'connecting' | 'connected' | 'disconnected';

export type DeleteConfirmState =
    | null
    | { type: 'file'; id: string; name: string }
    | { type: 'message'; id: string }
    | { type: 'bulk' };
