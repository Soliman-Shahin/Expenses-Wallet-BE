import { Document, Schema, Types, model } from 'mongoose';

export interface UserNotificationDocument extends Document {
  notificationId: Types.ObjectId;
  userId: Types.ObjectId;
  readAt?: Date;
  openedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserNotificationSchema = new Schema<UserNotificationDocument>(
  {
    notificationId: {
      type: Schema.Types.ObjectId,
      ref: 'Notification',
      required: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    readAt: Date,
    openedAt: Date,
  },
  { timestamps: true }
);

UserNotificationSchema.index(
  { notificationId: 1, userId: 1 },
  { unique: true }
);
UserNotificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });

export const UserNotification = model<UserNotificationDocument>(
  'UserNotification',
  UserNotificationSchema
);
