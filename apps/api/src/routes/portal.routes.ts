import { Router } from 'express';
import { z } from 'zod';
import { db, schemes } from '@shasansetu/db';
import { eq } from 'drizzle-orm';
import { validateBody } from '../middleware/validation.middleware.js';
import { portalAuthMiddleware } from '../middleware/portal.middleware.js';
import { authRateLimiter } from '../middleware/rateLimit.middleware.js';
import { successResponse, errorResponse, ErrorCodes, logger } from '../lib/utils.js';
import { invalidateSchemeCache } from '../lib/redis.js';
import { authenticatePortalUser, createPortalToken } from '../services/portal.service.js';

const router: Router = Router();

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------
const loginSchema = z.object({
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(1, 'Password is required'),
});

const customFieldSchema = z.object({
    id: z.string().min(1, 'Field ID is required').regex(/^[a-z0-9_]+$/, 'Field ID must be lowercase letters, numbers, or underscores'),
    type: z.enum(['text', 'number', 'date', 'select', 'textarea', 'email', 'phone']),
    label: z.string().min(1, 'Label is required'),
    label_mr: z.string().optional(),
    required: z.boolean(),
    placeholder: z.string().optional(),
    placeholder_mr: z.string().optional(),
    options: z.array(z.object({
        label: z.string(),
        label_mr: z.string().optional(),
        value: z.string(),
    })).optional(),
    validationRegex: z.string().optional(),
});

const updateCustomFieldsSchema = z.object({
    customFields: z.array(customFieldSchema),
});

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

/**
 * POST /api/portal/auth/login
 * Authenticate a developer against the env-configured credentials.
 */
router.post('/auth/login', authRateLimiter, validateBody(loginSchema), async (req, res) => {
    try {
        const { username, password } = req.body;

        const ok = await authenticatePortalUser(username, password);
        if (!ok) {
            return res.status(401).json(
                errorResponse({
                    code: ErrorCodes.UNAUTHORIZED,
                    message: 'Invalid username or password',
                })
            );
        }

        const token = createPortalToken(username);
        logger.info('Portal login', { username });

        return res.json(successResponse({ token, username }));
    } catch (error) {
        logger.error('Portal login error', error);
        return res.status(500).json(
            errorResponse({ code: ErrorCodes.INTERNAL_ERROR, message: 'Login failed' })
        );
    }
});

/**
 * GET /api/portal/auth/me
 * Returns the current portal user (used by the portal client to verify its token).
 */
router.get('/auth/me', portalAuthMiddleware, (req, res) => {
    return res.json(successResponse({ username: req.portalUser!.username }));
});

// ---------------------------------------------------------------------------
// Schemes + custom forms
// ---------------------------------------------------------------------------

/**
 * GET /api/portal/schemes
 * List all schemes (active + inactive) with a custom-field count for navigation.
 */
router.get('/schemes', portalAuthMiddleware, async (_req, res) => {
    try {
        const result = await db.select({
            id: schemes.id,
            slug: schemes.slug,
            name: schemes.name,
            category: schemes.category,
            status: schemes.status,
            customFields: schemes.customFields,
        })
            .from(schemes)
            .orderBy(schemes.name);

        const data = result.map((s: typeof result[number]) => ({
            id: s.id,
            slug: s.slug,
            name: s.name,
            category: s.category,
            status: s.status,
            fieldCount: Array.isArray(s.customFields) ? s.customFields.length : 0,
        }));

        return res.json(successResponse(data));
    } catch (error) {
        logger.error('Portal list schemes error', error);
        return res.status(500).json(
            errorResponse({ code: ErrorCodes.INTERNAL_ERROR, message: 'Failed to fetch schemes' })
        );
    }
});

/**
 * GET /api/portal/schemes/:id
 * Get a single scheme with its current custom fields.
 */
router.get('/schemes/:id', portalAuthMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.select({
            id: schemes.id,
            slug: schemes.slug,
            name: schemes.name,
            category: schemes.category,
            status: schemes.status,
            customFields: schemes.customFields,
        })
            .from(schemes)
            .where(eq(schemes.id, id));

        if (result.length === 0) {
            return res.status(404).json(
                errorResponse({ code: ErrorCodes.NOT_FOUND, message: 'Scheme not found' })
            );
        }

        return res.json(successResponse(result[0]));
    } catch (error) {
        logger.error('Portal get scheme error', error);
        return res.status(500).json(
            errorResponse({ code: ErrorCodes.INTERNAL_ERROR, message: 'Failed to fetch scheme' })
        );
    }
});

/**
 * PATCH /api/portal/schemes/:id/custom-fields
 * Replace the custom-field definitions for a scheme. This is the ONLY write path
 * for custom forms — the admin panel no longer touches them.
 */
router.patch('/schemes/:id/custom-fields', portalAuthMiddleware, validateBody(updateCustomFieldsSchema), async (req, res) => {
    try {
        const { id } = req.params;
        const { customFields } = req.body as z.infer<typeof updateCustomFieldsSchema>;

        const existing = await db.select({ id: schemes.id })
            .from(schemes)
            .where(eq(schemes.id, id));

        if (existing.length === 0) {
            return res.status(404).json(
                errorResponse({ code: ErrorCodes.NOT_FOUND, message: 'Scheme not found' })
            );
        }

        // Reject duplicate field IDs — they would collide in application_form_data
        const fieldIds = customFields.map(f => f.id);
        if (new Set(fieldIds).size !== fieldIds.length) {
            return res.status(400).json(
                errorResponse({ code: ErrorCodes.VALIDATION_ERROR, message: 'Duplicate field IDs are not allowed' })
            );
        }

        const result = await db.update(schemes)
            .set({ customFields, updatedAt: new Date() })
            .where(eq(schemes.id, id))
            .returning();

        // Invalidate cache so the public apply flow picks up the new fields
        await invalidateSchemeCache();

        logger.info('Portal updated custom fields', {
            schemeId: id,
            count: customFields.length,
            by: req.portalUser!.username,
        });

        return res.json(successResponse(result[0]));
    } catch (error) {
        logger.error('Portal update custom fields error', error);
        return res.status(500).json(
            errorResponse({ code: ErrorCodes.INTERNAL_ERROR, message: 'Failed to update custom fields' })
        );
    }
});

export default router;
