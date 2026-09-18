import { Types } from 'mongoose';
import { NotificationPreference } from '../models/notification-preference.model';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  NotificationCategory,
  NotificationChannel,
  NotificationPreferences,
} from '../notifications/notification-taxonomy';

function defaults(): NotificationPreferences {
  return JSON.parse(JSON.stringify(DEFAULT_NOTIFICATION_PREFERENCES));
}

export class NotificationPreferenceService {
  static async getForUser(userId: string) {
    const userObjectId = new Types.ObjectId(userId);
    const record = await NotificationPreference.findOne({
      userId: userObjectId,
    }).lean();
    return record?.categories ?? defaults();
  }

  static async updateForUser(
    userId: string,
    updates: Partial<
      Record<
        NotificationCategory,
        Partial<Record<NotificationChannel, boolean>>
      >
    >
  ) {
    const categories = await this.getForUser(userId);
    for (const [category, channels] of Object.entries(updates)) {
      if (!channels) continue;
      Object.assign(categories[category as NotificationCategory], channels);
    }
    const record = await NotificationPreference.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      { $set: { categories } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
    return record?.categories ?? categories;
  }
}
