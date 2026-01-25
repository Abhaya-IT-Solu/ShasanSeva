import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validation.middleware';
import {
    getUploadUrl,
    getDownloadUrl,
    getExtensionFromContentType,
    ALLOWED_CONTENT_TYPES,
    MAX_FILE_SIZE,
} from '../services/r2.service';
import { db, documents } from '@shasansetu/db';
import { eq } from 'drizzle-orm';
import { successResponse, errorResponse, ErrorCodes, logger } from '../lib/utils';

const router: Router = Router();

// All routes require authentication
router.use(authMiddleware);

// Schema for requesting upload URL - accepts both docType and documentType for flexibility
const uploadUrlSchema = z.object({
    docType: z.string().min(1).optional(),
    documentType: z.string().min(1).optional(),
    contentType: z.enum(ALLOWED_CONTENT_TYPES as [string, ...string[]]),
    orderId: z.string().uuid().optional(),
}).refine(data => data.docType || data.documentType, {
    message: "Either docType or documentType is required",
});

/**
 * POST /api/documents/upload-url
 * Get a pre-signed URL for uploading a document
 */
router.post('/upload-url', validateBody(uploadUrlSchema), async (req: Request, res: Response) => {
    try {
        const userId = req.user!.userId;
        const { docType, documentType, contentType, orderId } = req.body;
        const docTypeValue = docType || documentType;

        // Generate signed upload URL
        const { uploadUrl, key, expiresIn } = await getUploadUrl({
            userId,
            orderId,
            documentType: docTypeValue,
            contentType,
            fileExtension: getExtensionFromContentType(contentType),
        });

        // Store document record in database (only if orderId is provided)
        let documentId = null;
        if (orderId) {
            const result = await db.insert(documents).values({
                orderId,
                docType: docTypeValue,
                fileKey: key,
                fileUrl: '', // Will be set after upload
                status: 'UPLOADED',
            }).returning();
            documentId = result[0].id;
        }

        logger.info('Upload URL generated', { userId, docType: docTypeValue, key });

        return res.json(successResponse({
            uploadUrl,
            documentId,
            key,
            expiresIn,
            allowedTypes: ALLOWED_CONTENT_TYPES,
            maxSize: MAX_FILE_SIZE,
        }));
    } catch (error) {
        logger.error('Failed to generate upload URL', error);
        return res.status(500).json(
            errorResponse({
                code: ErrorCodes.INTERNAL_ERROR,
                message: 'Failed to generate upload URL',
            })
        );
    }
});

/**
 * POST /api/documents/:id/confirm-upload
 * Confirm that upload was successful and get file URL
 */
router.post('/:id/confirm-upload', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // If no document ID (was uploaded without orderId), just return success
        if (!id || id === 'null' || id === 'undefined') {
            return res.json(successResponse({
                message: 'Upload confirmed (no document record)',
            }));
        }

        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(id)) {
            return res.json(successResponse({
                message: 'Upload confirmed (no document record)',
            }));
        }

        // Get document
        const docResult = await db.select()
            .from(documents)
            .where(eq(documents.id, id));

        if (docResult.length === 0) {
            return res.status(404).json(
                errorResponse({
                    code: ErrorCodes.NOT_FOUND,
                    message: 'Document not found',
                })
            );
        }

        const doc = docResult[0];

        // Generate download URL
        const { downloadUrl } = await getDownloadUrl(doc.fileKey);

        // Update document with file URL
        await db.update(documents)
            .set({ fileUrl: downloadUrl })
            .where(eq(documents.id, id));

        logger.info('Upload confirmed', { documentId: id });

        return res.json(successResponse({
            document: { ...doc, fileUrl: downloadUrl },
            message: 'Upload confirmed'
        }));
    } catch (error) {
        logger.error('Failed to confirm upload', error);
        return res.status(500).json(
            errorResponse({
                code: ErrorCodes.INTERNAL_ERROR,
                message: 'Failed to confirm upload',
            })
        );
    }
});

/**
 * GET /api/documents/:id/download-url
 * Get a pre-signed URL for downloading a document
 */
router.get('/:id/download-url', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Find document
        const result = await db.select()
            .from(documents)
            .where(eq(documents.id, id));

        if (result.length === 0) {
            return res.status(404).json(
                errorResponse({
                    code: ErrorCodes.NOT_FOUND,
                    message: 'Document not found',
                })
            );
        }

        const document = result[0];

        // Generate signed download URL
        const { downloadUrl, expiresIn } = await getDownloadUrl(document.fileKey);

        logger.info('Download URL generated', { documentId: id });

        return res.json(successResponse({
            downloadUrl,
            expiresIn,
            document: {
                id: document.id,
                docType: document.docType,
                status: document.status,
            },
        }));
    } catch (error) {
        logger.error('Failed to generate download URL', error);
        return res.status(500).json(
            errorResponse({
                code: ErrorCodes.INTERNAL_ERROR,
                message: 'Failed to generate download URL',
            })
        );
    }
});

// ==========================================
// ADMIN DOCUMENT VERIFICATION ROUTES
// ==========================================

const verifyDocumentSchema = z.object({
    adminNotes: z.string().optional(),
});

const rejectDocumentSchema = z.object({
    rejectionReason: z.string().min(5, 'Rejection reason must be at least 5 characters'),
});

/**
 * PATCH /api/documents/:id/verify
 * Admin verifies a document
 */
router.patch('/:id/verify', adminMiddleware, validateBody(verifyDocumentSchema), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const adminId = req.user!.userId;

        // Find document
        const result = await db.select()
            .from(documents)
            .where(eq(documents.id, id));

        if (result.length === 0) {
            return res.status(404).json(
                errorResponse({
                    code: ErrorCodes.NOT_FOUND,
                    message: 'Document not found',
                })
            );
        }

        const document = result[0];

        if (document.status === 'VERIFIED') {
            return res.status(400).json(
                errorResponse({
                    code: ErrorCodes.VALIDATION_ERROR,
                    message: 'Document is already verified',
                })
            );
        }

        // Update document status
        await db.update(documents)
            .set({
                status: 'VERIFIED',
                verifiedAt: new Date(),
                verifiedBy: adminId,
            })
            .where(eq(documents.id, id));

        logger.info('Document verified', { documentId: id, adminId });

        return res.json(successResponse({
            documentId: id,
            status: 'VERIFIED',
            message: 'Document verified successfully',
        }));
    } catch (error) {
        logger.error('Failed to verify document', error);
        return res.status(500).json(
            errorResponse({
                code: ErrorCodes.INTERNAL_ERROR,
                message: 'Failed to verify document',
            })
        );
    }
});

/**
 * PATCH /api/documents/:id/reject
 * Admin rejects a document with reason
 */
router.patch('/:id/reject', adminMiddleware, validateBody(rejectDocumentSchema), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const adminId = req.user!.userId;
        const { rejectionReason } = req.body;

        // Find document
        const result = await db.select()
            .from(documents)
            .where(eq(documents.id, id));

        if (result.length === 0) {
            return res.status(404).json(
                errorResponse({
                    code: ErrorCodes.NOT_FOUND,
                    message: 'Document not found',
                })
            );
        }

        // Update document status
        await db.update(documents)
            .set({
                status: 'REJECTED',
                rejectionReason,
                verifiedBy: adminId,
            })
            .where(eq(documents.id, id));

        logger.info('Document rejected', { documentId: id, adminId, reason: rejectionReason });

        return res.json(successResponse({
            documentId: id,
            status: 'REJECTED',
            rejectionReason,
            message: 'Document rejected',
        }));
    } catch (error) {
        logger.error('Failed to reject document', error);
        return res.status(500).json(
            errorResponse({
                code: ErrorCodes.INTERNAL_ERROR,
                message: 'Failed to reject document',
            })
        );
    }
});

/**
 * GET /api/documents/order/:orderId
 * Get all documents for an order (admin)
 */
router.get('/order/:orderId', adminMiddleware, async (req: Request, res: Response) => {
    try {
        const { orderId } = req.params;

        const result = await db.select()
            .from(documents)
            .where(eq(documents.orderId, orderId));

        return res.json(successResponse(result));
    } catch (error) {
        logger.error('Failed to fetch order documents', error);
        return res.status(500).json(
            errorResponse({
                code: ErrorCodes.INTERNAL_ERROR,
                message: 'Failed to fetch documents',
            })
        );
    }
});

export default router;
