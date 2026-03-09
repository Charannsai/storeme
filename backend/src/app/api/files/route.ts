import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthenticatedUser, getGitHubAccount, errorResponse, successResponse } from '@/lib/auth';
import { uploadFileToGitHub } from '@/lib/github';

/**
 * POST /api/files
 * Upload a file: saves metadata to DB and pushes the file to GitHub.
 * 
 * Body: { filename, file_type, size, content (base64), hash }
 */
export async function POST(request: NextRequest) {
    try {
        const user = await getAuthenticatedUser(request);

        if (!user) {
            return errorResponse('Unauthorized', 401);
        }

        const githubAccount = await getGitHubAccount(user.id);

        if (!githubAccount) {
            return errorResponse('GitHub account not connected', 400);
        }

        const { filename, file_type, size, content, hash } = await request.json();

        if (!filename || !file_type || !content || !hash) {
            return errorResponse('Missing required fields: filename, file_type, content, hash', 400);
        }

        // Check for duplicate by hash
        const { data: existing } = await supabaseAdmin
            .from('media_files')
            .select('id')
            .eq('user_id', user.id)
            .eq('hash', hash)
            .single();

        if (existing) {
            return errorResponse('File already uploaded (duplicate hash detected)', 409);
        }

        // Construct the GitHub path
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const folder = file_type === 'video' ? 'videos' : 'images';
        const githubPath = `gallery/${folder}/${year}/${month}/${filename}`;

        // Insert metadata with "uploading" status
        const { data: mediaFile, error: insertError } = await supabaseAdmin
            .from('media_files')
            .insert({
                user_id: user.id,
                filename,
                file_type,
                size: size || 0,
                github_path: githubPath,
                hash,
                status: 'uploading',
            })
            .select()
            .single();

        if (insertError) {
            return errorResponse(`Failed to save file metadata: ${insertError.message}`, 500);
        }

        try {
            // Upload to GitHub
            await uploadFileToGitHub(
                githubAccount.access_token,
                githubAccount.github_username,
                githubAccount.repo_name,
                githubPath,
                content,
                `Upload ${filename}`
            );

            // Update status to synced
            await supabaseAdmin
                .from('media_files')
                .update({ status: 'synced' })
                .eq('id', mediaFile.id);

            const token = request.headers.get('authorization')?.replace('Bearer ', '');
            const origin = request.nextUrl.origin;

            return successResponse({
                id: mediaFile.id,
                filename,
                github_path: githubPath,
                status: 'synced',
                raw_url: `${origin}/api/file/media?id=${mediaFile.id}&token=${token}`,
            }, 201);
        } catch (uploadError: any) {
            // Mark as failed
            await supabaseAdmin
                .from('media_files')
                .update({ status: 'failed' })
                .eq('id', mediaFile.id);

            console.error('GitHub upload error:', uploadError);
            return errorResponse(`Failed to upload file to GitHub: ${uploadError?.message}`, 500);
        }
    } catch (err: any) {
        console.error('File upload error:', err);
        return errorResponse(`Internal server error: ${err?.message}`, 500);
    }
}
