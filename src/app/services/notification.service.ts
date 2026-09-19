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
import { NotificationPreferenceService } from './notification-preference.service';
import {
  channelsForPolicy,
  NotificationCategory,
  NotificationChannel,
  NotificationPolicy,
  definitionForEvent,
  NotificationEvent,
} from '../notifications/notification-taxonomy';

interface BroadcastInput {
  title: string;
  message: string;
  type: NotificationType;
  audience: NotificationAudience;
  createdBy: string;
}

export class NotificationService {
  static async dispatchUserEvent(input: {
    userId: string;
    event: NotificationEvent;
    dedupeKey: string;
    title: string;
    message: string;
    metadata?: Record<string, unknown>;
  }) {
    const definition = definitionForEvent(input.event);
    const channels = await this.resolveChannelsForUser(
      input.userId,
      definition.category,
      definition.policy
    );
    let notification;
    try {
      notification = await Notification.create({
        title: input.title,
        message: input.message,
        type: 'warn',
        audience: 'all',
        createdBy: new Types.ObjectId(input.userId),
        routeKey: 'notification-detail',
        event: input.event,
        category: definition.category,
        dedupeKey: input.dedupeKey,
        metadata: input.metadata,
      });
    } catch (error: any) {
      if (error?.code === 11000) return { created: false, channels };
      throw error;
    }
    const userObjectId = new Types.ObjectId(input.userId);
    if (channels.includes('inbox')) {
      await UserNotification.updateOne(
        { notificationId: notification._id, userId: userObjectId },
        {
          $setOnInsert: {
            notificationId: notification._id,
            userId: userObjectId,
          },
        },
        { upsert: true }
      );
    }
    const payload = {
      id: notification._id.toString(),
      title: input.title,
      message: input.message,
      type: 'warn' as const,
      event: input.event,
      category: definition.category,
      metadata: input.metadata,
      createdAt: notification.createdAt,
    };
    if (channels.includes('realtime')) {
      getSocketService().sendNotificationToUser(input.userId, payload);
    }
    if (channels.includes('push')) {
      await PushDeliveryService.sendToUsers({
        userIds: [userObjectId],
        notificationId: notification._id.toString(),
        title: input.title,
        message: input.message,
        type: 'warn',
        routeKey: 'notification-detail',
      });
    }
    return {
      created: true,
      channels,
      notificationId: notification._id.toString(),
    };
  }
  static async resolveChannelsForUser(
    userId: string,
    category: NotificationCategory,
    policy: NotificationPolicy = 'optional'
  ): Promise<NotificationChannel[]> {
    const preferences = await NotificationPreferenceService.getForUser(userId);
    return channelsForPolicy(category, policy, preferences);
  }

  static async listForUser(userId: string, limit = 50, offset = 0) {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const safeOffset = Math.max(offset, 0);
    const rows = await UserNotification.find({
      userId: new Types.ObjectId(userId),
    })
      .sort({ createdAt: -1, _id: -1 })
      .skip(safeOffset)
      .limit(safeLimit)
      .populate({
        path: 'notificationId',
        select: 'title message type routeKey event category metadata createdAt',
      })
      .lean();
    const total = await UserNotification.countDocuments({
      userId: new Types.ObjectId(userId),
    });
    const unreadCount = await UserNotification.countDocuments({
      userId: new Types.ObjectId(userId),
      readAt: { $exists: false },
    });
    return {
      data: rows
        .filter((row: any) => row.notificationId)
        .map((row: any) => ({
          id: row.notificationId._id.toString(),
          title: row.notificationId.title,
          message: row.notificationId.message,
          type: row.notificationId.type,
          routeKey: row.notificationId.routeKey,
          event: row.notificationId.event,
          category: row.notificationId.category,
          metadata: row.notificationId.metadata,
          isRead: !!row.readAt,
          createdAt: row.notificationId.createdAt,
        })),
      total,
      unreadCount,
      hasMore: safeOffset + rows.length < total,
    };
  }

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
    const userIds = recipients.map(
      (recipient) => recipient._id as Types.ObjectId
    );

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
      logger.warn(
        '[Notification] Persisted notification push delivery failed',
        {
          notificationId: notification._id.toString(),
        }
      );
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
      event: notification.event,
      category: notification.category,
      metadata: notification.metadata,
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

  static async markAllRead(userId: string) {
    const result = await UserNotification.updateMany(
      { userId: new Types.ObjectId(userId), readAt: { $exists: false } },
      { $set: { readAt: new Date(), openedAt: new Date() } }
    );
    return { updatedCount: result.modifiedCount };
  }
}
