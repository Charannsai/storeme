import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthenticatedUser, getGitHubAccount, errorResponse, successResponse } from '@/lib/auth';

/**
 * GET /api/gallery
 * Fetch the user's gallery metadata.
 * 
 * Query params:
 * - page (default: 1)
 * - limit (default: 50)
 * - type (optional: 'image' | 'video')
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

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
        const fileType = searchParams.get('type');
        const folderName = searchParams.get('folder_name');
        const offset = (page - 1) * limit;

        let query = supabaseAdmin
            .from('media_files')
            .select('id, filename, file_type, size, github_path, uploaded_at, hash, status', { count: 'exact' })
            .eq('user_id', user.id)
            .eq('status', 'synced')
            .not('github_path', 'like', '_trash/%')
            .order('uploaded_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (fileType && (fileType === 'image' || fileType === 'video')) {
            query = query.eq('file_type', fileType);
        }

        if (folderName) {
            // Filter files in a specific folder
            query = query.like('github_path', `gallery/folders/${folderName}/%`);
        }

        const { data, error, count } = await query;

        if (error) {
            return errorResponse('Failed to fetch gallery', 500);
        }

        const token = request.headers.get('authorization')?.replace('Bearer ', '');
        const host = request.headers.get('host') || 'localhost:3000';
        const protocol = request.headers.get('x-forwarded-proto') || 'http';
        const origin = `${protocol}://${host}`;

        // Build proxy URLs for each file to securely access them
        const galleryItems = (data || []).map(file => ({
            ...file,
            raw_url: `${origin}/api/file/media?id=${file.id}&token=${token}`,
        }));

        return successResponse({
            items: galleryItems,
            pagination: {
                page,
                limit,
                total: count || 0,
                total_pages: Math.ceil((count || 0) / limit),
            },
        });
    } catch (err) {
        console.error('Gallery fetch error:', err);
        return errorResponse('Internal server error', 500);
    }
}
