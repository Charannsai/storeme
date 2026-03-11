import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthenticatedUser, getGitHubAccount, errorResponse, successResponse } from '@/lib/auth';
import { uploadFilesBatchToGitHub } from '@/lib/github';

export async function POST(request: NextRequest) {
    try {
        const user = await getAuthenticatedUser(request);
        if (!user) return errorResponse('Unauthorized', 401);

        const githubAccount = await getGitHubAccount(user.id);
        if (!githubAccount) return errorResponse('GitHub account not connected', 400);

        const { files } = await request.json();
        if (!Array.isArray(files) || files.length === 0) {
            return errorResponse('Missing or empty files array', 400);
        }

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');

        const successfulFiles = [];
        const githubPayload = [];

        for (const file of files) {
            const { filename, file_type, size, content, hash, album } = file;

            if (!filename || !file_type || !content || !hash) {
                continue; // skip invalid objects
            }

            // Check duplicate
            const { data: existing } = await supabaseAdmin
                .from('media_files')
                .select('id')
                .eq('user_id', user.id)
                .eq('hash', hash)
                .single();

            if (existing) continue;

            const folder = file_type === 'video' ? 'videos' : 'images';
            const githubPath = album ? `gallery/albums/${album}/${filename}` : `gallery/${folder}/${year}/${month}/${filename}`;

            // Insert into db as uploading
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

            if (!insertError && mediaFile) {
                githubPayload.push({
                    path: githubPath,
                    content,
                });
                successfulFiles.push(mediaFile);
            }
        }

        if (githubPayload.length === 0) {
            return errorResponse('No new files to upload (all might be duplicates)', 400);
        }

        try {
            // Upload them ALL in one single commit
            await uploadFilesBatchToGitHub(
                githubAccount.access_token,
                githubAccount.github_username,
                githubAccount.repo_name,
                githubPayload,
                `Batch upload ${githubPayload.length} media files`
            );

            // Mark all as synced
            const fileIds = successfulFiles.map(f => f.id);
            await supabaseAdmin
                .from('media_files')
                .update({ status: 'synced' })
                .in('id', fileIds);

            const token = request.headers.get('authorization')?.replace('Bearer ', '');
            const origin = request.nextUrl.origin;

            const resultData = successfulFiles.map(f => ({
                id: f.id,
                filename: f.filename,
                github_path: f.github_path,
                status: 'synced',
                raw_url: `${origin}/api/file/media?id=${f.id}&token=${token}`,
            }));

            return successResponse({ items: resultData }, 201);
        } catch (uploadError: any) {
            // Mark all as failed
            const fileIds = successfulFiles.map(f => f.id);
            await supabaseAdmin
                .from('media_files')
                .update({ status: 'failed' })
                .in('id', fileIds);

            console.error('Batch GitHub upload error:', uploadError);
            return errorResponse(`Failed to perform batch upload to GitHub: ${uploadError?.message}`, 500);
        }
    } catch (err: any) {
        console.error('Batch upload error:', err);
        return errorResponse(`Internal server error: ${err?.message}`, 500);
    }
}
