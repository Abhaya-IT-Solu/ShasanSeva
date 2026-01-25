import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
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

const SALT_ROUNDS = 10;

// Password validation: 8+ chars, must include at least one number
export function validatePassword(password: string): { valid: boolean; error?: string } {
    if (password.length < 8) {
        return { valid: false, error: 'Password must be at least 8 characters' };
    }
    if (!/\d/.test(password)) {
        return { valid: false, error: 'Password must include at least one number' };
    }
    return { valid: true };
}

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

/**
 * Register a new user with phone and password
 */
export async function registerUser(
    phone: string,
    password: string,
    name?: string
): Promise<{ success: true; user: UserProfile } | { success: false; error: string }> {
    // Check if user exists
    const existingUsers = await db.select().from(users).where(eq(users.phone, phone));

    if (existingUsers.length > 0) {
        return { success: false, error: 'Phone number already registered' };
    }

    // Validate password
    const validation = validatePassword(password);
    if (!validation.valid) {
        return { success: false, error: validation.error! };
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);

    const newUsers = await db.insert(users).values({
        phone,
        name: name || undefined,
        passwordHash,
        profileComplete: false,
    }).returning();

    const newUser = newUsers[0];
    logger.info('New user registered', { userId: newUser.id, phone });

    return {
        success: true,
        user: {
            id: newUser.id,
            phone: newUser.phone,
            email: undefined,
            name: newUser.name || undefined,
            category: undefined,
            profileComplete: false,
            createdAt: newUser.createdAt.toISOString(),
        },
    };
}

/**
 * Authenticate user with phone and password
 */
export async function authenticateUser(
    phone: string,
    password: string
): Promise<{ success: true; user: UserProfile; isAdmin: false } | { success: true; admin: AdminProfile; isAdmin: true } | { success: false; error: string }> {
    // Check admin first
    const existingAdmins = await db.select().from(admins).where(eq(admins.phone, phone));

    if (existingAdmins.length > 0) {
        const admin = existingAdmins[0];

        if (!admin.isActive) {
            return { success: false, error: 'Account is deactivated' };
        }

        if (!admin.passwordHash) {
            return { success: false, error: 'Password not set. Please contact support.' };
        }

        const isValid = await verifyPassword(password, admin.passwordHash);
        if (!isValid) {
            return { success: false, error: 'Invalid phone or password' };
        }

        return {
            success: true,
            isAdmin: true,
            admin: {
                id: admin.id,
                phone: admin.phone,
                email: admin.email || undefined,
                name: admin.name,
                role: admin.role as 'ADMIN' | 'SUPER_ADMIN',
                isActive: admin.isActive || true,
                createdAt: admin.createdAt.toISOString(),
            },
        };
    }

    // Check user
    const existingUsers = await db.select().from(users).where(eq(users.phone, phone));

    if (existingUsers.length === 0) {
        return { success: false, error: 'Invalid phone or password' };
    }

    const user = existingUsers[0];

    if (!user.passwordHash) {
        return { success: false, error: 'Password not set. Please register again.' };
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
        return { success: false, error: 'Invalid phone or password' };
    }

    return {
        success: true,
        isAdmin: false,
        user: {
            id: user.id,
            phone: user.phone,
            email: user.email || undefined,
            name: user.name || undefined,
            category: user.category || undefined,
            profileComplete: user.profileComplete || false,
            address: user.address || undefined,
            createdAt: user.createdAt.toISOString(),
        },
    };
}

/**
 * Update user password
 */
export async function updateUserPassword(
    userId: string,
    userType: 'USER' | 'ADMIN',
    oldPassword: string,
    newPassword: string
): Promise<{ success: boolean; error?: string }> {
    // Validate new password
    const validation = validatePassword(newPassword);
    if (!validation.valid) {
        return { success: false, error: validation.error };
    }

    if (userType === 'ADMIN') {
        const existingAdmins = await db.select().from(admins).where(eq(admins.id, userId));
        if (existingAdmins.length === 0) {
            return { success: false, error: 'Admin not found' };
        }

        const admin = existingAdmins[0];
        if (admin.passwordHash) {
            const isValid = await verifyPassword(oldPassword, admin.passwordHash);
            if (!isValid) {
                return { success: false, error: 'Current password is incorrect' };
            }
        }

        const newHash = await hashPassword(newPassword);
        await db.update(admins).set({ passwordHash: newHash, updatedAt: new Date() }).where(eq(admins.id, userId));
    } else {
        const existingUsers = await db.select().from(users).where(eq(users.id, userId));
        if (existingUsers.length === 0) {
            return { success: false, error: 'User not found' };
        }

        const user = existingUsers[0];
        if (user.passwordHash) {
            const isValid = await verifyPassword(oldPassword, user.passwordHash);
            if (!isValid) {
                return { success: false, error: 'Current password is incorrect' };
            }
        }

        const newHash = await hashPassword(newPassword);
        await db.update(users).set({ passwordHash: newHash, updatedAt: new Date() }).where(eq(users.id, userId));
    }

    logger.info('Password updated', { userId, userType });
    return { success: true };
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

    // Cast expiresIn to string to satisfy jsonwebtoken types
    return jwt.sign(payload, env.JWT_SECRET || 'dev-secret', {
        expiresIn: String(env.JWT_EXPIRES_IN || '7d'),
    } as jwt.SignOptions);
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
