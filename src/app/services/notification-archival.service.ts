import { UserNotification } from '../models/user-notification.model';

export const NOTIFICATION_ARCHIVE_AFTER_DAYS = 90;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export class NotificationArchivalService {
  static async archiveEligible(
    referenceTime: Date = new Date()
  ): Promise<number> {
    const cutoff = new Date(
      referenceTime.getTime() - NOTIFICATION_ARCHIVE_AFTER_DAYS * MS_PER_DAY
    );
    const result = await UserNotification.updateMany(
      { archivedAt: { $exists: false }, createdAt: { $lte: cutoff } },
      { $set: { archivedAt: referenceTime } }
    );
    return result.modifiedCount;
  }
}
