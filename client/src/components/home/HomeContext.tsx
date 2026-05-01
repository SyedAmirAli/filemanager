import { createContext, useContext } from 'react';
import type { Dispatch, DragEvent, FormEvent, MutableRefObject, ReactNode, RefObject, SetStateAction } from 'react';
import type { ChatMessage, DeleteConfirmState, FileRow, UploadJob } from './types';

type ChatMenuPosition = { top: number; right: number };

type HomeContextValue = {
    files: FileRow[];
    filesErr: string | null;
    uploadBusy: boolean;
    drag: boolean;
    setDrag: (value: boolean) => void;
    fileInputRef: RefObject<HTMLInputElement | null>;
    runUploadQueue: (fileList: FileList | File[]) => void;
    onDrop: (event: DragEvent) => void;
    uploadJobs: UploadJob[];
    rawFileModalOpen: boolean;
    setRawFileModalOpen: (value: boolean) => void;
    rawFileName: string;
    rawFileContent: string;
    rawFileNameInputRef: RefObject<HTMLInputElement | null>;
    closeRawFileModal: () => void;
    submitRawFile: (event: FormEvent) => void;
    setRawFileName: (value: string) => void;
    setRawFileContent: (value: string) => void;
    openFilePreview: (file: FileRow) => void;
    downloadFile: (file: FileRow) => void;
    deleteConfirm: DeleteConfirmState;
    selectedCount: number;
    setDeleteConfirm: (value: DeleteConfirmState) => void;
    executeDeleteConfirm: () => void;
    hasMore: boolean;
    loadingMore: boolean;
    loadMore: () => void;
    messages: ChatMessage[];
    visibleMessages: ChatMessage[];
    chatSearch: string;
    setChatSearch: (value: string) => void;
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
    setChatInput: (value: string) => void;
    sendChat: (event: FormEvent) => void;
    socketConnected: boolean;
    newIds: Set<string>;
    editingId: string | null;
    editDraft: string;
    setEditDraft: (value: string) => void;
    menuOpenId: string | null;
    setMenuOpenId: (value: string | null) => void;
    chatMenuPos: ChatMenuPosition | null;
    setChatMenuPos: (value: ChatMenuPosition | null) => void;
    chatLogRef: RefObject<HTMLDivElement | null>;
    chatBottomSentinelRef: RefObject<HTMLDivElement | null>;
    chatMenuPopoverRef: RefObject<HTMLUListElement | null>;
    chatMenuBtnRefs: MutableRefObject<Map<string, HTMLButtonElement>>;
    toggleSelected: (id: string) => void;
    startEdit: (message: ChatMessage) => void;
    cancelEdit: () => void;
    saveEdit: () => void;
    copyPlainText: (message: ChatMessage) => void;
    togglePinMsg: (message: ChatMessage) => void;
    enterSelectionForMessage: (message: ChatMessage) => void;
};

const HomeContext = createContext<HomeContextValue | null>(null);

export function HomeProvider({ value, children }: { value: HomeContextValue; children: ReactNode }) {
    return <HomeContext.Provider value={value}>{children}</HomeContext.Provider>;
}

export function useHomeContext(): HomeContextValue {
    const context = useContext(HomeContext);
    if (!context) {
        throw new Error('useHomeContext must be used within HomeProvider');
    }
    return context;
}
