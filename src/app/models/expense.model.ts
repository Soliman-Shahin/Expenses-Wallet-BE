import { Schema, model, Document } from 'mongoose';

export interface IExpense extends Document {
  description: string;
  amount: number;
  category: Schema.Types.ObjectId;
  date: Date;
  user: Schema.Types.ObjectId;
  // Sync fields
  _syncStatus?: 'synced' | 'pending' | 'conflict' | 'error' | 'offline';
  _lastModified?: Date;
  _version?: number;
  _isDeleted?: boolean;
  _conflictData?: any;
  _clientId?: string; // For offline sync
}

const expenseSchema = new Schema(
  {
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    date: { type: Date, required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    // Sync fields
    _syncStatus: { 
      type: String, 
      enum: ['synced', 'pending', 'conflict', 'error', 'offline'],
      default: 'synced'
    },
    _lastModified: { type: Date, default: Date.now },
    _version: { type: Number, default: 1 },
    _isDeleted: { type: Boolean, default: false },
    _conflictData: { type: Schema.Types.Mixed },
    _clientId: { type: String }
  },
  { timestamps: true }
);

// Index for sync operations
expenseSchema.index({ user: 1, _lastModified: -1 });
expenseSchema.index({ user: 1, _syncStatus: 1 });
expenseSchema.index({ _clientId: 1 });

const Expense = model<IExpense>('Expense', expenseSchema);
export { Expense };
