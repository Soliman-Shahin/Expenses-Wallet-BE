import mongoose, { Schema, Document, Model } from 'mongoose';
import { Permission } from '../types/permissions.types';

/**
 * Temporary Permission Model
 *
 * Allows granting time-limited permissions to users.
 * Useful for trials, temporary admin access, or time-limited features.
 */

export interface ITemporaryPermission extends Document {
  userId: mongoose.Types.ObjectId;
  permission: Permission;
  grantedBy: mongoose.Types.ObjectId;
  grantedAt: Date;
  startDate: Date;
  endDate: Date;
  reason?: string;
  metadata?: Record<string, any>;
  isActive: boolean;
  revokedAt?: Date;
  revokedBy?: mongoose.Types.ObjectId;
  revokeReason?: string;

  // Instance methods
  hasStarted(): boolean;
  hasExpired(): boolean;
  revoke(revokedBy: mongoose.Types.ObjectId, reason?: string): void;
}

// Model interface with static methods
export interface ITemporaryPermissionModel extends Model<ITemporaryPermission> {
  findActiveForUser(
    userId: string | mongoose.Types.ObjectId
  ): Promise<ITemporaryPermission[]>;
  findExpired(): Promise<ITemporaryPermission[]>;
  findExpiringSoon(hoursFromNow: number): Promise<ITemporaryPermission[]>;
}

const TemporaryPermissionSchema = new Schema<ITemporaryPermission>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    permission: {
      type: String,
      required: true,
      enum: Object.values(Permission),
      index: true,
    },
    grantedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    grantedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
      index: true,
    },
    endDate: {
      type: Date,
      required: true,
      index: true,
    },
    reason: {
      type: String,
      maxlength: 500,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    revokedAt: {
      type: Date,
    },
    revokedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    revokeReason: {
      type: String,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
    collection: 'temporary_permissions',
  }
);

// Compound indexes for efficient queries
TemporaryPermissionSchema.index({ userId: 1, isActive: 1 });
TemporaryPermissionSchema.index({ userId: 1, permission: 1, isActive: 1 });
TemporaryPermissionSchema.index({ endDate: 1, isActive: 1 });

// Virtual: Check if permission is currently valid
TemporaryPermissionSchema.virtual('isValid').get(function () {
  if (!this.isActive) return false;

  const now = new Date();
  return now >= this.startDate && now <= this.endDate;
});

// Virtual: Time remaining in milliseconds
TemporaryPermissionSchema.virtual('timeRemaining').get(function () {
  if (!this.isActive) return 0;

  const now = new Date();
  if (now < this.startDate || now > this.endDate) return 0;

  return Math.max(0, this.endDate.getTime() - now.getTime());
});

// Virtual: Duration in milliseconds
TemporaryPermissionSchema.virtual('duration').get(function () {
  return this.endDate.getTime() - this.startDate.getTime();
});

// Method: Check if permission has started
TemporaryPermissionSchema.methods.hasStarted = function (): boolean {
  return new Date() >= this.startDate;
};

// Method: Check if permission has expired
TemporaryPermissionSchema.methods.hasExpired = function (): boolean {
  return new Date() > this.endDate;
};

// Method: Revoke permission
TemporaryPermissionSchema.methods.revoke = function (
  revokedBy: mongoose.Types.ObjectId,
  reason?: string
): void {
  this.isActive = false;
  this.revokedAt = new Date();
  this.revokedBy = revokedBy;
  if (reason) this.revokeReason = reason;
};

// Static: Find active permissions for user
TemporaryPermissionSchema.statics.findActiveForUser = function (
  userId: string | mongoose.Types.ObjectId
) {
  const now = new Date();
  return this.find({
    userId,
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
  });
};

// Static: Find expired permissions
TemporaryPermissionSchema.statics.findExpired = function () {
  const now = new Date();
  return this.find({
    isActive: true,
    endDate: { $lt: now },
  });
};

// Static: Find permissions expiring soon
TemporaryPermissionSchema.statics.findExpiringSoon = function (
  hoursFromNow: number = 24
) {
  const now = new Date();
  const threshold = new Date(now.getTime() + hoursFromNow * 60 * 60 * 1000);

  return this.find({
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now, $lte: threshold },
  });
};

// Pre-save validation
TemporaryPermissionSchema.pre('save', async function () {
  // Ensure endDate is after startDate
  if (this.endDate <= this.startDate) {
    throw new Error('End date must be after start date');
  }

  // Ensure dates are in the future (for new permissions)
  if (this.isNew && this.endDate <= new Date()) {
    throw new Error('End date must be in the future');
  }
});

export const TemporaryPermission = mongoose.model<
  ITemporaryPermission,
  ITemporaryPermissionModel
>('TemporaryPermission', TemporaryPermissionSchema);
