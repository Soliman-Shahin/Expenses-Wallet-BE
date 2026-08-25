import { Router } from 'express';
import { roleController } from '../controllers/role.controller';
import { attachPlanContext } from '../middleware/plan.middleware';
import { requirePermission } from '../middleware/permission.middleware';
import { Permission } from '../types/permissions.types';
import { validateRequestWithZod } from '../middleware/validation.middleware';
import { z } from 'zod';
import { verifyAccessToken } from '../middleware';

const router = Router();

// Validation schemas
const createRoleSchema = z.object({
  name: z.string().min(2).max(50),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(
      /^[a-z0-9-]+$/,
      'Slug can only contain lowercase letters, numbers, and hyphens'
    ),
  description: z.string().optional(),
  permissions: z.array(z.string()).optional(),
  isSystem: z.boolean().optional(),
});

const updateRoleSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  description: z.string().optional(),
  permissions: z.array(z.string()).optional(),
});

// All role routes require ADMIN_USERS permission (or a new ADMIN_ROLES permission if added)
router.use(
  verifyAccessToken,
  attachPlanContext,
  requirePermission(Permission.ADMIN_USERS)
);

router.get('/', roleController.getRoles);
router.get('/:id', roleController.getRoleById);
router.post(
  '/',
  validateRequestWithZod(createRoleSchema),
  roleController.createRole
);
router.put(
  '/:id',
  validateRequestWithZod(updateRoleSchema),
  roleController.updateRole
);
router.delete('/:id', roleController.deleteRole);

export default router;
