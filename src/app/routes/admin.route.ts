import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { verifyAccessToken } from '../middleware/access.middleware';
import { requireAdmin } from '../middleware/admin.middleware';

const router = Router();

// All admin routes require a valid token AND admin role
router.use(verifyAccessToken);
router.use(requireAdmin);

// ==================== DASHBOARD STATS ====================
router.get('/stats', adminController.getStats.bind(adminController));
router.get('/health', adminController.getSystemHealth.bind(adminController));

// ==================== EXPENSES ====================
router.get('/expenses', adminController.getExpenses.bind(adminController));
router.get(
  '/expenses/:id',
  adminController.getExpenseById.bind(adminController)
);

// ==================== USERS ====================
router.get('/users', adminController.getUsers.bind(adminController));
router.get('/users/:id', adminController.getUserById.bind(adminController));
router.put('/users/:id', adminController.updateUser.bind(adminController));
// ==================== CATEGORIES ====================
router.get('/categories', adminController.getCategories.bind(adminController));
router.get(
  '/categories/:id',
  adminController.getCategoryById.bind(adminController)
);
router.put(
  '/categories/:id',
  adminController.updateCategory.bind(adminController)
);

// ==================== SYNC ====================
router.get(
  '/sync/operations',
  adminController.getSyncOperations.bind(adminController)
);
router.get(
  '/sync/conflicts',
  adminController.getSyncConflicts.bind(adminController)
);

export default router;
