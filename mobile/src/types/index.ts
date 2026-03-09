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
};

export type DashboardTabParamList = {
    Gallery: undefined;
    Upload: undefined;
    Settings: undefined;
};
