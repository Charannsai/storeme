import { NextRequest } from 'next/server';
import { getAuthenticatedUser, getGitHubAccount, errorResponse, successResponse } from '@/lib/auth';
import { createStorageRepo } from '@/lib/github';

/**
 * POST /api/github/create-repo
 * Creates the user's private gallery-storage repository on GitHub.
 */
export async function POST(request: NextRequest) {
    try {
        const user = await getAuthenticatedUser(request);

        if (!user) {
            return errorResponse('Unauthorized', 401);
        }

        const githubAccount = await getGitHubAccount(user.id);

        if (!githubAccount) {
            return errorResponse('GitHub account not connected. Please connect your GitHub first.', 400);
        }

        try {
            const repo = await createStorageRepo(
                githubAccount.access_token,
                githubAccount.repo_name
            );

            return successResponse({
                repo_name: repo.name,
                full_name: repo.full_name,
                html_url: repo.html_url,
                message: 'Repository created and initialized successfully',
            }, 201);
        } catch (githubError: unknown) {
            const err = githubError as { status?: number; message?: string };
            if (err.status === 422) {
                return errorResponse('Repository already exists. You can continue using it.', 409);
            }
            throw githubError;
        }
    } catch (err) {
        console.error('Create repo error:', err);
        return errorResponse('Internal server error', 500);
    }
}
