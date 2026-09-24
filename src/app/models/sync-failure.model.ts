import { Document, Schema, Types, model } from 'mongoose';

export interface ISyncFailure extends Document {
  user: Types.ObjectId;
  registrationId: string;
  operationId: string;
  entityType: string;
  entityId: string;
  attemptCount: number;
  terminal: boolean;
  dispatchState: 'pending' | 'dispatching' | 'dispatched';
  updatedAt: Date;
}

const syncFailureSchema = new Schema<ISyncFailure>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    registrationId: { type: String, required: true, trim: true, maxlength: 64 },
    operationId: { type: String, required: true, trim: true, maxlength: 64 },
    entityType: { type: String, required: true },
    entityId: { type: String, required: true, maxlength: 200 },
    attemptCount: { type: Number, required: true, min: 0, default: 0 },
    terminal: { type: Boolean, required: true, default: false },
    dispatchState: {
      type: String,
      enum: ['pending', 'dispatching', 'dispatched'],
      required: true,
      default: 'pending',
    },
  },
  { timestamps: true, collection: 'sync_failures' }
);

syncFailureSchema.index({ user: 1, registrationId: 1 }, { unique: true });
syncFailureSchema.index({ user: 1, operationId: 1 });

export const SyncFailure = model<ISyncFailure>(
  'SyncFailure',
  syncFailureSchema
);
