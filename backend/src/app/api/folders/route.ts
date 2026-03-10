import { NextRequest } from 'next/server';
import { getAuthenticatedUser, getGitHubAccount, errorResponse, successResponse } from '@/lib/auth';
import { listDirectoryInGitHub, createDirectoryInGitHub, deleteFileFromGitHub, listDirectoryInGitHub as listDir } from '@/lib/github';

import { supabaseAdmin } from '@/lib/supabase';

const FOLDERS_ROOT = 'gallery/folders';

/**
 * GET /api/folders
 * List all folders from the GitHub repo.
 */
export async function GET(request: NextRequest) {
    try {
        const user = await getAuthenticatedUser(request);
        if (!user) return errorResponse('Unauthorized', 401);

        const githubAccount = await getGitHubAccount(user.id);
        if (!githubAccount) return errorResponse('GitHub account not connected', 400);

        const items = await listDirectoryInGitHub(
            githubAccount.access_token,
            githubAccount.github_username,
            githubAccount.repo_name,
            FOLDERS_ROOT
        );

        const token = request.headers.get('authorization')?.replace('Bearer ', '');
        const host = request.headers.get('host') || 'localhost:3000';
        const protocol = request.headers.get('x-forwarded-proto') || 'http';
        const origin = `${protocol}://${host}`;

        // Only return directories
        const directories = items.filter(item => item.type === 'dir');

        // Concurrently find a cover image for each folder
        const folders = await Promise.all(directories.map(async item => {
            const folderName = item.name;
            let cover_url = null;

            const { data: recentFiles } = await supabaseAdmin
                .from('media_files')
                .select('id, file_type')
                .eq('user_id', user.id)
                .eq('status', 'synced')
                .like('github_path', `gallery/folders/${folderName}/%`)
                .order('uploaded_at', { ascending: false })
                .limit(1);

            if (recentFiles && recentFiles.length > 0 && recentFiles[0].file_type === 'image') {
                cover_url = `${origin}/api/file/media?id=${recentFiles[0].id}&token=${token}`;
            }

            return {
                id: folderName,
                name: folderName,
                path: item.path,
                cover_url
            };
        }));

        return successResponse({ folders });
    } catch (err) {
        console.error('Folders fetch error:', err);
        return errorResponse('Internal server error', 500);
    }
}

/**
 * POST /api/folders
 * Create a new folder in the GitHub repo.
 * Body: { name: string }
 */
export async function POST(request: NextRequest) {
    try {
        const user = await getAuthenticatedUser(request);
        if (!user) return errorResponse('Unauthorized', 401);

        const githubAccount = await getGitHubAccount(user.id);
        if (!githubAccount) return errorResponse('GitHub account not connected', 400);

        const { name } = await request.json();
        if (!name || !name.trim()) return errorResponse('Folder name is required', 400);

        // Sanitize name (no slashes, dots at start, etc.)
        const safeName = name.trim().replace(/[\/\\:*?"<>|]/g, '_');
        const folderPath = `${FOLDERS_ROOT}/${safeName}`;

        // Check if folder already exists
        const existing = await listDirectoryInGitHub(
            githubAccount.access_token,
            githubAccount.github_username,
            githubAccount.repo_name,
            FOLDERS_ROOT
        );

        if (existing.some(item => item.name === safeName && item.type === 'dir')) {
            return errorResponse('A folder with this name already exists', 409);
        }

        // Create folder via .gitkeep
        await createDirectoryInGitHub(
            githubAccount.access_token,
            githubAccount.github_username,
            githubAccount.repo_name,
            folderPath
        );

        return successResponse({
            folder: { id: safeName, name: safeName, path: folderPath }
        }, 201);
    } catch (err) {
        console.error('Folder create error:', err);
        return errorResponse('Internal server error', 500);
    }
}

/**
 * DELETE /api/folders
 * Delete a folder from the GitHub repo.
 * Files inside must be moved out first (or they'll be orphaned).
 * Body: { name: string }
 */
export async function DELETE(request: NextRequest) {
    try {
        const user = await getAuthenticatedUser(request);
        if (!user) return errorResponse('Unauthorized', 401);

        const githubAccount = await getGitHubAccount(user.id);
        if (!githubAccount) return errorResponse('GitHub account not connected', 400);

        const { name } = await request.json();
        if (!name) return errorResponse('Folder name is required', 400);

        const folderPath = `${FOLDERS_ROOT}/${name}`;

        // List all files in the folder
        const contents = await listDirectoryInGitHub(
            githubAccount.access_token,
            githubAccount.github_username,
            githubAccount.repo_name,
            folderPath
        );

        // Delete all files in the folder (including .gitkeep)
        for (const item of contents) {
            if (item.type === 'file') {
                try {
                    await deleteFileFromGitHub(
                        githubAccount.access_token,
                        githubAccount.github_username,
                        githubAccount.repo_name,
                        item.path
                    );
                } catch (err) {
                    console.error(`Failed to delete ${item.path}:`, err);
                }
            }
        }

        return successResponse({ message: `Folder "${name}" deleted` });
    } catch (err) {
        console.error('Folder delete error:', err);
        return errorResponse('Internal server error', 500);
    }
}
