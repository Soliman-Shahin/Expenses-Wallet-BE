import { Router } from 'express';
import { verifyAccessToken } from '../middleware/access.middleware';
import {
  attachPlanContext,
  checkPlanLimit,
} from '../middleware/plan.middleware';
import { requirePermission } from '../middleware/permission.middleware';
import { Permission } from '../types/permissions.types';
import {
  createCategory,
  deleteCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  updateOrder,
} from '../controllers';

const router = Router();

// ==================== CATEGORY ROUTES ====================
// All routes require authentication and plan context
router.use(verifyAccessToken, attachPlanContext);

// CREATE - Check permission and plan limit
router.post(
  '/create',
  requirePermission(Permission.CATEGORY_CREATE),
  checkPlanLimit('categories'),
  createCategory
);

// READ - Basic permission check
router.get('/list', requirePermission(Permission.CATEGORY_READ), getCategories);

router.get(
  '/:id',
  requirePermission(Permission.CATEGORY_READ),
  getCategoryById
);

// UPDATE - Permission check
router.put(
  '/update/:id',
  requirePermission(Permission.CATEGORY_UPDATE),
  updateCategory
);

router.put(
  '/update-order',
  requirePermission(Permission.CATEGORY_UPDATE),
  updateOrder
);

// DELETE - Permission check
router.delete(
  '/delete/:id',
  requirePermission(Permission.CATEGORY_DELETE),
  deleteCategory
);

export default router;
