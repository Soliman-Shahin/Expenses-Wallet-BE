import { Schema, model, Document } from 'mongoose';

export interface ISyncOperation extends Document {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  entityType: 'expense' | 'category' | 'user';
  entityId: string;
  data: any;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
  status: 'synced' | 'pending' | 'conflict' | 'error' | 'offline';
  error?: string;
  user: Schema.Types.ObjectId;
}

export interface IConflictResolution extends Document {
  entityId: string;
  entityType: string;
  localData: any;
  serverData: any;
  resolution: 'local' | 'server' | 'merge';
  mergedData?: any;
  timestamp: Date;
  user: Schema.Types.ObjectId;
}

export interface ISyncMetadata extends Document {
  lastSyncTime: Date;
  totalEntities: number;
  pendingCount: number;
  conflictCount: number;
  errorCount: number;
  isOnline: boolean;
  isSyncing: boolean;
  user: Schema.Types.ObjectId;
}

const syncOperationSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    type: { 
      type: String, 
      enum: ['CREATE', 'UPDATE', 'DELETE'],
      required: true 
    },
    entityType: { 
      type: String, 
      enum: ['expense', 'category', 'user'],
      required: true 
    },
    entityId: { type: String, required: true },
    data: { type: Schema.Types.Mixed, required: true },
    timestamp: { type: Date, default: Date.now },
    retryCount: { type: Number, default: 0 },
    maxRetries: { type: Number, default: 3 },
    status: { 
      type: String, 
      enum: ['synced', 'pending', 'conflict', 'error', 'offline'],
      default: 'pending'
    },
    error: { type: String },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

const conflictResolutionSchema = new Schema(
  {
    entityId: { type: String, required: true },
    entityType: { type: String, required: true },
    localData: { type: Schema.Types.Mixed, required: true },
    serverData: { type: Schema.Types.Mixed, required: true },
    resolution: { 
      type: String, 
      enum: ['local', 'server', 'merge'],
      required: true 
    },
    mergedData: { type: Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

const syncMetadataSchema = new Schema(
  {
    lastSyncTime: { type: Date, default: Date.now },
    totalEntities: { type: Number, default: 0 },
    pendingCount: { type: Number, default: 0 },
    conflictCount: { type: Number, default: 0 },
    errorCount: { type: Number, default: 0 },
    isOnline: { type: Boolean, default: true },
    isSyncing: { type: Boolean, default: false },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true }
  },
  { timestamps: true }
);

// Indexes for sync operations
syncOperationSchema.index({ user: 1, status: 1 });
syncOperationSchema.index({ user: 1, timestamp: -1 });
syncOperationSchema.index({ id: 1 });

conflictResolutionSchema.index({ user: 1, timestamp: -1 });
conflictResolutionSchema.index({ entityId: 1, entityType: 1 });

syncMetadataSchema.index({ user: 1 });

export const SyncOperation = model<ISyncOperation>('SyncOperation', syncOperationSchema);
export const ConflictResolution = model<IConflictResolution>('ConflictResolution', conflictResolutionSchema);
export const SyncMetadata = model<ISyncMetadata>('SyncMetadata', syncMetadataSchema);
