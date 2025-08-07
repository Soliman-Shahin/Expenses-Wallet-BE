import { Expense } from '../models/expense.model';
import mongoose from 'mongoose';

export class ExpenseService {
  static async createExpense(data: any, userId: string) {
    const expense = new Expense({ ...data, user: userId });
    return expense.save();
  }

  static async getExpenses(userId: string) {
    return Expense.find({ user: userId }).populate('category');
  }

  static async getExpenseById(id: string, userId: string) {
    return Expense.findOne({ _id: id, user: userId }).populate('category');
  }

  static async updateExpense(id: string, data: any, userId: string) {
    return Expense.findOneAndUpdate(
      { _id: id, user: userId },
      { ...data },
      { new: true, runValidators: true }
    ).populate('category');
  }

  static async deleteExpense(id: string, userId: string) {
    return Expense.findOneAndDelete({ _id: id, user: userId });
  }

  static async getExpenseTotals(userId: string, startDate: string, endDate: string) {
    const totals = await Expense.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId),
          date: {
            $gte: new Date(startDate),
            $lte: new Date(endDate),
          },
        },
      },
      {
        $lookup: {
          from: 'categories',
          localField: 'category',
          foreignField: '_id',
          as: 'categoryDetails',
        },
      },
      { $unwind: '$categoryDetails' },
      {
        $group: {
          _id: '$categoryDetails.type',
          total: { $sum: '$amount' },
        },
      },
    ]);
    const result = { income: 0, expenses: 0 };
    totals.forEach((item: any) => {
      if (item._id === 'income') result.income = item.total;
      else if (item._id === 'expense') result.expenses = item.total;
    });
    return result;
  }
}
