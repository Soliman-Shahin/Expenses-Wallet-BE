import { Schema, model } from 'mongoose';
import { Expense } from './expense.model';

const categorySchema = new Schema(
  {
    title: { type: String, required: true },
    icon: { type: String, required: true },
    color: { type: String, required: true },
    type: {
      type: String,
      enum: ['income', 'outcome'],
      default: 'outcome',
    },
    order: { type: Number, default: 0 },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isDefault: { type: Boolean, default: false },
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

// Create the Category model using generics
categorySchema.pre('deleteOne', { document: true, query: false }, async function (next) {
  try {
    // Find the default category for the user
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const defaultCategory = await this.constructor.findOne({ user: this.user, isDefault: true });

    if (defaultCategory) {
      // Re-assign expenses to the default category
      await Expense.updateMany({ category: this._id }, { $set: { category: defaultCategory._id } });
    } else {
      // Fallback for safety, though this should not be reached for new users
      await Expense.updateMany({ category: this._id }, { $set: { category: null } });
    }
    next();
  } catch (error: any) {
    next(error);
  }
});

// Index for sync operations
categorySchema.index({ user: 1, _lastModified: -1 });
categorySchema.index({ user: 1, _syncStatus: 1 });
categorySchema.index({ _clientId: 1 });

const Category = model('Category', categorySchema);
export { Category };
