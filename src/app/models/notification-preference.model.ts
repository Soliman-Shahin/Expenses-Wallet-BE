import { Document, Schema, Types, model } from 'mongoose';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  NotificationCategory,
  NotificationPreferences,
} from '../notifications/notification-taxonomy';

export interface NotificationPreferenceDocument extends Document {
  userId: Types.ObjectId;
  categories: NotificationPreferences;
  createdAt: Date;
  updatedAt: Date;
}

const channels = new Schema(
  {
    inbox: { type: Boolean, default: true },
    realtime: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
  },
  { _id: false }
);

const schema = new Schema<NotificationPreferenceDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    categories: {
      sync: {
        type: channels,
        default: () => DEFAULT_NOTIFICATION_PREFERENCES.sync,
      },
      subscription: {
        type: channels,
        default: () => DEFAULT_NOTIFICATION_PREFERENCES.subscription,
      },
      security: {
        type: channels,
        default: () => DEFAULT_NOTIFICATION_PREFERENCES.security,
      },
      general: {
        type: channels,
        default: () => DEFAULT_NOTIFICATION_PREFERENCES.general,
      },
    },
  },
  { timestamps: true, collection: 'notification_preferences' }
);

export const NotificationPreference = model<NotificationPreferenceDocument>(
  'NotificationPreference',
  schema
);

export const NOTIFICATION_PREFERENCE_CATEGORIES: NotificationCategory[] = [
  'sync',
  'subscription',
  'security',
  'general',
];
