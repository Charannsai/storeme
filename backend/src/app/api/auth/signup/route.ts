import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { errorResponse, successResponse } from '@/lib/auth';

/**
 * POST /api/auth/signup
 * Register a new user via Supabase Auth.
 */
export async function POST(request: NextRequest) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return errorResponse('Email and password are required', 400);
        }

        const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
        });

        if (error) {
            return errorResponse(error.message, 400);
        }

        // Also insert into our users table
        await supabaseAdmin.from('users').insert({
            id: data.user.id,
            email: data.user.email,
        });

        // Sign in to get tokens
        const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
            email,
            password,
        });

        if (signInError) {
            return errorResponse(signInError.message, 400);
        }

        return successResponse({
            user: {
                id: data.user.id,
                email: data.user.email,
            },
            session: {
                access_token: signInData.session?.access_token,
                refresh_token: signInData.session?.refresh_token,
            },
        }, 201);
    } catch (err) {
        console.error('Signup error:', err);
        return errorResponse('Internal server error', 500);
    }
}
