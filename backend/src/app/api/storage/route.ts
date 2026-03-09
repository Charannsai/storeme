import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthenticatedUser, getGitHubAccount, errorResponse, successResponse } from '@/lib/auth';
import { getRepoInfo } from '@/lib/github';

/**
 * GET /api/storage
 * Get the user's storage usage information.
 */
export async function GET(request: NextRequest) {
    try {
        const user = await getAuthenticatedUser(request);

        if (!user) {
            return errorResponse('Unauthorized', 401);
        }

        const githubAccount = await getGitHubAccount(user.id);

        if (!githubAccount) {
            return errorResponse('GitHub account not connected', 400);
        }

        // Get repo info from GitHub
        let repoSize = 0;
        try {
            const repoInfo = await getRepoInfo(
                githubAccount.access_token,
                githubAccount.github_username,
                githubAccount.repo_name
            );
            repoSize = repoInfo.size; // in KB
        } catch {
            // Repo might not exist yet
        }

        // Get file stats from DB
        const { data: files, error } = await supabaseAdmin
            .from('media_files')
            .select('file_type, size')
            .eq('user_id', user.id)
            .eq('status', 'synced');

        if (error) {
            return errorResponse('Failed to fetch storage info', 500);
        }

        const fileCount = files?.length || 0;
        const imageCount = files?.filter(f => f.file_type === 'image').length || 0;
        const videoCount = files?.filter(f => f.file_type === 'video').length || 0;
        const totalSize = files?.reduce((sum, f) => sum + (f.size || 0), 0) || 0;

        return successResponse({
            repo_size_kb: repoSize,
            repo_size_mb: Math.round(repoSize / 1024 * 100) / 100,
            repo_size_display: formatSize(repoSize * 1024), // Convert KB to bytes for formatting
            file_count: fileCount,
            image_count: imageCount,
            video_count: videoCount,
            total_file_size: totalSize,
            total_file_size_display: formatSize(totalSize),
        });
    } catch (err) {
        console.error('Storage info error:', err);
        return errorResponse('Internal server error', 500);
    }
}

function formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}
