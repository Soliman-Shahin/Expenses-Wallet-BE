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

const Category = model('Category', categorySchema);
export { Category };
