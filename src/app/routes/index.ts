import { Router } from 'express';
import userRoutes from './user.route';
import categoryRoutes from './category.route';
import expenseRoutes from './expense.route';
import syncRoutes from './sync.route';
import adminRoutes from './admin.route';
import planRoutes from './plan.route';
import auditLogRoutes from './audit-log.route';
import cacheRoutes from './cache.route';
import scopeRoutes from './scope.route';
import rateLimitRoutes from './rate-limit.route';
import temporaryPermissionRoutes from './temporary-permission.route';
import permissionMatrixRoutes from './permission-matrix.route';
import roleRoutes from './role.routes';
import notificationRoutes from './notification.route';
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
router.use('/plans', planRoutes);

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
router.use('/audit-logs', auditLogRoutes);
router.use('/cache', cacheRoutes);
router.use('/scopes', scopeRoutes);
router.use('/rate-limits', rateLimitRoutes);
router.use('/temporary-permissions', temporaryPermissionRoutes);
router.use('/permissions', permissionMatrixRoutes);
router.use('/roles', roleRoutes);
router.use('/notifications', notificationRoutes);

export default router;
