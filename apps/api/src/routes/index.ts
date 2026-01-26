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

const router: Router = Router();

// Health check
router.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
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

export default router;
