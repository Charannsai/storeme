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
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

        if (error || !user) {
            return null;
        }

        return user;
    } catch {
        return null;
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
