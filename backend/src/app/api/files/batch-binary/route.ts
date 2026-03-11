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

        const formData = await request.formData();
        const files = formData.getAll('files') as File[];
        const metadataStr = formData.get('metadata') as string;

        if (!files || files.length === 0 || !metadataStr) {
            return errorResponse('Missing files or metadata array', 400);
        }

        let metadataList: any[];
        try {
            metadataList = JSON.parse(metadataStr);
        } catch {
            return errorResponse('Invalid metadata JSON', 400);
        }

        if (files.length !== metadataList.length) {
            return errorResponse('Mismatch between files and metadata lengths', 400);
        }

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');

        const successfulFiles = [];
        const githubPayload = [];

        // We process the multipart array in parallel via Promise.all mapping
        const processedItems = await Promise.all(
            files.map(async (file, index) => {
                const meta = metadataList[index];
                const { filename, file_type, size, hash, album } = meta;

                if (!filename || !file_type || !hash) {
                    return null; // skip invalid objects
                }

                // Check duplicate
                const { data: existing } = await supabaseAdmin
                    .from('media_files')
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('hash', hash)
                    .single();

                if (existing) return null;

                const folder = file_type === 'video' ? 'videos' : 'images';
                const githubPath = album ? `gallery/albums/${album}/${filename}` : `gallery/${folder}/${year}/${month}/${filename}`;

                // Extract binary buffer into Base64 precisely here, avoiding mobile network delays
                const arrayBuffer = await file.arrayBuffer();
                const base64Content = Buffer.from(arrayBuffer).toString('base64');

                return {
                    dbInsert: {
                        user_id: user.id,
                        filename,
                        file_type,
                        size: size || 0,
                        github_path: githubPath,
                        hash,
                        status: 'uploading',
                    },
                    githubRequest: {
                        path: githubPath,
                        content: base64Content,
                    }
                };
            })
        );

        for (const item of processedItems) {
            if (!item) continue;

            // Insert into db as uploading
            const { data: mediaFile, error: insertError } = await supabaseAdmin
                .from('media_files')
                .insert(item.dbInsert)
                .select()
                .single();

            if (!insertError && mediaFile) {
                githubPayload.push(item.githubRequest);
                successfulFiles.push(mediaFile);
            }
        }

        if (githubPayload.length === 0) {
            return errorResponse('No new files to upload (all might be duplicates)', 400);
        }

        try {
            // Upload them ALL in one single blazing-fast commit
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

            console.error('Batch GitHub Binary upload error:', uploadError);
            return errorResponse(`Failed to perform batch binary upload to GitHub: ${uploadError?.message}`, 500);
        }
    } catch (err: any) {
        console.error('Batch Form upload error:', err);
        return errorResponse(`Internal server error: ${err?.message}`, 500);
    }
}
