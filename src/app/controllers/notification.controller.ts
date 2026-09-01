import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/access.middleware';
import { sendError, sendSuccess } from '../shared/helper';
import { NotificationService } from '../services/notification.service';

export const broadcastNotification = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user_id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const notification = await NotificationService.broadcast({
      ...req.body,
      createdBy: userId,
    });

    return res.status(200).json({
      success: true,
      message: 'Notification broadcasted successfully',
      notification: {
        id: notification._id.toString(),
        title: notification.title,
        message: notification.message,
        type: notification.type,
        audience: notification.audience,
        createdAt: notification.createdAt,
        isRead: false,
      },
    });
  } catch {
    return res.status(500).json({ success: false, message: 'Failed to broadcast notification' });
  }
};

export const getNotificationForCurrentUser = async (
  req: Request,
  res: Response
) => {
  const userId = (req as AuthenticatedRequest).user_id;
  if (!userId) return sendError(res, 'Authentication required', 401);

  const notificationId = Array.isArray(req.params.notificationId)
    ? req.params.notificationId[0]
    : req.params.notificationId;
  const notification = await NotificationService.getForUser(
    userId,
    notificationId
  );
  if (!notification) return sendError(res, 'Notification not found', 404);

  return sendSuccess(res, notification);
};

export const markNotificationRead = async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).user_id;
  if (!userId) return sendError(res, 'Authentication required', 401);

  const notificationId = Array.isArray(req.params.notificationId)
    ? req.params.notificationId[0]
    : req.params.notificationId;
  const updated = await NotificationService.markRead(
    userId,
    notificationId
  );
  if (!updated) return sendError(res, 'Notification not found', 404);

  return sendSuccess(res, { id: notificationId, isRead: true });
};
