import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { errorResponse, successResponse } from '@/lib/auth';

/**
 * POST /api/auth/login
 * Login user via Supabase Auth.
 */
export async function POST(request: NextRequest) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return errorResponse('Email and password are required', 400);
        }

        const { data, error } = await supabaseAdmin.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            return errorResponse(error.message, 401);
        }

        return successResponse({
            user: {
                id: data.user.id,
                email: data.user.email,
            },
            session: {
                access_token: data.session?.access_token,
                refresh_token: data.session?.refresh_token,
            },
        });
    } catch (err) {
        console.error('Login error:', err);
        return errorResponse('Internal server error', 500);
    }
}
