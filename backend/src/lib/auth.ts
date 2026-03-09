import { NextRequest } from 'next/server';
import { supabaseAdmin } from './supabase';
import jwt from 'jsonwebtoken';

/**
 * Extract and validate the user from the Authorization header.
 * Returns the user object or null if unauthorized.
 */
export async function getAuthenticatedUser(request: NextRequest) {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.replace('Bearer ', '');

    try {
        const decoded = jwt.verify(
            token,
            process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET || ''
        ) as any;

        // Fetch user from DB using the subjective claims ID
        if (decoded && decoded.sub) {
            const { data: user } = await supabaseAdmin.auth.admin.getUserById(decoded.sub);
            return user?.user || null;
        }
        return null;
    } catch {
        return null; // Invalid token
    }
}

/**
 * Get the user's GitHub account info from the database.
 */
export async function getGitHubAccount(userId: string) {
    const { data, error } = await supabaseAdmin
        .from('github_accounts')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (error || !data) {
        return null;
    }

    return data;
}

/**
 * Helper to create a JSON error response.
 */
export function errorResponse(message: string, status: number = 400) {
    return Response.json({ success: false, error: message }, { status });
}

/**
 * Helper to create a JSON success response.
 */
export function successResponse<T>(data: T, status: number = 200) {
    return Response.json({ success: true, data }, { status });
}
