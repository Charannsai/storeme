export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface GitHubAccount {
  id: string;
  user_id: string;
  github_username: string;
  access_token: string;
  repo_name: string;
  created_at: string;
}

export interface MediaFile {
  id: string;
  user_id: string;
  filename: string;
  file_type: 'image' | 'video';
  size: number;
  github_path: string;
  uploaded_at: string;
  hash: string;
  status: 'pending' | 'uploading' | 'synced' | 'failed';
}
//upload request interface
export interface UploadRequest {
  filename: string;
  file_type: 'image' | 'video';
  size: number;
  content: string; // Base64 encoded
  hash: string;
}
//gallery item interface
export interface GalleryItem {
  id: string;
  filename: string;
  file_type: 'image' | 'video';
  size: number;
  github_path: string;
  uploaded_at: string;
  raw_url: string;
}
//storage info interface
export interface StorageInfo {
  repo_size: number;
  file_count: number;
  image_count: number;
  video_count: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
