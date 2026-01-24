import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validation.middleware';
import {
    getUploadUrl,
    getDownloadUrl,
    isValidContentType,
    getExtensionFromContentType,
    ALLOWED_CONTENT_TYPES,
    MAX_FILE_SIZE,
} from '../services/r2.service';
import { db, documents } from '@shasansetu/db';
import { eq, and } from 'drizzle-orm';
import { successResponse, errorResponse, ErrorCodes, logger } from '../lib/utils';

const router: Router = Router();

// All routes require authentication
router.use(authMiddleware);

// Schema for requesting upload URL
const uploadUrlSchema = z.object({
    documentType: z.string().min(1),
    contentType: z.enum(ALLOWED_CONTENT_TYPES as [string, ...string[]]),
    orderId: z.string().uuid().optional(),
});

/**
 * POST /api/documents/upload-url
 * Get a pre-signed URL for uploading a document
 */
router.post('/upload-url', validateBody(uploadUrlSchema), async (req: Request, res: Response) => {
    try {
        const userId = req.user!.userId;
        const { documentType, contentType, orderId } = req.body;

        // Generate signed upload URL
        const { uploadUrl, key, expiresIn } = await getUploadUrl({
            userId,
            orderId,
            documentType,
            contentType,
            fileExtension: getExtensionFromContentType(contentType),
        });

        // Store document record in database (status: PENDING until upload confirmed)
        const result = await db.insert(documents).values({
            orderId: orderId || null,
            documentType,
            storageKey: key,
            fileName: `${documentType}.${getExtensionFromContentType(contentType)}`,
            mimeType: contentType,
            status: 'PENDING',
        }).returning();

        logger.info('Upload URL generated', { userId, documentType, key });

        return res.json(successResponse({
            uploadUrl,
            documentId: result[0].id,
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
 * Confirm that upload was successful
 */
router.post('/:id/confirm-upload', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user!.userId;

        // Update document status to UPLOADED
        const result = await db.update(documents)
            .set({
                status: 'UPLOADED',
                updatedAt: new Date(),
            })
            .where(eq(documents.id, id))
            .returning();

        if (result.length === 0) {
            return res.status(404).json(
                errorResponse({
                    code: ErrorCodes.NOT_FOUND,
                    message: 'Document not found',
                })
            );
        }

        logger.info('Upload confirmed', { documentId: id, userId });

        return res.json(successResponse({
            document: result[0],
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
        const userId = req.user!.userId;

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
        const { downloadUrl, expiresIn } = await getDownloadUrl(document.storageKey);

        logger.info('Download URL generated', { documentId: id, userId });

        return res.json(successResponse({
            downloadUrl,
            expiresIn,
            document: {
                id: document.id,
                documentType: document.documentType,
                fileName: document.fileName,
                mimeType: document.mimeType,
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

export default router;
