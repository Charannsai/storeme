import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthenticatedUser, errorResponse, successResponse } from '@/lib/auth';

/**
 * POST /api/auth/logout
 * Signs out the current user.
 */
export async function POST(request: NextRequest) {
    try {
        const user = await getAuthenticatedUser(request);

        if (!user) {
            return errorResponse('Unauthorized', 401);
        }

        // Revoke user's session
        await supabaseAdmin.auth.admin.signOut(
            request.headers.get('authorization')?.replace('Bearer ', '') || ''
        );

        return successResponse({ message: 'Logged out successfully' });
    } catch (err) {
        console.error('Logout error:', err);
        return errorResponse('Internal server error', 500);
    }
}
