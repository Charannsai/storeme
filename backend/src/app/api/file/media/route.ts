import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getGitHubAccount } from '@/lib/auth';
import jwt from 'jsonwebtoken';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const token = searchParams.get('token');

        if (!id || !token) {
            return new NextResponse('Missing parameters', { status: 400 });
        }

        let userId = null;
        try {
            const { data: { user } } = await supabaseAdmin.auth.getUser(token);
            if (user) userId = user.id;
        } catch {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        if (!userId) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const githubAccount = await getGitHubAccount(userId);

        if (!githubAccount) {
            return new NextResponse('GitHub account not connected', 400);
        }

        const { data: file } = await supabaseAdmin
            .from('media_files')
            .select('*')
            .eq('id', id)
            .eq('user_id', userId)
            .single();

        if (!file) {
            return new NextResponse('File not found', 404);
        }

        const rawUrl = `https://raw.githubusercontent.com/${githubAccount.github_username}/${githubAccount.repo_name}/main/${file.github_path}`;

        const githubResponse = await fetch(rawUrl, {
            headers: {
                Authorization: `token ${githubAccount.access_token}`,
            },
        });

        if (!githubResponse.ok) {
            return new NextResponse('Failed to fetch from GitHub', { status: githubResponse.status });
        }

        // Forward the response content and type to the client
        const contentType = githubResponse.headers.get('content-type') || 'application/octet-stream';

        // Return image proxy stream
        return new NextResponse(githubResponse.body, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=86400',
            },
        });
    } catch (err) {
        console.error('Proxy error:', err);
        return new NextResponse('Internal server error', { status: 500 });
    }
}
