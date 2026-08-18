import { Router } from 'express';
import { broadcastNotification } from '../controllers/notification.controller';
import { verifyAccessToken } from '../middleware/access.middleware';
import { requireRole } from '../middleware/admin.middleware';
import { UserRole } from '../models/user.model';

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
  broadcastNotification
);

export default router;
