import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthenticatedUser, getGitHubAccount, errorResponse, successResponse } from '@/lib/auth';
import { moveFileInGitHub, deleteFileFromGitHub } from '@/lib/github';

const TRASH_PREFIX = '_trash/';

/**
 * GET /api/trash
 * List trashed files (files whose github_path starts with _trash/).
 */
export async function GET(request: NextRequest) {
    try {
        const user = await getAuthenticatedUser(request);
        if (!user) return errorResponse('Unauthorized', 401);

        const { data, error } = await supabaseAdmin
            .from('media_files')
            .select('id, filename, file_type, size, github_path, uploaded_at, hash, status')
            .eq('user_id', user.id)
            .like('github_path', `${TRASH_PREFIX}%`)
            .order('uploaded_at', { ascending: false });

        if (error) return errorResponse('Failed to fetch trash', 500);

        const token = request.headers.get('authorization')?.replace('Bearer ', '');
        const host = request.headers.get('host') || 'localhost:3000';
        const protocol = request.headers.get('x-forwarded-proto') || 'http';
        const origin = `${protocol}://${host}`;

        const items = (data || []).map(file => ({
            ...file,
            raw_url: `${origin}/api/file/media?id=${file.id}&token=${token}`,
            // The original path is the path without the _trash/ prefix
            original_path: file.github_path.replace(TRASH_PREFIX, ''),
        }));

        return successResponse({ items });
    } catch (err) {
        console.error('Trash fetch error:', err);
        return errorResponse('Internal server error', 500);
    }
}

/**
 * POST /api/trash
 * Restore files from trash — moves them back from _trash/ to original path in GitHub.
 * Body: { file_ids: string[] }
 */
export async function POST(request: NextRequest) {
    try {
        const user = await getAuthenticatedUser(request);
        if (!user) return errorResponse('Unauthorized', 401);

        const githubAccount = await getGitHubAccount(user.id);
        if (!githubAccount) return errorResponse('GitHub account not connected', 400);

        const { file_ids } = await request.json();
        if (!file_ids || !Array.isArray(file_ids) || file_ids.length === 0) {
            return errorResponse('file_ids array is required', 400);
        }

        let restoredCount = 0;

        for (const fileId of file_ids) {
            const { data: file } = await supabaseAdmin
                .from('media_files')
                .select('*')
                .eq('id', fileId)
                .eq('user_id', user.id)
                .single();

            if (!file || !file.github_path.startsWith(TRASH_PREFIX)) continue;

            const originalPath = file.github_path.replace(TRASH_PREFIX, '');

            try {
                // Move file back from _trash/ to original path in GitHub
                await moveFileInGitHub(
                    githubAccount.access_token,
                    githubAccount.github_username,
                    githubAccount.repo_name,
                    file.github_path,
                    originalPath,
                    `Restore ${file.filename} from trash`
                );

                // Update path in Supabase
                await supabaseAdmin
                    .from('media_files')
                    .update({ github_path: originalPath })
                    .eq('id', fileId);

                restoredCount++;
            } catch (err) {
                console.error(`Restore failed for ${file.filename}:`, err);
            }
        }

        return successResponse({ message: `${restoredCount} file(s) restored` });
    } catch (err) {
        console.error('Trash restore error:', err);
        return errorResponse('Internal server error', 500);
    }
}

/**
 * DELETE /api/trash
 * Permanently delete files from trash (removes from GitHub + DB).
 * Body: { file_ids: string[] } or { empty_all: true }
 */
export async function DELETE(request: NextRequest) {
    try {
        const user = await getAuthenticatedUser(request);
        if (!user) return errorResponse('Unauthorized', 401);

        const githubAccount = await getGitHubAccount(user.id);
        if (!githubAccount) return errorResponse('GitHub account not connected', 400);

        const body = await request.json();
        const { file_ids, empty_all } = body;

        let filesToDelete;

        if (empty_all) {
            const { data } = await supabaseAdmin
                .from('media_files')
                .select('*')
                .eq('user_id', user.id)
                .like('github_path', `${TRASH_PREFIX}%`);
            filesToDelete = data || [];
        } else if (file_ids && Array.isArray(file_ids) && file_ids.length > 0) {
            const { data } = await supabaseAdmin
                .from('media_files')
                .select('*')
                .in('id', file_ids)
                .eq('user_id', user.id)
                .like('github_path', `${TRASH_PREFIX}%`);
            filesToDelete = data || [];
        } else {
            return errorResponse('file_ids array or empty_all flag is required', 400);
        }

        let deletedCount = 0;
        for (const file of filesToDelete) {
            try {
                await deleteFileFromGitHub(
                    githubAccount.access_token,
                    githubAccount.github_username,
                    githubAccount.repo_name,
                    file.github_path
                );
            } catch (err) {
                console.error(`GitHub delete failed for ${file.filename}:`, err);
            }

            await supabaseAdmin
                .from('media_files')
                .delete()
                .eq('id', file.id);

            deletedCount++;
        }

        return successResponse({ message: `${deletedCount} file(s) permanently deleted` });
    } catch (err) {
        console.error('Trash permanent delete error:', err);
        return errorResponse('Internal server error', 500);
    }
}
