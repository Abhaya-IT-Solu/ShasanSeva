import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validation.middleware.js';
import { db, proofs, orders } from '@shasansetu/db';
import { eq } from 'drizzle-orm';
import {
    getUploadUrl,
    getDownloadUrl,
    getExtensionFromContentType,
    ALLOWED_CONTENT_TYPES,
} from '../services/r2.service.js';
import { createNotification, NotificationTypes } from '../services/notification.service.js';
import { successResponse, errorResponse, ErrorCodes, logger } from '../lib/utils.js';

const router: Router = Router();

// All routes require admin authentication
router.use(authMiddleware, adminMiddleware);

// Schema for requesting proof upload URL
const uploadProofUrlSchema = z.object({
    orderId: z.string().uuid(),
    proofType: z.enum(['RECEIPT', 'SCREENSHOT', 'REFERENCE_ID', 'CONFIRMATION', 'OTHER']),
    contentType: z.enum(ALLOWED_CONTENT_TYPES as [string, ...string[]]),
    description: z.string().optional(),
});

/**
 * POST /api/proofs/upload-url
 * Get a pre-signed URL for uploading proof
 */
router.post('/upload-url', validateBody(uploadProofUrlSchema), async (req: Request, res: Response) => {
    try {
        const adminId = req.user!.userId;
        const { orderId, proofType, contentType, description } = req.body;

        // Verify order exists
        const orderResult = await db.select()
            .from(orders)
            .where(eq(orders.id, orderId));

        if (orderResult.length === 0) {
            return res.status(404).json(
                errorResponse({
                    code: ErrorCodes.NOT_FOUND,
                    message: 'Order not found',
                })
            );
        }

        // Generate upload URL
        const { uploadUrl, key, expiresIn } = await getUploadUrl({
            userId: 'admin',
            orderId,
            documentType: `proof_${proofType}`,
            contentType,
            fileExtension: getExtensionFromContentType(contentType),
        });

        // Create proof record (pending upload)
        const result = await db.insert(proofs).values({
            orderId,
            fileKey: key,
            fileUrl: '', // Will be updated after upload confirmation
            proofType,
            description: description || null,
            uploadedBy: adminId,
        }).returning();

        logger.info('Proof upload URL generated', { orderId, proofId: result[0].id, adminId });

        return res.json(successResponse({
            uploadUrl,
            proofId: result[0].id,
            key,
            expiresIn,
        }));
    } catch (error) {
        logger.error('Failed to generate proof upload URL', error);
        return res.status(500).json(
            errorResponse({
                code: ErrorCodes.INTERNAL_ERROR,
                message: 'Failed to generate upload URL',
            })
        );
    }
});

/**
 * POST /api/proofs/:id/confirm
 * Confirm proof upload and update order status
 */
router.post('/:id/confirm', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const adminId = req.user!.userId;

        // Get proof
        const proofResult = await db.select()
            .from(proofs)
            .where(eq(proofs.id, id));

        if (proofResult.length === 0) {
            return res.status(404).json(
                errorResponse({
                    code: ErrorCodes.NOT_FOUND,
                    message: 'Proof not found',
                })
            );
        }

        const proof = proofResult[0];

        // Generate download URL
        const { downloadUrl } = await getDownloadUrl(proof.fileKey);

        // Update proof with file URL
        await db.update(proofs)
            .set({ fileUrl: downloadUrl })
            .where(eq(proofs.id, id));

        // Update order status to PROOF_UPLOADED
        await db.update(orders)
            .set({
                status: 'PROOF_UPLOADED',
                updatedAt: new Date(),
            })
            .where(eq(orders.id, proof.orderId));

        // Get order for notification
        const orderResult = await db.select()
            .from(orders)
            .where(eq(orders.id, proof.orderId));

        if (orderResult.length > 0) {
            // Notify user about proof upload
            await createNotification({
                recipientId: orderResult[0].userId,
                recipientType: 'USER',
                type: NotificationTypes.PROOF_UPLOADED,
                title: 'Proof Uploaded',
                message: 'Admin has uploaded proof for your order. Please check your dashboard.',
                relatedOrderId: proof.orderId,
            });
        }

        logger.info('Proof confirmed', { proofId: id, orderId: proof.orderId, adminId });

        return res.json(successResponse({
            proofId: id,
            orderId: proof.orderId,
            status: 'PROOF_UPLOADED',
            message: 'Proof uploaded and order updated',
        }));
    } catch (error) {
        logger.error('Failed to confirm proof upload', error);
        return res.status(500).json(
            errorResponse({
                code: ErrorCodes.INTERNAL_ERROR,
                message: 'Failed to confirm proof upload',
            })
        );
    }
});

/**
 * GET /api/proofs/order/:orderId
 * Get all proofs for an order
 */
router.get('/order/:orderId', async (req: Request, res: Response) => {
    try {
        const { orderId } = req.params;

        const result = await db.select()
            .from(proofs)
            .where(eq(proofs.orderId, orderId));

        return res.json(successResponse(result));
    } catch (error) {
        logger.error('Failed to fetch proofs', error);
        return res.status(500).json(
            errorResponse({
                code: ErrorCodes.INTERNAL_ERROR,
                message: 'Failed to fetch proofs',
            })
        );
    }
});

/**
 * GET /api/proofs/:id/download-url
 * Get download URL for a proof
 */
router.get('/:id/download-url', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const result = await db.select()
            .from(proofs)
            .where(eq(proofs.id, id));

        if (result.length === 0) {
            return res.status(404).json(
                errorResponse({
                    code: ErrorCodes.NOT_FOUND,
                    message: 'Proof not found',
                })
            );
        }

        const proof = result[0];
        const { downloadUrl, expiresIn } = await getDownloadUrl(proof.fileKey);

        return res.json(successResponse({
            downloadUrl,
            expiresIn,
            proof: {
                id: proof.id,
                proofType: proof.proofType,
                description: proof.description,
                uploadedAt: proof.uploadedAt,
            },
        }));
    } catch (error) {
        logger.error('Failed to get proof download URL', error);
        return res.status(500).json(
            errorResponse({
                code: ErrorCodes.INTERNAL_ERROR,
                message: 'Failed to get download URL',
            })
        );
    }
});

export default router;
