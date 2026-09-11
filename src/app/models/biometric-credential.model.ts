import { Document, Model, Schema, Types, model } from 'mongoose';

export type BiometricPlatform = 'android' | 'ios';
export interface BiometricCredentialDocument extends Document {
  userId: Types.ObjectId;
  deviceId: string;
  credentialHash: string;
  label: string;
  platform: BiometricPlatform;
  createdAt: Date;
  updatedAt: Date;
  lastUsedAt?: Date;
  revokedAt?: Date;
  revokedReason?: string;
}
const schema = new Schema<BiometricCredentialDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    deviceId: { type: String, required: true, trim: true, maxlength: 128 },
    credentialHash: {
      type: String,
      required: true,
      unique: true,
      select: false,
    },
    label: { type: String, required: true, trim: true, maxlength: 100 },
    platform: { type: String, enum: ['android', 'ios'], required: true },
    lastUsedAt: Date,
    revokedAt: Date,
    revokedReason: { type: String, maxlength: 100 },
  },
  { timestamps: true, collection: 'biometric_credentials' }
);
schema.index({ userId: 1, deviceId: 1 }, { unique: true });
schema.index({ userId: 1, revokedAt: 1 });
export const BiometricCredential: Model<BiometricCredentialDocument> = model(
  'BiometricCredential',
  schema
);
