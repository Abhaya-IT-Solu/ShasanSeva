import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { db, users, admins } from '@shasansetu/db';
import { eq } from 'drizzle-orm';
import { redis, REDIS_KEYS, REDIS_TTL } from '../lib/redis';
import { logger } from '../lib/utils';
import type { AuthSession, UserProfile, AdminProfile } from '@shasansetu/types';

interface JwtPayload {
    userId: string;
    userType: 'USER' | 'ADMIN';
    role?: string;
}

/**
 * Find or create a user by phone number
 */
export async function findOrCreateUser(phone: string): Promise<UserProfile> {
    // Check if user exists
    const existingUsers = await db.select().from(users).where(eq(users.phone, phone));

    if (existingUsers.length > 0) {
        const user = existingUsers[0];
        return {
            id: user.id,
            phone: user.phone,
            email: user.email || undefined,
            name: user.name || undefined,
            category: user.category || undefined,
            profileComplete: user.profileComplete || false,
            address: user.address || undefined,
            createdAt: user.createdAt.toISOString(),
        };
    }

    // Create new user
    const newUsers = await db.insert(users).values({
        phone,
        profileComplete: false,
    }).returning();

    const newUser = newUsers[0];
    logger.info('New user created', { userId: newUser.id, phone });

    return {
        id: newUser.id,
        phone: newUser.phone,
        email: undefined,
        name: undefined,
        category: undefined,
        profileComplete: false,
        createdAt: newUser.createdAt.toISOString(),
    };
}

/**
 * Find or create a user by email (for Google OAuth)
 */
export async function findOrCreateUserByEmail(
    email: string,
    name?: string,
    authProvider: string = 'GOOGLE'
): Promise<UserProfile> {
    // Check if user exists by email
    const existingUsers = await db.select().from(users).where(eq(users.email, email));

    if (existingUsers.length > 0) {
        const user = existingUsers[0];
        return {
            id: user.id,
            phone: user.phone,
            email: user.email || undefined,
            name: user.name || undefined,
            category: user.category || undefined,
            profileComplete: user.profileComplete || false,
            address: user.address || undefined,
            createdAt: user.createdAt.toISOString(),
        };
    }

    // Create new user with email
    const newUsers = await db.insert(users).values({
        phone: '', // Empty phone for OAuth users, they'll need to add it later
        email,
        name: name || undefined,
        profileComplete: false,
    }).returning();

    const newUser = newUsers[0];
    logger.info('New user created via OAuth', { userId: newUser.id, email, authProvider });

    return {
        id: newUser.id,
        phone: newUser.phone,
        email: newUser.email || undefined,
        name: newUser.name || undefined,
        category: undefined,
        profileComplete: false,
        createdAt: newUser.createdAt.toISOString(),
    };
}

/**
 * Find admin by phone number
 */
export async function findAdminByPhone(phone: string): Promise<AdminProfile | null> {
    const existingAdmins = await db.select().from(admins).where(eq(admins.phone, phone));

    if (existingAdmins.length === 0) {
        return null;
    }

    const admin = existingAdmins[0];

    if (!admin.isActive) {
        logger.warn('Inactive admin attempted login', { adminId: admin.id, phone });
        return null;
    }

    return {
        id: admin.id,
        phone: admin.phone,
        email: admin.email || undefined,
        name: admin.name,
        role: admin.role as 'ADMIN' | 'SUPER_ADMIN',
        isActive: admin.isActive || true,
        createdAt: admin.createdAt.toISOString(),
    };
}

/**
 * Create JWT token for authenticated user/admin
 */
export function createToken(userId: string, userType: 'USER' | 'ADMIN', role?: string): string {
    const payload: JwtPayload = { userId, userType, role };

    return jwt.sign(payload, env.JWT_SECRET || 'dev-secret', {
        expiresIn: env.JWT_EXPIRES_IN || '7d',
    });
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): JwtPayload | null {
    try {
        return jwt.verify(token, env.JWT_SECRET || 'dev-secret') as JwtPayload;
    } catch {
        return null;
    }
}

/**
 * Create and store session
 */
export async function createSession(
    userId: string,
    userType: 'USER' | 'ADMIN',
    profile: UserProfile | AdminProfile
): Promise<string> {
    const token = createToken(userId, userType, userType === 'ADMIN' ? (profile as AdminProfile).role : undefined);

    const session: AuthSession = {
        userId,
        userType,
        role: userType === 'ADMIN' ? (profile as AdminProfile).role : undefined,
        phone: profile.phone,
        email: profile.email,
        name: profile.name,
        expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
    };

    // Store session in Redis
    await redis.set(REDIS_KEYS.SESSION(userId), JSON.stringify(session), { ex: REDIS_TTL.SESSION });

    logger.info('Session created', { userId, userType });
    return token;
}

/**
 * Validate session from Redis
 */
export async function validateSession(userId: string): Promise<AuthSession | null> {
    const sessionData = await redis.get<string>(REDIS_KEYS.SESSION(userId));

    if (!sessionData) {
        return null;
    }

    const session: AuthSession = typeof sessionData === 'string'
        ? JSON.parse(sessionData)
        : sessionData;

    // Check if expired
    if (session.expiresAt < Date.now()) {
        await redis.del(REDIS_KEYS.SESSION(userId));
        return null;
    }

    return session;
}

/**
 * Invalidate session (logout)
 */
export async function invalidateSession(userId: string): Promise<void> {
    await redis.del(REDIS_KEYS.SESSION(userId));
    logger.info('Session invalidated', { userId });
}
