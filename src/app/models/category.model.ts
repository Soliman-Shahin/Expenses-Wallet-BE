import { Schema, model } from 'mongoose';

const categorySchema = new Schema(
  {
    title: { type: String, required: true },
    icon: { type: String, required: true },
    color: { type: String, required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// Create the Category model using generics
const Category = model('Category', categorySchema);
export { Category };
