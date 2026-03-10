import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthenticatedUser, getGitHubAccount, errorResponse, successResponse } from '@/lib/auth';
import { moveFileInGitHub } from '@/lib/github';

const TRASH_PREFIX = '_trash/';
const FOLDERS_ROOT = 'gallery/folders';

/**
 * POST /api/files/bulk
 * Bulk operations: move to folder, move to root, trash.
 * Body: { action: 'move' | 'trash', file_ids: string[], folder_name?: string }
 */
export async function POST(request: NextRequest) {
    try {
        const user = await getAuthenticatedUser(request);
        if (!user) return errorResponse('Unauthorized', 401);

        const githubAccount = await getGitHubAccount(user.id);
        if (!githubAccount) return errorResponse('GitHub account not connected', 400);

        const { action, file_ids, folder_name } = await request.json();

        if (!file_ids || !Array.isArray(file_ids) || file_ids.length === 0) {
            return errorResponse('file_ids array is required', 400);
        }
        if (!action) return errorResponse('action is required', 400);

        // Get all file records
        const { data: files } = await supabaseAdmin
            .from('media_files')
            .select('*')
            .in('id', file_ids)
            .eq('user_id', user.id);

        if (!files || files.length === 0) return errorResponse('No files found', 404);

        switch (action) {
            case 'move': {
                let successCount = 0;

                for (const file of files) {
                    // Skip trashed files
                    if (file.github_path.startsWith(TRASH_PREFIX)) continue;

                    let newPath: string;
                    const filename = file.github_path.split('/').pop()!;

                    if (folder_name) {
                        // Move to folder: gallery/folders/<name>/<filename>
                        newPath = `${FOLDERS_ROOT}/${folder_name}/${filename}`;
                    } else {
                        // Move back to root: gallery/images/<filename>
                        // Extract just the filename part
                        newPath = `gallery/images/${filename}`;
                    }

                    // Skip if already at target
                    if (file.github_path === newPath) continue;

                    try {
                        await moveFileInGitHub(
                            githubAccount.access_token,
                            githubAccount.github_username,
                            githubAccount.repo_name,
                            file.github_path,
                            newPath,
                            folder_name ? `Move ${file.filename} to ${folder_name}` : `Move ${file.filename} to root`
                        );

                        await supabaseAdmin
                            .from('media_files')
                            .update({ github_path: newPath })
                            .eq('id', file.id);

                        successCount++;
                    } catch (err) {
                        console.error(`Move failed for ${file.filename}:`, err);
                    }
                }

                return successResponse({
                    message: `${successCount} file(s) moved successfully`,
                });
            }

            case 'trash': {
                let trashCount = 0;

                for (const file of files) {
                    if (file.github_path.startsWith(TRASH_PREFIX)) continue;

                    const trashPath = `${TRASH_PREFIX}${file.github_path}`;

                    try {
                        await moveFileInGitHub(
                            githubAccount.access_token,
                            githubAccount.github_username,
                            githubAccount.repo_name,
                            file.github_path,
                            trashPath,
                            `Trash ${file.filename}`
                        );

                        await supabaseAdmin
                            .from('media_files')
                            .update({ github_path: trashPath })
                            .eq('id', file.id);

                        trashCount++;
                    } catch (err) {
                        console.error(`Trash failed for ${file.filename}:`, err);
                    }
                }

                return successResponse({
                    message: `${trashCount} file(s) moved to trash`,
                });
            }

            default:
                return errorResponse('Invalid action. Use "move" or "trash"', 400);
        }
    } catch (err) {
        console.error('Bulk operation error:', err);
        return errorResponse('Internal server error', 500);
    }
}
