import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env.js';
import { logger } from '../lib/utils.js';

// R2 uses S3-compatible API
const r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: env.R2_SECRET_ACCESS_KEY || '',
    },
});

const BUCKET_NAME = env.R2_BUCKET_NAME || 'shasansetu-documents';

// URL expiration times (in seconds)
const UPLOAD_URL_EXPIRY = 300; // 5 minutes
const DOWNLOAD_URL_EXPIRY = 900; // 15 minutes

interface UploadUrlParams {
    userId: string;
    orderId?: string;
    documentType: string;
    contentType: string;
    fileExtension: string;
}

interface DocumentKey {
    userId: string;
    orderId?: string;
    documentType: string;
    timestamp: number;
    fileExtension: string;
}

/**
 * Generate a storage key for a document
 */
function generateKey(params: UploadUrlParams): string {
    const timestamp = Date.now();
    const { userId, orderId, documentType, fileExtension } = params;

    if (orderId) {
        return `users/${userId}/orders/${orderId}/${documentType}_${timestamp}.${fileExtension}`;
    }
    return `users/${userId}/documents/${documentType}_${timestamp}.${fileExtension}`;
}

/**
 * Parse a storage key to extract metadata
 */
export function parseKey(key: string): DocumentKey | null {
    try {
        const parts = key.split('/');
        const filename = parts[parts.length - 1];
        const [docPart, ext] = filename.split('.');
        const [documentType, timestamp] = docPart.split('_');

        return {
            userId: parts[1],
            orderId: parts.includes('orders') ? parts[3] : undefined,
            documentType,
            timestamp: parseInt(timestamp),
            fileExtension: ext,
        };
    } catch {
        return null;
    }
}

/**
 * Get a pre-signed URL for uploading a document
 * Client will use this URL to PUT the file directly to R2
 */
export async function getUploadUrl(params: UploadUrlParams): Promise<{
    uploadUrl: string;
    key: string;
    expiresIn: number;
}> {
    const key = generateKey(params);

    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        ContentType: params.contentType,
    });

    try {
        const uploadUrl = await getSignedUrl(r2Client, command, {
            expiresIn: UPLOAD_URL_EXPIRY,
        });

        logger.info('Generated upload URL', { key, contentType: params.contentType });

        return {
            uploadUrl,
            key,
            expiresIn: UPLOAD_URL_EXPIRY,
        };
    } catch (error) {
        logger.error('Failed to generate upload URL', error);
        throw new Error('Failed to generate upload URL');
    }
}

/**
 * Get a pre-signed URL for downloading a document
 * This URL expires after 15 minutes for security
 */
export async function getDownloadUrl(key: string): Promise<{
    downloadUrl: string;
    expiresIn: number;
}> {
    const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
    });

    try {
        const downloadUrl = await getSignedUrl(r2Client, command, {
            expiresIn: DOWNLOAD_URL_EXPIRY,
        });

        logger.info('Generated download URL', { key });

        return {
            downloadUrl,
            expiresIn: DOWNLOAD_URL_EXPIRY,
        };
    } catch (error) {
        logger.error('Failed to generate download URL', error);
        throw new Error('Failed to generate download URL');
    }
}

/**
 * Delete a document from R2
 */
export async function deleteDocument(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
    });

    try {
        await r2Client.send(command);
        logger.info('Document deleted', { key });
    } catch (error) {
        logger.error('Failed to delete document', error);
        throw new Error('Failed to delete document');
    }
}

// Allowed content types for documents
export const ALLOWED_CONTENT_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
];

// Max file size: 10MB
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Validate file type
 */
export function isValidContentType(contentType: string): boolean {
    return ALLOWED_CONTENT_TYPES.includes(contentType);
}

/**
 * Get file extension from content type
 */
export function getExtensionFromContentType(contentType: string): string {
    const extensions: Record<string, string> = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
        'application/pdf': 'pdf',
    };
    return extensions[contentType] || 'bin';
}
