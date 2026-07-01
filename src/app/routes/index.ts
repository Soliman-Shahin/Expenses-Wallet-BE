import { Router } from 'express';
import userRoutes from './user.route';
import categoryRoutes from './category.route';
import expenseRoutes from './expense.route';
import syncRoutes from './sync.route';
import adminRoutes from './admin.route';
import {
  trackSyncOperation,
  validateSyncData,
  rateLimitSync,
  addSyncHeaders,
} from '../middleware/sync.middleware';

const router = Router();

router.use('/user', userRoutes);
router.use('/categories', categoryRoutes);
router.use('/expenses', expenseRoutes);

// Sync middleware scoped to /sync routes only
router.use(
  '/sync',
  trackSyncOperation,
  validateSyncData,
  rateLimitSync(100, 15 * 60 * 1000),
  addSyncHeaders,
  syncRoutes
);

router.use('/admin', adminRoutes);

export default router;
