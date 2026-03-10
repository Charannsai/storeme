export interface User {
    id: string;
    email: string;
}

export interface GalleryItem {
    id: string;
    filename: string;
    file_type: 'image' | 'video';
    size: number;
    github_path: string;
    uploaded_at: string;
    raw_url: string;
}

export interface Folder {
    id: string;    // Same as name (folder name is the ID)
    name: string;
    path: string;  // Full GitHub path
}

export interface UploadQueueItem {
    id: string;
    uri: string;
    filename: string;
    type: 'image' | 'video';
    size: number;
    status: 'pending' | 'uploading' | 'failed' | 'completed';
    error?: string;
    created_at: number;
}

export type RootStackParamList = {
    Auth: undefined;
    ConnectGitHub: undefined;
    Dashboard: undefined; // Tab Navigator
    ImageViewer: { items: GalleryItem[]; initialIndex: number };
    ImageEditor: { imageUri: string; fileId: string };
    FolderView: { folder: Folder };
    TrashBin: undefined;
    AllPhotos: undefined;
    Settings: undefined;
};

export type DashboardTabParamList = {
    Photos: undefined; // Previously Gallery
    Albums: undefined; // New
};
