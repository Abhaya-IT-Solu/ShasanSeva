import { Router } from 'express';
import authRoutes from './auth.routes';
import oauthRoutes from './oauth.routes';
import userRoutes from './user.routes';
import schemeRoutes from './scheme.routes';
import adminRoutes from './admin.routes';
import documentRoutes from './document.routes';
import paymentRoutes from './payment.routes';
import orderRoutes from './order.routes';
import notificationRoutes from './notification.routes';
import proofRoutes from './proof.routes';

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
