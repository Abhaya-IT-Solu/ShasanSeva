import admin from 'firebase-admin';
import { logger } from './utils.js';

let app: admin.app.App | null = null;

/**
 * Initialises Firebase Admin SDK lazily.
 * Reads credentials from FIREBASE_SERVICE_ACCOUNT_JSON env var (stringified JSON)
 * OR from individual FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY vars.
 */
export function getFirebaseAdmin(): admin.app.App {
    if (app) return app;

    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

    if (serviceAccountJson) {
        try {
            const serviceAccount = JSON.parse(serviceAccountJson);
            app = admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
        } catch {
            logger.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON');
            throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_JSON');
        }
    } else {
        // Individual environment variables
        const projectId = process.env.FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

        if (!projectId || !clientEmail || !privateKey) {
            throw new Error(
                'Firebase credentials not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON or ' +
                'FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY'
            );
        }

        app = admin.initializeApp({
            credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
        });
    }

    logger.info('Firebase Admin SDK initialised');
    return app;
}

/**
 * Verifies a Firebase ID token and returns the decoded payload.
 * Throws if the token is invalid or expired.
 */
export async function verifyFirebaseIdToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
    const firebase = getFirebaseAdmin();
    return firebase.auth().verifyIdToken(idToken);
}
