import { Router } from 'express';
import {
  broadcastNotification,
  getNotificationForCurrentUser,
  markNotificationRead,
} from '../controllers/notification.controller';
import { verifyAccessToken } from '../middleware/access.middleware';
import { requireRole } from '../middleware/admin.middleware';
import { UserRole } from '../models/user.model';
import { validateRequestWithZod } from '../middleware/validation.middleware';
import { broadcastNotificationSchema } from '../validations/notification.validation';

const router = Router();

/**
 * @route  POST /v1/notifications/broadcast
 * @desc   Broadcast a real-time notification to all connected clients
 * @access Admin, SuperAdmin
 */
router.post(
  '/broadcast',
  verifyAccessToken,
  requireRole(UserRole.Admin),  // requireRole uses weights, so SuperAdmin is also allowed
  validateRequestWithZod(broadcastNotificationSchema),
  broadcastNotification
);

router.get(
  '/:notificationId',
  verifyAccessToken,
  getNotificationForCurrentUser
);

router.patch(
  '/:notificationId/read',
  verifyAccessToken,
  markNotificationRead
);

export default router;
