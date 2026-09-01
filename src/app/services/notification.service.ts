import { Types } from 'mongoose';
import {
  Notification,
  NotificationAudience,
  NotificationType,
} from '../models/notification.model';
import { UserNotification } from '../models/user-notification.model';
import { User, UserRole } from '../models/user.model';
import logger from './logger.service';
import { PushDeliveryService } from './push-delivery.service';
import { getSocketService } from './socket.service';

interface BroadcastInput {
  title: string;
  message: string;
  type: NotificationType;
  audience: NotificationAudience;
  createdBy: string;
}

export class NotificationService {
  static async broadcast(input: BroadcastInput) {
    const notification = await Notification.create({
      title: input.title,
      message: input.message,
      type: input.type,
      audience: input.audience,
      createdBy: new Types.ObjectId(input.createdBy),
      routeKey: 'notification-detail',
    });

    const userFilter: Record<string, unknown> = {
      isActive: { $ne: false },
      _isDeleted: { $ne: true },
    };
    if (input.audience === 'admins') {
      userFilter.role = { $in: [UserRole.Admin, UserRole.SuperAdmin] };
    } else if (input.audience === 'moderators') {
      userFilter.role = UserRole.Moderator;
    }

    const recipients = await User.find(userFilter).select('_id').lean();
    const userIds = recipients.map((recipient) => recipient._id as Types.ObjectId);

    if (userIds.length > 0) {
      await UserNotification.insertMany(
        userIds.map((userId) => ({
          notificationId: notification._id,
          userId,
        })),
        { ordered: false }
      );
    }

    notification.recipientCount = userIds.length;
    await notification.save();

    const socketNotification = {
      id: notification._id.toString(),
      title: notification.title,
      message: notification.message,
      type: notification.type,
      createdAt: notification.createdAt,
      isRead: false,
    };

    const socketService = getSocketService();
    if (input.audience === 'admins') {
      socketService.broadcastNotification(socketNotification, 'admin');
      socketService.broadcastNotification(socketNotification, 'superadmin');
    } else if (input.audience === 'moderators') {
      socketService.broadcastNotification(socketNotification, 'moderator');
    } else {
      socketService.broadcastNotification(socketNotification);
    }

    try {
      const pushSummary = await PushDeliveryService.sendToUsers({
        userIds,
        notificationId: notification._id.toString(),
        title: notification.title,
        message: notification.message,
        type: notification.type,
        routeKey: notification.routeKey,
      });

      notification.pushSummary = pushSummary;
      notification.status =
        pushSummary.failed > 0
          ? pushSummary.succeeded > 0
            ? 'partial'
            : 'failed'
          : 'dispatched';
      await notification.save();
    } catch {
      notification.status = 'failed';
      await notification.save();
      logger.warn('[Notification] Persisted notification push delivery failed', {
        notificationId: notification._id.toString(),
      });
    }

    return notification;
  }

  static async getForUser(userId: string, notificationId: string) {
    if (!Types.ObjectId.isValid(notificationId)) return null;

    const userNotification = await UserNotification.findOne({
      userId: new Types.ObjectId(userId),
      notificationId: new Types.ObjectId(notificationId),
    }).lean();
    if (!userNotification) return null;

    const notification = await Notification.findById(notificationId).lean();
    if (!notification) return null;

    return {
      id: notification._id.toString(),
      title: notification.title,
      message: notification.message,
      type: notification.type,
      routeKey: notification.routeKey,
      isRead: !!userNotification.readAt,
      createdAt: notification.createdAt,
    };
  }

  static async markRead(userId: string, notificationId: string) {
    if (!Types.ObjectId.isValid(notificationId)) return false;

    const result = await UserNotification.updateOne(
      {
        userId: new Types.ObjectId(userId),
        notificationId: new Types.ObjectId(notificationId),
      },
      { $set: { readAt: new Date(), openedAt: new Date() } }
    );
    return result.matchedCount > 0;
  }
}
