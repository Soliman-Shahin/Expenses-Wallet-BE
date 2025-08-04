import { Schema, model, Document } from 'mongoose';

export interface IExpense extends Document {
  description: string;
  amount: number;
  category: Schema.Types.ObjectId;
  date: Date;
  user: Schema.Types.ObjectId;
}

const expenseSchema = new Schema(
  {
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    date: { type: Date, required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

const Expense = model<IExpense>('Expense', expenseSchema);
export { Expense };
