import { Expense } from '../models/expense.model';
import mongoose from 'mongoose';

export class ExpenseService {
  static async createExpense(data: any, userId: string) {
    const expense = new Expense({ ...data, user: userId });
    return expense.save();
  }

  static async getExpenses(userId: string, filters?: {
    search?: string;
    category?: string;
    type?: 'income' | 'expense';
    startDate?: string;
    endDate?: string;
    limit?: number;
    skip?: number;
  }) {
    const query: any = { user: userId };
    
    // Date range filter
    if (filters?.startDate || filters?.endDate) {
      query.date = {};
      if (filters.startDate) query.date.$gte = new Date(filters.startDate);
      if (filters.endDate) query.date.$lte = new Date(filters.endDate);
    }

    let expenseQuery = Expense.find(query).populate('category');

    // Apply search after population
    const expenses = await expenseQuery.exec();
    
    let filteredExpenses = expenses;

    // Search filter (description only)
    if (filters?.search) {
      const searchTerm = filters.search.toLowerCase();
      filteredExpenses = filteredExpenses.filter(expense => 
        expense.description?.toLowerCase().includes(searchTerm)
      );
    }

    // Category filter
    if (filters?.category) {
      filteredExpenses = filteredExpenses.filter(expense => 
        expense.category && (expense.category as any)._id.toString() === filters.category
      );
    }

    // Type filter (income/expense)
    if (filters?.type) {
      filteredExpenses = filteredExpenses.filter(expense => 
        expense.category && (expense.category as any).type === filters.type
      );
    }

    // Sort by date (newest first)
    filteredExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Pagination
    const skip = filters?.skip || 0;
    const limit = filters?.limit || filteredExpenses.length;
    
    return {
      data: filteredExpenses.slice(skip, skip + limit),
      total: filteredExpenses.length,
      hasMore: skip + limit < filteredExpenses.length
    };
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
