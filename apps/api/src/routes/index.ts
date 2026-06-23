import { Router } from 'express';
import authRoutes from './auth.routes.js';
import oauthRoutes from './oauth.routes.js';
import userRoutes from './user.routes.js';
import schemeRoutes from './scheme.routes.js';
import adminRoutes from './admin.routes.js';
import documentRoutes from './document.routes.js';
import paymentRoutes from './payment.routes.js';
import orderRoutes from './order.routes.js';
import notificationRoutes from './notification.routes.js';
import proofRoutes from './proof.routes.js';
import feedbackRoutes from './feedback.routes.js';
import announcementRoutes from './announcement.routes.js';
import portalRoutes from './portal.routes.js';
import { sql } from '@shasansetu/db';

const router: Router = Router();

// Health check — probes DB so autoheal can detect connection pool issues
router.get('/health', async (_req, res) => {
    try {
        // Simple DB ping with 5s timeout — if pool is exhausted this will throw
        await Promise.race([
            sql`SELECT 1`,
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('DB ping timeout')), 5000)
            ),
        ]);
        res.json({ status: 'ok', db: 'ok', timestamp: new Date().toISOString() });
    } catch {
        // Return 503 — autoheal sees unhealthy container and restarts it
        res.status(503).json({ status: 'error', db: 'unreachable', timestamp: new Date().toISOString() });
    }
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/auth', oauthRoutes); // Google OAuth at /auth/google
router.use('/users', userRoutes);
router.use('/schemes', schemeRoutes);
router.use('/admin', adminRoutes);
router.use('/documents', documentRoutes);
router.use('/payments', paymentRoutes);
router.use('/orders', orderRoutes);
router.use('/notifications', notificationRoutes);
router.use('/proofs', proofRoutes);
router.use('/feedbacks', feedbackRoutes);
router.use('/announcements', announcementRoutes);
router.use('/portal', portalRoutes);

export default router;
