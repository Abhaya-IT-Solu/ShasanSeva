import { Router } from 'express';
import { z } from 'zod';
import { db, schemes, schemeTranslations } from '@shasansetu/db';
import { eq, and } from 'drizzle-orm';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware.js';
import { validateBody, validateQuery } from '../middleware/validation.middleware.js';
import { successResponse, errorResponse, ErrorCodes, logger } from '../lib/utils.js';
import { redis, REDIS_KEYS, REDIS_TTL, invalidateSchemeCache } from '../lib/redis.js';

const router: Router = Router();

// Translation schema
const translationSchema = z.object({
    name: z.string().min(1).max(255),
    description: z.string().optional(),
    eligibility: z.string().optional(),
    benefits: z.string().optional(),
});

// Validation schemas
const createSchemeSchema = z.object({
    slug: z.string().min(3).max(255).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
    category: z.enum(['STUDENT', 'FARMER', 'LOAN', 'CERTIFICATE', 'JOBS', 'OTHER', 'HEALTH']),
    schemeType: z.enum(['GOVERNMENT', 'PRIVATE']),
    requiredDocs: z.array(z.object({
        type: z.string(),
        label: z.string(),
        label_mr: z.string().optional(),
        required: z.boolean(),
        description: z.string().optional(),
        description_mr: z.string().optional(),
    })).default([]),
    serviceFee: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid fee format'),
    status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
    // Translations
    translations: z.object({
        en: translationSchema,
        mr: translationSchema.optional(),
    }),
});

const updateSchemeSchema = z.object({
    slug: z.string().min(3).max(255).regex(/^[a-z0-9-]+$/).optional(),
    category: z.enum(['STUDENT', 'FARMER', 'LOAN', 'CERTIFICATE', 'JOBS', 'OTHER', 'HEALTH']).optional(),
    schemeType: z.enum(['GOVERNMENT', 'PRIVATE']).optional(),
    requiredDocs: z.array(z.object({
        type: z.string(),
        label: z.string(),
        label_mr: z.string().optional(),
        required: z.boolean(),
        description: z.string().optional(),
        description_mr: z.string().optional(),
    })).optional(),
    serviceFee: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
    translations: z.object({
        en: translationSchema.optional(),
        mr: translationSchema.optional(),
    }).optional(),
});

const schemeFiltersSchema = z.object({
    category: z.enum(['STUDENT', 'FARMER', 'LOAN', 'CERTIFICATE', 'JOBS', 'OTHER', 'HEALTH']).optional(),
    schemeType: z.enum(['GOVERNMENT', 'PRIVATE']).optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
    search: z.string().optional(),
    locale: z.enum(['en', 'mr']).default('en').optional(),
});

/**
 * GET /api/schemes
 * List all active schemes (public)
 */
router.get('/', validateQuery(schemeFiltersSchema), async (req, res) => {
    try {
        const { category, schemeType, status, search, locale = 'en' } = req.query as z.infer<typeof schemeFiltersSchema>;

        // Build conditions
        const conditions: any[] = [];

        // For public access, only show active schemes unless admin
        const authHeader = req.headers.authorization;
        let isAdmin = false;

        if (authHeader) {
            isAdmin = true;
        }

        // Only use cache for non-admin public requests without search
        const useCache = !isAdmin && !search && !status;

        if (useCache) {
            const cacheKey = REDIS_KEYS.SCHEMES_LIST(locale || 'en', category);
            try {
                const cached = await redis.get(cacheKey);
                if (cached) {
                    logger.info('Cache hit for schemes list', { locale, category });
                    return res.json(successResponse(cached));
                }
            } catch (cacheError: unknown) {
                logger.warn('Redis cache read failed', cacheError as Record<string, unknown>);
            }
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

        // Get schemes with translations
        const result = await db.select({
            id: schemes.id,
            slug: schemes.slug,
            category: schemes.category,
            schemeType: schemes.schemeType,
            serviceFee: schemes.serviceFee,
            status: schemes.status,
            // Translation fields
            name: schemeTranslations.name,
            description: schemeTranslations.description,
        })
            .from(schemes)
            .leftJoin(schemeTranslations, and(
                eq(schemes.id, schemeTranslations.schemeId),
                eq(schemeTranslations.locale, locale || 'en')
            ))
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(schemeTranslations.name);

        // Filter by search on translated name/description
        let filteredResult = result;
        if (search) {
            const searchLower = search.toLowerCase();
            filteredResult = result.filter((s: typeof result[number]) =>
                s.name?.toLowerCase().includes(searchLower) ||
                s.description?.toLowerCase().includes(searchLower)
            );
        }

        // Cache the result for public requests
        if (useCache && filteredResult.length > 0) {
            const cacheKey = REDIS_KEYS.SCHEMES_LIST(locale || 'en', category);
            try {
                await redis.set(cacheKey, JSON.stringify(filteredResult), { ex: REDIS_TTL.SCHEMES_LIST });
                logger.info('Cached schemes list', { locale, category, count: filteredResult.length });
            } catch (cacheError: unknown) {
                logger.warn('Redis cache write failed', cacheError as Record<string, unknown>);
            }
        }

        return res.json(successResponse(filteredResult));
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
 * GET /api/schemes/by-id/:id
 * Get scheme by UUID with translations (for admin edit)
 */
router.get('/by-id/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Get base scheme
        const schemeResult = await db.select()
            .from(schemes)
            .where(eq(schemes.id, id));

        if (schemeResult.length === 0) {
            return res.status(404).json(
                errorResponse({
                    code: ErrorCodes.NOT_FOUND,
                    message: 'Scheme not found',
                })
            );
        }

        const scheme = schemeResult[0];

        // Get all translations
        const translationsResult = await db.select()
            .from(schemeTranslations)
            .where(eq(schemeTranslations.schemeId, id));

        // Format translations by locale
        const translations: Record<string, any> = {};
        for (const t of translationsResult) {
            translations[t.locale] = {
                name: t.name,
                description: t.description,
                eligibility: t.eligibility,
                benefits: t.benefits,
            };
        }

        // If no translations exist, use legacy fields from scheme table
        if (Object.keys(translations).length === 0 && scheme.name) {
            translations['en'] = {
                name: scheme.name,
                description: scheme.description,
                eligibility: scheme.eligibility,
                benefits: scheme.benefits,
            };
        }

        return res.json(successResponse({
            id: scheme.id,
            slug: scheme.slug,
            category: scheme.category,
            schemeType: scheme.schemeType,
            serviceFee: scheme.serviceFee,
            status: scheme.status,
            requiredDocs: scheme.requiredDocs,
            translations,
        }));
    } catch (error) {
        logger.error('Get scheme by ID error', error);
        return res.status(500).json(
            errorResponse({
                code: ErrorCodes.INTERNAL_ERROR,
                message: 'Failed to fetch scheme',
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
        const locale = (req.query.locale as string) || 'en';
        const authHeader = req.headers.authorization;
        const isAdmin = !!authHeader;

        // Try cache first for public requests
        if (!isAdmin) {
            const cacheKey = REDIS_KEYS.SCHEME_DETAIL(slug, locale);
            try {
                const cached = await redis.get(cacheKey);
                if (cached) {
                    logger.info('Cache hit for scheme detail', { slug, locale });
                    return res.json(successResponse(cached));
                }
            } catch (cacheError: unknown) {
                logger.warn('Redis cache read failed', cacheError as Record<string, unknown>);
            }
        }

        const result = await db.select({
            id: schemes.id,
            slug: schemes.slug,
            category: schemes.category,
            schemeType: schemes.schemeType,
            serviceFee: schemes.serviceFee,
            requiredDocs: schemes.requiredDocs,
            status: schemes.status,
            name: schemeTranslations.name,
            description: schemeTranslations.description,
            eligibility: schemeTranslations.eligibility,
            benefits: schemeTranslations.benefits,
        })
            .from(schemes)
            .leftJoin(schemeTranslations, and(
                eq(schemes.id, schemeTranslations.schemeId),
                eq(schemeTranslations.locale, locale)
            ))
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
        if (!isAdmin && scheme.status === 'INACTIVE') {
            return res.status(404).json(
                errorResponse({
                    code: ErrorCodes.NOT_FOUND,
                    message: 'Scheme not found',
                })
            );
        }

        // Transform requiredDocs based on locale
        const transformedDocs = (scheme.requiredDocs as any[])?.map((doc: any) => ({
            type: doc.type,
            label: locale === 'mr' && doc.label_mr ? doc.label_mr : doc.label,
            description: locale === 'mr' && doc.description_mr ? doc.description_mr : doc.description,
            required: doc.required,
        })) || [];

        const responseData = {
            ...scheme,
            requiredDocs: transformedDocs,
        };

        // Cache the result for public requests
        if (!isAdmin && scheme.status === 'ACTIVE') {
            const cacheKey = REDIS_KEYS.SCHEME_DETAIL(slug, locale);
            try {
                await redis.set(cacheKey, JSON.stringify(responseData), { ex: REDIS_TTL.SCHEME_DETAIL });
                logger.info('Cached scheme detail', { slug, locale });
            } catch (cacheError: unknown) {
                logger.warn('Redis cache write failed', cacheError as Record<string, unknown>);
            }
        }

        return res.json(successResponse(responseData));
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
 * Create new scheme with translations (admin only)
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

        // Insert base scheme (use English name for legacy field)
        const schemeResult = await db.insert(schemes).values({
            slug: data.slug,
            name: data.translations.en.name, // Legacy field
            description: data.translations.en.description,
            category: data.category,
            schemeType: data.schemeType,
            eligibility: data.translations.en.eligibility,
            benefits: data.translations.en.benefits,
            requiredDocs: data.requiredDocs,
            serviceFee: data.serviceFee,
            status: data.status,
            createdBy: adminId,
        }).returning();

        const schemeId = schemeResult[0].id;

        // Insert English translation
        await db.insert(schemeTranslations).values({
            schemeId,
            locale: 'en',
            name: data.translations.en.name,
            description: data.translations.en.description,
            eligibility: data.translations.en.eligibility,
            benefits: data.translations.en.benefits,
            translatedBy: adminId,
        });

        // Insert Marathi translation if provided
        if (data.translations.mr && data.translations.mr.name) {
            await db.insert(schemeTranslations).values({
                schemeId,
                locale: 'mr',
                name: data.translations.mr.name,
                description: data.translations.mr.description,
                eligibility: data.translations.mr.eligibility,
                benefits: data.translations.mr.benefits,
                translatedBy: adminId,
            });
        }

        logger.info('Scheme created with translations', { schemeId, adminId });

        // Invalidate cache
        await invalidateSchemeCache();

        return res.status(201).json(successResponse({
            ...schemeResult[0],
            translations: data.translations,
        }));
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
 * Update scheme with translations (admin only)
 */
router.patch('/:id', authMiddleware, adminMiddleware, validateBody(updateSchemeSchema), async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const adminId = req.user!.userId;

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

        // Prepare base scheme updates
        const schemeUpdates: any = {
            updatedAt: new Date(),
        };

        if (updates.slug) schemeUpdates.slug = updates.slug;
        if (updates.category) schemeUpdates.category = updates.category;
        if (updates.schemeType) schemeUpdates.schemeType = updates.schemeType;
        if (updates.requiredDocs) schemeUpdates.requiredDocs = updates.requiredDocs;
        if (updates.serviceFee) schemeUpdates.serviceFee = updates.serviceFee;
        if (updates.status) schemeUpdates.status = updates.status;

        // Update legacy fields from English translation
        if (updates.translations?.en) {
            if (updates.translations.en.name) schemeUpdates.name = updates.translations.en.name;
            if (updates.translations.en.description) schemeUpdates.description = updates.translations.en.description;
            if (updates.translations.en.eligibility) schemeUpdates.eligibility = updates.translations.en.eligibility;
            if (updates.translations.en.benefits) schemeUpdates.benefits = updates.translations.en.benefits;
        }

        // Update base scheme
        const result = await db.update(schemes)
            .set(schemeUpdates)
            .where(eq(schemes.id, id))
            .returning();

        // Handle translation updates
        if (updates.translations) {
            for (const [locale, translation] of Object.entries(updates.translations)) {
                if (!translation) continue;

                const t = translation as any;

                // Check if translation exists
                const existingTrans = await db.select()
                    .from(schemeTranslations)
                    .where(and(
                        eq(schemeTranslations.schemeId, id),
                        eq(schemeTranslations.locale, locale)
                    ));

                if (existingTrans.length > 0) {
                    // Update existing
                    await db.update(schemeTranslations)
                        .set({
                            name: t.name,
                            description: t.description,
                            eligibility: t.eligibility,
                            benefits: t.benefits,
                            translatedAt: new Date(),
                            translatedBy: adminId,
                        })
                        .where(and(
                            eq(schemeTranslations.schemeId, id),
                            eq(schemeTranslations.locale, locale)
                        ));
                } else if (t.name) {
                    // Insert new translation
                    await db.insert(schemeTranslations).values({
                        schemeId: id,
                        locale,
                        name: t.name,
                        description: t.description,
                        eligibility: t.eligibility,
                        benefits: t.benefits,
                        translatedBy: adminId,
                    });
                }
            }
        }

        logger.info('Scheme updated with translations', { schemeId: id });

        // Invalidate cache
        await invalidateSchemeCache();

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

        // Invalidate cache
        await invalidateSchemeCache();

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
