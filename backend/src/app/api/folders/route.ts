import { NextRequest } from 'next/server';
import { getAuthenticatedUser, getGitHubAccount, errorResponse, successResponse } from '@/lib/auth';
import { listDirectoryInGitHub, createDirectoryInGitHub, deleteFileFromGitHub, listDirectoryInGitHub as listDir } from '@/lib/github';

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

        // Only return directories (not .gitkeep files)
        const folders = items
            .filter(item => item.type === 'dir')
            .map(item => ({
                id: item.name, // folder name acts as ID
                name: item.name,
                path: item.path,
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
