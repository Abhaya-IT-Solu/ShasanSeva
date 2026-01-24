import { Router } from 'express';
import { z } from 'zod';
import { db, schemes } from '@shasansetu/db';
import { eq, and, ilike, or } from 'drizzle-orm';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware';
import { validateBody, validateQuery } from '../middleware/validation.middleware';
import { successResponse, errorResponse, ErrorCodes, logger } from '../lib/utils';

const router = Router();

// Validation schemas
const createSchemeSchema = z.object({
    name: z.string().min(3).max(255),
    slug: z.string().min(3).max(255).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
    description: z.string().optional(),
    category: z.enum(['STUDENT', 'FARMER', 'LOAN']),
    schemeType: z.enum(['GOVERNMENT', 'PRIVATE']),
    eligibility: z.string().optional(),
    benefits: z.string().optional(),
    requiredDocs: z.array(z.object({
        type: z.string(),
        label: z.string(),
        required: z.boolean(),
        description: z.string().optional(),
    })).default([]),
    serviceFee: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid fee format'),
    status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});

const updateSchemeSchema = createSchemeSchema.partial();

const schemeFiltersSchema = z.object({
    category: z.enum(['STUDENT', 'FARMER', 'LOAN']).optional(),
    schemeType: z.enum(['GOVERNMENT', 'PRIVATE']).optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
    search: z.string().optional(),
});

/**
 * GET /api/schemes
 * List all active schemes (public)
 */
router.get('/', validateQuery(schemeFiltersSchema), async (req, res) => {
    try {
        const { category, schemeType, status, search } = req.query as z.infer<typeof schemeFiltersSchema>;

        // Build conditions
        const conditions: any[] = [];

        // For public access, only show active schemes unless admin
        const authHeader = req.headers.authorization;
        let isAdmin = false;

        if (authHeader) {
            // Check if admin (simplified check)
            // In production, properly verify token
            isAdmin = true; // Will be set by middleware in admin routes
        }

        if (!isAdmin) {
            conditions.push(eq(schemes.status, 'ACTIVE'));
        } else if (status) {
            conditions.push(eq(schemes.status, status));
        }

        if (category) {
            conditions.push(eq(schemes.category, category));
        }

        if (schemeType) {
            conditions.push(eq(schemes.schemeType, schemeType));
        }

        if (search) {
            conditions.push(
                or(
                    ilike(schemes.name, `%${search}%`),
                    ilike(schemes.description, `%${search}%`)
                )
            );
        }

        const result = await db.select({
            id: schemes.id,
            name: schemes.name,
            slug: schemes.slug,
            description: schemes.description,
            category: schemes.category,
            schemeType: schemes.schemeType,
            serviceFee: schemes.serviceFee,
            status: schemes.status,
        })
            .from(schemes)
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(schemes.name);

        return res.json(successResponse(result));
    } catch (error) {
        logger.error('List schemes error', error);
        return res.status(500).json(
            errorResponse({
                code: ErrorCodes.INTERNAL_ERROR,
                message: 'Failed to fetch schemes',
            })
        );
    }
});

/**
 * GET /api/schemes/:slug
 * Get scheme details by slug (public)
 */
router.get('/:slug', async (req, res) => {
    try {
        const { slug } = req.params;

        const result = await db.select()
            .from(schemes)
            .where(eq(schemes.slug, slug));

        if (result.length === 0) {
            return res.status(404).json(
                errorResponse({
                    code: ErrorCodes.NOT_FOUND,
                    message: 'Scheme not found',
                })
            );
        }

        const scheme = result[0];

        // Don't show inactive schemes to non-admins
        const authHeader = req.headers.authorization;
        if (!authHeader && scheme.status === 'INACTIVE') {
            return res.status(404).json(
                errorResponse({
                    code: ErrorCodes.NOT_FOUND,
                    message: 'Scheme not found',
                })
            );
        }

        return res.json(successResponse(scheme));
    } catch (error) {
        logger.error('Get scheme error', error);
        return res.status(500).json(
            errorResponse({
                code: ErrorCodes.INTERNAL_ERROR,
                message: 'Failed to fetch scheme',
            })
        );
    }
});

/**
 * POST /api/schemes
 * Create new scheme (admin only)
 */
router.post('/', authMiddleware, adminMiddleware, validateBody(createSchemeSchema), async (req, res) => {
    try {
        const data = req.body;
        const adminId = req.user!.userId;

        // Check if slug already exists
        const existing = await db.select({ id: schemes.id })
            .from(schemes)
            .where(eq(schemes.slug, data.slug));

        if (existing.length > 0) {
            return res.status(400).json(
                errorResponse({
                    code: ErrorCodes.VALIDATION_ERROR,
                    message: 'Scheme with this slug already exists',
                })
            );
        }

        const result = await db.insert(schemes).values({
            ...data,
            createdBy: adminId,
        }).returning();

        logger.info('Scheme created', { schemeId: result[0].id, adminId });

        return res.status(201).json(successResponse(result[0]));
    } catch (error) {
        logger.error('Create scheme error', error);
        return res.status(500).json(
            errorResponse({
                code: ErrorCodes.INTERNAL_ERROR,
                message: 'Failed to create scheme',
            })
        );
    }
});

/**
 * PATCH /api/schemes/:id
 * Update scheme (admin only)
 */
router.patch('/:id', authMiddleware, adminMiddleware, validateBody(updateSchemeSchema), async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Check if scheme exists
        const existing = await db.select()
            .from(schemes)
            .where(eq(schemes.id, id));

        if (existing.length === 0) {
            return res.status(404).json(
                errorResponse({
                    code: ErrorCodes.NOT_FOUND,
                    message: 'Scheme not found',
                })
            );
        }

        // If updating slug, check uniqueness
        if (updates.slug && updates.slug !== existing[0].slug) {
            const slugExists = await db.select({ id: schemes.id })
                .from(schemes)
                .where(eq(schemes.slug, updates.slug));

            if (slugExists.length > 0) {
                return res.status(400).json(
                    errorResponse({
                        code: ErrorCodes.VALIDATION_ERROR,
                        message: 'Scheme with this slug already exists',
                    })
                );
            }
        }

        const result = await db.update(schemes)
            .set({
                ...updates,
                updatedAt: new Date(),
            })
            .where(eq(schemes.id, id))
            .returning();

        logger.info('Scheme updated', { schemeId: id });

        return res.json(successResponse(result[0]));
    } catch (error) {
        logger.error('Update scheme error', error);
        return res.status(500).json(
            errorResponse({
                code: ErrorCodes.INTERNAL_ERROR,
                message: 'Failed to update scheme',
            })
        );
    }
});

/**
 * DELETE /api/schemes/:id
 * Delete scheme (admin only) - soft delete by setting INACTIVE
 */
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        // Check if scheme exists
        const existing = await db.select()
            .from(schemes)
            .where(eq(schemes.id, id));

        if (existing.length === 0) {
            return res.status(404).json(
                errorResponse({
                    code: ErrorCodes.NOT_FOUND,
                    message: 'Scheme not found',
                })
            );
        }

        // Soft delete - set status to INACTIVE
        await db.update(schemes)
            .set({
                status: 'INACTIVE',
                updatedAt: new Date(),
            })
            .where(eq(schemes.id, id));

        logger.info('Scheme deactivated', { schemeId: id });

        return res.json(successResponse({ message: 'Scheme deactivated successfully' }));
    } catch (error) {
        logger.error('Delete scheme error', error);
        return res.status(500).json(
            errorResponse({
                code: ErrorCodes.INTERNAL_ERROR,
                message: 'Failed to delete scheme',
            })
        );
    }
});

export default router;
