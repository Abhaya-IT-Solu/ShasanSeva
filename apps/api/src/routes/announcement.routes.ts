import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validation.middleware.js';
import { db, announcements, schemes } from '@shasansetu/db';
import { eq, asc } from 'drizzle-orm';
import { successResponse, errorResponse, ErrorCodes, logger } from '../lib/utils.js';
import { uploadBuffer, getDownloadUrl, getExtensionFromContentType, generateAnnouncementKey, deleteDocument } from '../services/r2.service.js';

const router: Router = Router();

// ---------- Validation Schemas ----------

const createAnnouncementSchema = z.object({
    type: z.enum(['MARQUEE', 'PILL', 'POPULAR_TAG', 'CAROUSEL']),
    title: z.string().min(1).max(255),
    description: z.string().max(500).optional(),
    link: z.string().max(500).optional(),
    imageKey: z.string().max(500).optional(),
    schemeId: z.string().uuid().optional(),
    isActive: z.boolean().optional().default(true),
    sortOrder: z.number().int().optional().default(0),
});

const updateAnnouncementSchema = z.object({
    type: z.enum(['MARQUEE', 'PILL', 'POPULAR_TAG', 'CAROUSEL']).optional(),
    title: z.string().min(1).max(255).optional(),
    description: z.string().max(500).nullable().optional(),
    link: z.string().max(500).nullable().optional(),
    imageKey: z.string().max(500).nullable().optional(),
    schemeId: z.string().uuid().nullable().optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().optional(),
});

// The image is proxied through the server as base64, the same way scheme logos
// are. See the upload route below for why it is not a presigned browser PUT.
const imageUploadSchema = z.object({
    contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
    fileData: z.string().min(1),
});

// ---------- Public Endpoint ----------

/**
 * GET /api/announcements/public
 * Public — returns active announcements grouped by type.
 * CAROUSEL items include scheme details (name, slug, category).
 */
router.get('/public', async (_req: Request, res: Response) => {
    try {
        const result = await db.select()
            .from(announcements)
            .where(eq(announcements.isActive, true))
            .orderBy(asc(announcements.sortOrder));

        // Enrich CAROUSEL items with scheme details
        const carouselItems = result.filter((a: typeof result[number]) => a.type === 'CAROUSEL');
        let enrichedCarousel: Array<Record<string, unknown>> = [];

        if (carouselItems.length > 0) {
            const schemeIds = carouselItems
                .map((a: typeof carouselItems[number]) => a.schemeId)
                .filter((id: string | null): id is string => id !== null);

            let schemeMap = new Map<string, { name: string; slug: string; category: string | null; description: string | null; serviceFee: string }>();

            if (schemeIds.length > 0) {
                const schemeResults = await db.select({
                    id: schemes.id,
                    name: schemes.name,
                    slug: schemes.slug,
                    category: schemes.category,
                    description: schemes.description,
                    serviceFee: schemes.serviceFee,
                }).from(schemes);

                for (const s of schemeResults) {
                    if (schemeIds.includes(s.id)) {
                        schemeMap.set(s.id, s);
                    }
                }
            }

            // Generate fresh download URLs for carousel images
            enrichedCarousel = await Promise.all(
                carouselItems.map(async (item: typeof carouselItems[number]) => {
                    let freshImageUrl: string | null = null;
                    if (item.imageKey) {
                        try {
                            const { downloadUrl } = await getDownloadUrl(item.imageKey);
                            freshImageUrl = downloadUrl;
                        } catch (error) {
                            logger.error('Failed to generate image URL for carousel', { id: item.id, error });
                        }
                    }

                    const scheme = item.schemeId ? schemeMap.get(item.schemeId) : null;

                    return {
                        id: item.id,
                        type: item.type,
                        title: item.title,
                        description: item.description,
                        link: item.link,
                        imageUrl: freshImageUrl,
                        sortOrder: item.sortOrder,
                        createdAt: item.createdAt,
                        scheme: scheme ? {
                            id: item.schemeId,
                            name: scheme.name,
                            slug: scheme.slug,
                            category: scheme.category,
                            description: scheme.description,
                            serviceFee: scheme.serviceFee,
                        } : null,
                    };
                })
            );
        }

        const grouped = {
            marquee: result.filter((a: typeof result[number]) => a.type === 'MARQUEE'),
            pills: result.filter((a: typeof result[number]) => a.type === 'PILL'),
            popularTags: result.filter((a: typeof result[number]) => a.type === 'POPULAR_TAG'),
            carousel: enrichedCarousel,
        };

        return res.json(successResponse(grouped));
    } catch (error) {
        logger.error('Failed to fetch public announcements', error);
        return res.status(500).json(
            errorResponse({
                code: ErrorCodes.INTERNAL_ERROR,
                message: 'Failed to fetch announcements',
            })
        );
    }
});

// ---------- Admin Endpoints ----------

/**
 * GET /api/announcements
 * Admin — list all announcements
 */
router.get('/', authMiddleware, adminMiddleware, async (_req: Request, res: Response) => {
    try {
        const result = await db.select()
            .from(announcements)
            .orderBy(asc(announcements.sortOrder));

        return res.json(successResponse(result));
    } catch (error) {
        logger.error('Failed to fetch announcements', error);
        return res.status(500).json(
            errorResponse({
                code: ErrorCodes.INTERNAL_ERROR,
                message: 'Failed to fetch announcements',
            })
        );
    }
});

/**
 * POST /api/announcements/upload-image
 * Admin — upload a carousel background image to R2.
 *
 * Accepts the file as base64 and writes it server-side, exactly like
 * POST /api/schemes/:id/upload-image. This used to hand the browser a presigned
 * URL to PUT directly to R2, which fails: the bucket has no CORS policy allowing
 * the admin origin, and the client never checked the PUT response — so the key
 * was saved on the announcement while the object was never written, and the
 * carousel rendered a broken image. Proxying keeps R2 credentials and CORS out
 * of the browser, and a failed write is a failed request.
 */
router.post('/upload-image', authMiddleware, adminMiddleware, validateBody(imageUploadSchema), async (req: Request, res: Response) => {
    try {
        const { contentType, fileData } = req.body;
        const fileExtension = getExtensionFromContentType(contentType);
        const key = generateAnnouncementKey(fileExtension);

        const buffer = Buffer.from(fileData, 'base64');
        if (buffer.length === 0) {
            return res.status(400).json(
                errorResponse({
                    code: ErrorCodes.VALIDATION_ERROR,
                    message: 'Image data is empty or not valid base64',
                })
            );
        }

        await uploadBuffer(key, buffer, contentType);

        logger.info('Carousel image uploaded', { key, size: buffer.length });

        return res.json(successResponse({ key }));
    } catch (error) {
        logger.error('Failed to upload carousel image', error);
        return res.status(500).json(
            errorResponse({
                code: ErrorCodes.INTERNAL_ERROR,
                message: 'Failed to upload image',
            })
        );
    }
});

/**
 * POST /api/announcements
 * Admin — create announcement
 */
router.post('/', authMiddleware, adminMiddleware, validateBody(createAnnouncementSchema), async (req: Request, res: Response) => {
    try {
        const { type, title, description, link, imageKey, schemeId, isActive, sortOrder } = req.body;

        // If CAROUSEL and schemeId provided, verify scheme exists
        if (type === 'CAROUSEL' && schemeId) {
            const schemeResult = await db.select({ id: schemes.id })
                .from(schemes)
                .where(eq(schemes.id, schemeId));

            if (schemeResult.length === 0) {
                return res.status(404).json(
                    errorResponse({
                        code: ErrorCodes.NOT_FOUND,
                        message: 'Scheme not found',
                    })
                );
            }
        }

        // If imageKey provided, generate download URL
        let imageUrl: string | null = null;
        if (imageKey) {
            try {
                const { downloadUrl } = await getDownloadUrl(imageKey);
                imageUrl = downloadUrl;
            } catch {
                // Non-blocking — URL will be generated on demand in public endpoint
            }
        }

        const result = await db.insert(announcements).values({
            type,
            title,
            description: description || null,
            link: link || null,
            imageKey: imageKey || null,
            imageUrl,
            schemeId: schemeId || null,
            isActive: isActive ?? true,
            sortOrder: sortOrder ?? 0,
        }).returning();

        logger.info('Announcement created', { id: result[0].id, type });

        return res.status(201).json(successResponse(result[0]));
    } catch (error) {
        logger.error('Failed to create announcement', error);
        return res.status(500).json(
            errorResponse({
                code: ErrorCodes.INTERNAL_ERROR,
                message: 'Failed to create announcement',
            })
        );
    }
});

/**
 * PATCH /api/announcements/:id
 * Admin — update announcement
 */
router.patch('/:id', authMiddleware, adminMiddleware, validateBody(updateAnnouncementSchema), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const updates = { ...req.body };

        // Guard: if no fields to update, return early
        if (Object.keys(updates).length === 0) {
            return res.status(400).json(
                errorResponse({
                    code: ErrorCodes.VALIDATION_ERROR,
                    message: 'No fields to update',
                })
            );
        }

        // Verify exists
        const existing = await db.select()
            .from(announcements)
            .where(eq(announcements.id, id));

        if (existing.length === 0) {
            return res.status(404).json(
                errorResponse({
                    code: ErrorCodes.NOT_FOUND,
                    message: 'Announcement not found',
                })
            );
        }

        // If schemeId is being set, verify scheme exists
        if (updates.schemeId) {
            const schemeResult = await db.select({ id: schemes.id })
                .from(schemes)
                .where(eq(schemes.id, updates.schemeId));

            if (schemeResult.length === 0) {
                return res.status(404).json(
                    errorResponse({
                        code: ErrorCodes.NOT_FOUND,
                        message: 'Scheme not found',
                    })
                );
            }
        }

        // If imageKey is being updated, generate new download URL
        if (updates.imageKey) {
            try {
                const { downloadUrl } = await getDownloadUrl(updates.imageKey);
                updates.imageUrl = downloadUrl;
            } catch {
                updates.imageUrl = null;
            }

            // Clean up old image from R2 if it changed
            const oldKey = existing[0].imageKey;
            if (oldKey && oldKey !== updates.imageKey) {
                try {
                    await deleteDocument(oldKey);
                } catch {
                    logger.warn('Failed to delete old carousel image', { oldKey });
                }
            }
        } else if (updates.imageKey === null) {
            // Explicitly clearing image
            updates.imageUrl = null;
            const oldKey = existing[0].imageKey;
            if (oldKey) {
                try {
                    await deleteDocument(oldKey);
                } catch {
                    logger.warn('Failed to delete old carousel image', { oldKey });
                }
            }
        }

        const result = await db.update(announcements)
            .set(updates)
            .where(eq(announcements.id, id))
            .returning();

        logger.info('Announcement updated', { id });

        return res.json(successResponse(result[0]));
    } catch (error) {
        logger.error('Failed to update announcement', error);
        return res.status(500).json(
            errorResponse({
                code: ErrorCodes.INTERNAL_ERROR,
                message: 'Failed to update announcement',
            })
        );
    }
});

/**
 * DELETE /api/announcements/:id
 * Admin — delete announcement (also cleans up R2 image if present)
 */
router.delete('/:id', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const existing = await db.select()
            .from(announcements)
            .where(eq(announcements.id, id));

        if (existing.length === 0) {
            return res.status(404).json(
                errorResponse({
                    code: ErrorCodes.NOT_FOUND,
                    message: 'Announcement not found',
                })
            );
        }

        // Clean up R2 image if present
        if (existing[0].imageKey) {
            try {
                await deleteDocument(existing[0].imageKey);
            } catch {
                logger.warn('Failed to delete carousel image on announcement delete', { imageKey: existing[0].imageKey });
            }
        }

        await db.delete(announcements)
            .where(eq(announcements.id, id));

        logger.info('Announcement deleted', { id });

        return res.json(successResponse({ message: 'Announcement deleted' }));
    } catch (error) {
        logger.error('Failed to delete announcement', error);
        return res.status(500).json(
            errorResponse({
                code: ErrorCodes.INTERNAL_ERROR,
                message: 'Failed to delete announcement',
            })
        );
    }
});

export default router;
