import { Types } from 'mongoose';
import { DevicePushToken } from '../models/device-push-token.model';
import logger from './logger.service';
import { firebaseAdminService } from './firebase-admin.service';

export interface PushDeliverySummary {
  attempted: number;
  succeeded: number;
  failed: number;
  invalidTokens: number;
}

const INVALID_TOKEN_CODES = new Set([
  'messaging/invalid-registration-token',
  'messaging/registration-token-not-registered',
]);

export class PushDeliveryService {
  static async sendToUsers(input: {
    userIds: Types.ObjectId[];
    notificationId: string;
    title: string;
    message: string;
    type: string;
    routeKey: string;
  }): Promise<PushDeliverySummary> {
    const messaging = firebaseAdminService.getMessaging();
    if (!messaging || input.userIds.length === 0) {
      return { attempted: 0, succeeded: 0, failed: 0, invalidTokens: 0 };
    }

    const devices = await DevicePushToken.find({
      userId: { $in: input.userIds },
      active: true,
    })
      .select('+token')
      .lean();

    const summary: PushDeliverySummary = {
      attempted: devices.length,
      succeeded: 0,
      failed: 0,
      invalidTokens: 0,
    };

    for (let offset = 0; offset < devices.length; offset += 500) {
      const batch = devices.slice(offset, offset + 500);

      try {
        const response = await messaging.sendEachForMulticast({
          tokens: batch.map((device) => device.token),
          notification: {
            title: input.title,
            body: input.message,
          },
          data: {
            notificationId: input.notificationId,
            type: input.type,
            routeKey: input.routeKey,
          },
          android: {
            priority: 'high',
            notification: {
              channelId: 'expenses_wallet_general',
              tag: input.notificationId,
            },
          },
        });

        summary.succeeded += response.successCount;
        summary.failed += response.failureCount;

        const invalidDeviceIds: Types.ObjectId[] = [];
        response.responses.forEach((result, index) => {
          if (
            !result.success &&
            result.error?.code &&
            INVALID_TOKEN_CODES.has(result.error.code)
          ) {
            invalidDeviceIds.push(batch[index]._id as Types.ObjectId);
          }
        });

        if (invalidDeviceIds.length > 0) {
          summary.invalidTokens += invalidDeviceIds.length;
          await DevicePushToken.updateMany(
            { _id: { $in: invalidDeviceIds } },
            {
              active: false,
              invalidatedAt: new Date(),
              invalidReason: 'provider_rejected',
            }
          );
        }
      } catch {
        summary.failed += batch.length;
        logger.warn('[Push] FCM batch delivery failed');
      }
    }

    logger.info('[Push] Delivery completed', {
      notificationId: input.notificationId,
      ...summary,
    });
    return summary;
  }
}
