import { NextRequest } from 'next/server';
import { errorResponse, successResponse } from '@/lib/auth';

/**
 * GET /api/github/callback
 * Handles the GitHub OAuth callback, exchanges code for access token.
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const code = searchParams.get('code');
        const state = searchParams.get('state'); // user_id encoded

        if (!code) {
            return errorResponse('No authorization code provided', 400);
        }

        // Exchange code for access token
        const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                client_id: process.env.GITHUB_CLIENT_ID,
                client_secret: process.env.GITHUB_CLIENT_SECRET,
                code,
                redirect_uri: process.env.GITHUB_REDIRECT_URI,
            }),
        });

        const tokenData = await tokenResponse.json();

        if (tokenData.error) {
            return errorResponse(`GitHub OAuth error: ${tokenData.error_description}`, 400);
        }

        const accessToken = tokenData.access_token;

        // Redirect to app with the token 
        // The mobile app or web dashboard will then call POST /api/github/connect
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const redirectUrl = `${appUrl}/github/callback?access_token=${accessToken}&state=${state || ''}`;

        return Response.redirect(redirectUrl, 302);
    } catch (err) {
        console.error('GitHub callback error:', err);
        return errorResponse('Internal server error', 500);
    }
}
