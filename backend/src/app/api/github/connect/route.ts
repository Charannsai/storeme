import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthenticatedUser, errorResponse, successResponse } from '@/lib/auth';
import { getGitHubUser } from '@/lib/github';

/**
 * POST /api/github/connect
 * Stores the user's GitHub access token after OAuth flow.
 * 
 * Body: { access_token: string, repo_name?: string }
 */
export async function POST(request: NextRequest) {
    try {
        const user = await getAuthenticatedUser(request);

        if (!user) {
            return errorResponse('Unauthorized', 401);
        }

        const { access_token, repo_name = 'gallery-storage' } = await request.json();

        if (!access_token) {
            return errorResponse('GitHub access token is required', 400);
        }

        // Verify the token by fetching GitHub user info
        const githubUser = await getGitHubUser(access_token);

        if (!githubUser) {
            return errorResponse('Invalid GitHub access token', 400);
        }

        // Check if account already connected
        const { data: existing } = await supabaseAdmin
            .from('github_accounts')
            .select('id')
            .eq('user_id', user.id)
            .single();

        if (existing) {
            // Update existing connection
            const { error } = await supabaseAdmin
                .from('github_accounts')
                .update({
                    github_username: githubUser.login,
                    access_token,
                    repo_name,
                })
                .eq('user_id', user.id);

            if (error) {
                return errorResponse('Failed to update GitHub connection', 500);
            }
        } else {
            // Create new connection
            const { error } = await supabaseAdmin
                .from('github_accounts')
                .insert({
                    user_id: user.id,
                    github_username: githubUser.login,
                    access_token,
                    repo_name,
                });

            if (error) {
                return errorResponse('Failed to save GitHub connection', 500);
            }
        }

        return successResponse({
            github_username: githubUser.login,
            repo_name,
            message: 'GitHub account connected successfully',
        });
    } catch (err) {
        console.error('GitHub connect error:', err);
        return errorResponse('Internal server error', 500);
    }
}
