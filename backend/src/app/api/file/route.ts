import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthenticatedUser, getGitHubAccount, errorResponse, successResponse } from '@/lib/auth';
import { deleteFileFromGitHub } from '@/lib/github';

/**
 * DELETE /api/file
 * Delete a file from GitHub and remove its metadata.
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

        try {
            // Delete from GitHub
            await deleteFileFromGitHub(
                githubAccount.access_token,
                githubAccount.github_username,
                githubAccount.repo_name,
                file.github_path
            );
        } catch (githubError) {
            console.error('GitHub delete error:', githubError);
            // Continue to delete metadata even if GitHub delete fails
        }

        // Delete metadata from DB
        const { error: deleteError } = await supabaseAdmin
            .from('media_files')
            .delete()
            .eq('id', file_id)
            .eq('user_id', user.id);

        if (deleteError) {
            return errorResponse('Failed to delete file metadata', 500);
        }

        return successResponse({
            message: 'File deleted successfully',
            deleted_file: file.filename,
        });
    } catch (err) {
        console.error('File delete error:', err);
        return errorResponse('Internal server error', 500);
    }
}
