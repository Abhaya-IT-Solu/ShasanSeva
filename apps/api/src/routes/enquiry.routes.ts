import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware.js';
import { enquiryRateLimiter } from '../middleware/rateLimit.middleware.js';
import { validateBody } from '../middleware/validation.middleware.js';
import { db, enquiries, schemes, admins, EnquiryStatus } from '@shasansetu/db';
import { eq, and, or, desc, count, ilike, SQL } from 'drizzle-orm';
import { successResponse, errorResponse, ErrorCodes, logger } from '../lib/utils.js';
import { getClientIp } from '../lib/clientIp.js';

const router: Router = Router();

// NOTE: no router.use(authMiddleware) here. POST / is deliberately public —
// the whole point is to hear from visitors who have not signed up. Every other
// route in this file guards itself explicitly.

// ---------- Validation Schemas ----------

const createEnquirySchema = z.object({
    name: z.string().trim().min(2).max(100),
    // Same regex the register endpoint uses, so a number that can raise an
    // enquiry is a number that can later register.
    phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number'),
    email: z.string().trim().email().max(255).optional().or(z.literal('')),
    message: z.string().trim().min(10).max(1000),
    schemeId: z.string().uuid().optional(),
    // Honeypot. Hidden from real users by CSS, so a filled value means a bot.
    // Accepted by the schema rather than rejected, so the response can look
    // exactly like a success — see the handler.
    website: z.string().max(200).optional(),
});

const updateEnquirySchema = z.object({
    status: z.enum(['NEW', 'CONTACTED', 'CLOSED']).optional(),
    adminNote: z.string().max(2000).nullable().optional(),
}).refine(
    (v) => v.status !== undefined || v.adminNote !== undefined,
    { message: 'Provide a status or a note to update' }
);

// ---------- Public Endpoint ----------

/**
 * POST /api/enquiries
 * Public — a visitor asks a question, optionally about a specific scheme.
 *
 * Unauthenticated by design, so it carries two independent defences: an IP rate
 * limit (Redis, fails open) and a honeypot field (no dependencies, always on).
 */
router.post('/', enquiryRateLimiter, validateBody(createEnquirySchema), async (req: Request, res: Response) => {
    try {
        const { name, phone, email, message, schemeId, website } = req.body;

        // Honeypot tripped. Answer exactly as if it worked — a 4xx here would
        // just tell the author which field to leave alone next time.
        if (website && website.trim().length > 0) {
            logger.warn('Enquiry honeypot tripped', { ip: getClientIp(req) });
            return res.status(201).json(successResponse({
                message: 'Enquiry submitted successfully',
            }));
        }

        // A dangling scheme reference would show up in the admin list as an
        // enquiry about nothing, so fail loudly instead of storing it.
        if (schemeId) {
            const scheme = await db.select({ id: schemes.id })
                .from(schemes)
                .where(eq(schemes.id, schemeId));

            if (scheme.length === 0) {
                return res.status(404).json(
                    errorResponse({
                        code: ErrorCodes.NOT_FOUND,
                        message: 'Scheme not found',
                    })
                );
            }
        }

        const result = await db.insert(enquiries).values({
            name,
            phone,
            email: email ? email : null,
            message,
            schemeId: schemeId || null,
            // The real client, not the bridge address — otherwise every row
            // records 172.17.0.1 and the column is useless for tracing abuse.
            sourceIp: getClientIp(req),
        }).returning({ id: enquiries.id });

        // The message is the visitor's own words — log that one arrived, not
        // what it said.
        logger.info('Enquiry submitted', { enquiryId: result[0].id, schemeId: schemeId || null });

        return res.status(201).json(successResponse({
            message: 'Enquiry submitted successfully',
        }));
    } catch (error) {
        logger.error('Failed to submit enquiry', error);
        return res.status(500).json(
            errorResponse({
                code: ErrorCodes.INTERNAL_ERROR,
                message: 'Failed to submit enquiry',
            })
        );
    }
});

// ---------- Admin Endpoints ----------

/**
 * GET /api/enquiries/open-count
 * Admin — number of NEW enquiries, for the sidebar badge.
 *
 * Declared before GET /:id-shaped routes would be, so "open-count" is never
 * parsed as an id.
 */
router.get('/open-count', authMiddleware, adminMiddleware, async (_req: Request, res: Response) => {
    try {
        const result = await db.select({ count: count() })
            .from(enquiries)
            .where(eq(enquiries.status, EnquiryStatus.NEW));

        return res.json(successResponse({ count: result[0]?.count || 0 }));
    } catch (error) {
        logger.error('Failed to count open enquiries', error);
        return res.status(500).json(
            errorResponse({
                code: ErrorCodes.INTERNAL_ERROR,
                message: 'Failed to count enquiries',
            })
        );
    }
});

/**
 * GET /api/enquiries
 * Admin — paginated list with status filter and search.
 */
router.get('/', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
    try {
        const status = req.query.status as string | undefined;
        const search = req.query.search as string | undefined;
        const page = Number(req.query.page) || 1;
        const limit = Math.min(Math.max(Number(req.query.limit) || 20, 10), 100);
        const offset = (page - 1) * limit;

        const conditions: SQL[] = [];
        if (status) conditions.push(eq(enquiries.status, status));
        if (search) {
            // Escape LIKE metacharacters so a literal % or _ does not widen the match
            const term = `%${search.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
            conditions.push(
                or(
                    ilike(enquiries.name, term),
                    ilike(enquiries.phone, term),
                    ilike(enquiries.email, term),
                    ilike(schemes.name, term),
                )!
            );
        }
        const where = conditions.length > 0 ? and(...conditions) : undefined;

        // Left joins, not inner: a general enquiry has no scheme and an unhandled
        // one has no admin, and neither may drop out of the list. The count query
        // repeats the joins because the search filters on schemes.name.
        const countResult = await db.select({ count: count() })
            .from(enquiries)
            .leftJoin(schemes, eq(enquiries.schemeId, schemes.id))
            .leftJoin(admins, eq(enquiries.handledBy, admins.id))
            .where(where);
        const total = countResult[0]?.count || 0;

        const result = await db.select({
            id: enquiries.id,
            name: enquiries.name,
            phone: enquiries.phone,
            email: enquiries.email,
            message: enquiries.message,
            schemeId: enquiries.schemeId,
            schemeName: schemes.name,
            status: enquiries.status,
            adminNote: enquiries.adminNote,
            handledBy: enquiries.handledBy,
            handledByName: admins.name,
            handledAt: enquiries.handledAt,
            createdAt: enquiries.createdAt,
            // sourceIp is deliberately not selected — it exists for abuse
            // forensics in the database, not for the admin screen.
        })
            .from(enquiries)
            .leftJoin(schemes, eq(enquiries.schemeId, schemes.id))
            .leftJoin(admins, eq(enquiries.handledBy, admins.id))
            .where(where)
            .orderBy(desc(enquiries.createdAt))
            .limit(limit)
            .offset(offset);

        return res.json(successResponse({
            data: result,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        }));
    } catch (error) {
        logger.error('Failed to fetch enquiries', error);
        return res.status(500).json(
            errorResponse({
                code: ErrorCodes.INTERNAL_ERROR,
                message: 'Failed to fetch enquiries',
            })
        );
    }
});

/**
 * PATCH /api/enquiries/:id
 * Admin — update status and/or the internal note.
 */
router.patch('/:id', authMiddleware, adminMiddleware, validateBody(updateEnquirySchema), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status, adminNote } = req.body;
        const adminId = req.user!.userId;

        const updates: Record<string, unknown> = { updatedAt: new Date() };

        if (status !== undefined) {
            updates.status = status;
            // Record who moved it and when, so two admins do not both ring the
            // same person. Stamped on every status change, including back to NEW.
            updates.handledBy = adminId;
            updates.handledAt = new Date();
        }
        if (adminNote !== undefined) {
            updates.adminNote = adminNote || null;
        }

        const updated = await db.update(enquiries)
            .set(updates)
            .where(eq(enquiries.id, id))
            .returning({ id: enquiries.id, status: enquiries.status });

        if (updated.length === 0) {
            return res.status(404).json(
                errorResponse({
                    code: ErrorCodes.NOT_FOUND,
                    message: 'Enquiry not found',
                })
            );
        }

        logger.info('Enquiry updated', { enquiryId: id, status: updated[0].status, adminId });

        return res.json(successResponse(updated[0]));
    } catch (error) {
        logger.error('Failed to update enquiry', error);
        return res.status(500).json(
            errorResponse({
                code: ErrorCodes.INTERNAL_ERROR,
                message: 'Failed to update enquiry',
            })
        );
    }
});

export default router;
