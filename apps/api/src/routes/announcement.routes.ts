import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validation.middleware.js';
import { db, announcements } from '@shasansetu/db';
import { eq, asc } from 'drizzle-orm';
import { successResponse, errorResponse, ErrorCodes, logger } from '../lib/utils.js';

const router: Router = Router();

// Validation schemas
const createAnnouncementSchema = z.object({
    type: z.enum(['MARQUEE', 'PILL', 'POPULAR_TAG']),
    title: z.string().min(1).max(255),
    link: z.string().max(500).optional(),
    isActive: z.boolean().optional().default(true),
    sortOrder: z.number().int().optional().default(0),
});

const updateAnnouncementSchema = z.object({
    type: z.enum(['MARQUEE', 'PILL', 'POPULAR_TAG']).optional(),
    title: z.string().min(1).max(255).optional(),
    link: z.string().max(500).nullable().optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().optional(),
});

/**
 * GET /api/announcements/public
 * Public endpoint — returns active announcements grouped by type
 */
router.get('/public', async (_req: Request, res: Response) => {
    try {
        const result = await db.select()
            .from(announcements)
            .where(eq(announcements.isActive, true))
            .orderBy(asc(announcements.sortOrder));

        const grouped = {
            marquee: result.filter((a: typeof result[number]) => a.type === 'MARQUEE'),
            pills: result.filter((a: typeof result[number]) => a.type === 'PILL'),
            popularTags: result.filter((a: typeof result[number]) => a.type === 'POPULAR_TAG'),
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
 * POST /api/announcements
 * Admin — create announcement
 */
router.post('/', authMiddleware, adminMiddleware, validateBody(createAnnouncementSchema), async (req: Request, res: Response) => {
    try {
        const { type, title, link, isActive, sortOrder } = req.body;

        const result = await db.insert(announcements).values({
            type,
            title,
            link: link || null,
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
        const updates = req.body;

        // Verify exists
        const existing = await db.select({ id: announcements.id })
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
 * Admin — delete announcement
 */
router.delete('/:id', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const existing = await db.select({ id: announcements.id })
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
