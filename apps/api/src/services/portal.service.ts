import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { env } from '../config/env.js';
import { logger } from '../lib/utils.js';

export interface PortalTokenPayload {
    username: string;
    type: 'PORTAL';
}

const PORTAL_SECRET = env.PORTAL_JWT_SECRET || 'dev-portal-secret';

/**
 * Parse the PORTAL_USERS env var into a { username -> bcryptHash } map.
 *
 * Format: "dev1:$2b$10$...,dev2:$2b$10$..."
 * A bcrypt hash never contains a comma, so entries are split on ','.
 * The hash also never contains ':', so the username is everything before the
 * FIRST ':' and the hash is the remainder.
 */
function getPortalUsers(): Record<string, string> {
    const raw = env.PORTAL_USERS;
    if (!raw) return {};

    const map: Record<string, string> = {};
    for (const entry of raw.split(',')) {
        const trimmed = entry.trim();
        if (!trimmed) continue;
        const idx = trimmed.indexOf(':');
        if (idx === -1) continue;
        const username = trimmed.slice(0, idx).trim();
        const hash = trimmed.slice(idx + 1).trim();
        if (username && hash) map[username] = hash;
    }
    return map;
}

/**
 * Whether any portal developer accounts are configured.
 */
export function isPortalConfigured(): boolean {
    return Object.keys(getPortalUsers()).length > 0;
}

/**
 * Verify a developer's username + password against the configured bcrypt hashes.
 */
export async function authenticatePortalUser(username: string, password: string): Promise<boolean> {
    const users = getPortalUsers();
    const hash = users[username];
    if (!hash) return false;

    try {
        return await bcrypt.compare(password, hash);
    } catch (err) {
        logger.error('Portal password comparison failed', err);
        return false;
    }
}

/**
 * Issue a portal JWT. Signed with a dedicated secret so portal tokens are not
 * interchangeable with user/admin tokens.
 */
export function createPortalToken(username: string): string {
    const payload: PortalTokenPayload = { username, type: 'PORTAL' };
    return jwt.sign(payload, PORTAL_SECRET, {
        expiresIn: String(env.PORTAL_TOKEN_EXPIRES_IN || '7d'),
    } as jwt.SignOptions);
}

/**
 * Verify a portal JWT. Returns null if invalid, expired, or not a portal token.
 */
export function verifyPortalToken(token: string): PortalTokenPayload | null {
    try {
        const decoded = jwt.verify(token, PORTAL_SECRET) as PortalTokenPayload;
        if (decoded.type !== 'PORTAL') return null;
        return decoded;
    } catch {
        return null;
    }
}
