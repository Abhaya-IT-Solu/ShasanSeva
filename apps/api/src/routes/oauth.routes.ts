import { Router, Request, Response } from 'express';
import { env } from '../config/env';
import { createSession, findOrCreateUserByEmail } from '../services/auth.service';
import { logger } from '../lib/utils';

const router: Router = Router();

// Google OAuth URLs
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

interface GoogleTokenResponse {
    access_token?: string;
    error?: string;
}

interface GoogleUserInfo {
    email?: string;
    name?: string;
    picture?: string;
}

/**
 * GET /api/auth/google
 * Redirect to Google OAuth consent screen
 */
router.get('/google', (_req: Request, res: Response) => {
    const params = new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID || '',
        redirect_uri: env.GOOGLE_CALLBACK_URL || '',
        response_type: 'code',
        scope: 'openid email profile',
        access_type: 'offline',
        prompt: 'consent',
    });

    const authUrl = `${GOOGLE_AUTH_URL}?${params.toString()}`;
    res.redirect(authUrl);
});

/**
 * GET /api/auth/google/callback
 * Handle Google OAuth callback
 */
router.get('/google/callback', async (req: Request, res: Response) => {
    try {
        const { code, error } = req.query;

        if (error || !code) {
            logger.error('Google OAuth error', { error });
            return res.redirect(`${env.WEB_URL}/login?error=google_auth_failed`);
        }

        // Exchange code for tokens
        const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: env.GOOGLE_CLIENT_ID || '',
                client_secret: env.GOOGLE_CLIENT_SECRET || '',
                code: code as string,
                grant_type: 'authorization_code',
                redirect_uri: env.GOOGLE_CALLBACK_URL || '',
            }),
        });

        const tokenData = await tokenResponse.json() as GoogleTokenResponse;

        if (tokenData.error || !tokenData.access_token) {
            logger.error('Google token exchange failed', { error: tokenData.error });
            return res.redirect(`${env.WEB_URL}/login?error=google_token_failed`);
        }

        // Get user info from Google
        const userResponse = await fetch(GOOGLE_USERINFO_URL, {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
            },
        });

        const googleUser = await userResponse.json() as GoogleUserInfo;

        if (!googleUser.email) {
            logger.error('Google user info missing email');
            return res.redirect(`${env.WEB_URL}/login?error=google_email_required`);
        }

        // Find or create user by email
        const user = await findOrCreateUserByEmail(googleUser.email, googleUser.name, 'GOOGLE');

        // Create session
        const token = await createSession(user.id, 'USER', user);

        // Redirect to frontend with token
        const redirectUrl = user.profileComplete
            ? `${env.WEB_URL}/auth/callback?token=${token}`
            : `${env.WEB_URL}/auth/callback?token=${token}&complete_profile=true`;

        logger.info('Google OAuth login successful', { userId: user.id, email: googleUser.email });
        return res.redirect(redirectUrl);
    } catch (error) {
        logger.error('Google OAuth callback error', error);
        return res.redirect(`${env.WEB_URL}/login?error=google_auth_failed`);
    }
});

export default router;
