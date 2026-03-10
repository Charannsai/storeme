import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthenticatedUser, getGitHubAccount, errorResponse, successResponse } from '@/lib/auth';
import { moveFileInGitHub } from '@/lib/github';

const TRASH_PREFIX = '_trash/';

/**
 * DELETE /api/file
 * Soft-delete: moves the file to _trash/ folder in GitHub repo.
 * The file can be restored later from the trash.
 * 
 * Body: { file_id: string }
 */
export async function DELETE(request: NextRequest) {
    try {
        const user = await getAuthenticatedUser(request);

        if (!user) {
            return errorResponse('Unauthorized', 401);
        }

        const githubAccount = await getGitHubAccount(user.id);
        if (!githubAccount) {
            return errorResponse('GitHub account not connected', 400);
        }

        const { file_id } = await request.json();

        if (!file_id) {
            return errorResponse('file_id is required', 400);
        }

        // Get the file metadata
        const { data: file, error: fetchError } = await supabaseAdmin
            .from('media_files')
            .select('*')
            .eq('id', file_id)
            .eq('user_id', user.id)
            .single();

        if (fetchError || !file) {
            return errorResponse('File not found', 404);
        }

        // Don't trash already-trashed files
        if (file.github_path.startsWith(TRASH_PREFIX)) {
            return errorResponse('File is already in trash', 400);
        }

        const trashPath = `${TRASH_PREFIX}${file.github_path}`;

        try {
            // Move file to _trash/ in GitHub
            await moveFileInGitHub(
                githubAccount.access_token,
                githubAccount.github_username,
                githubAccount.repo_name,
                file.github_path,
                trashPath,
                `Trash ${file.filename}`
            );

            // Update the github_path in Supabase
            await supabaseAdmin
                .from('media_files')
                .update({ github_path: trashPath })
                .eq('id', file_id)
                .eq('user_id', user.id);

            return successResponse({
                message: 'File moved to trash',
                trashed_file: file.filename,
            });
        } catch (moveError: any) {
            console.error('GitHub trash move error:', moveError);
            return errorResponse(`Failed to move file to trash: ${moveError?.message}`, 500);
        }
    } catch (err) {
        console.error('File trash error:', err);
        return errorResponse('Internal server error', 500);
    }
}
