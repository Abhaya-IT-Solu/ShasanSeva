import { Router } from 'express';
import authRoutes from './auth.routes';
import oauthRoutes from './oauth.routes';
import userRoutes from './user.routes';
import schemeRoutes from './scheme.routes';
import adminRoutes from './admin.routes';
import documentRoutes from './document.routes';
import paymentRoutes from './payment.routes';
import orderRoutes from './order.routes';

const router = Router();

// Health check
router.get('/health', (req, res) => {
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

export default router;
