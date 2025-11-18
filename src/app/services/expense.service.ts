import { Expense } from "../models/expense.model";
import mongoose from "mongoose";

export class ExpenseService {
  static async createExpense(data: any, userId: string) {
    const expense = new Expense({
      ...data,
      user: userId,
      _syncStatus: 'synced',
      _lastModified: new Date(),
      _version: 1,
      _isDeleted: false
    });
    return expense.save();
  }

  static async getExpenses(
    userId: string,
    filters?: {
      search?: string;
      category?: string;
      type?: "income" | "outcome";
      startDate?: string;
      endDate?: string;
      limit?: number;
      skip?: number;
    }
  ) {
    const query: any = {
      user: userId,
      _isDeleted: { $ne: true } // Exclude deleted items from normal queries
    };

    // Date range filter
    if (filters?.startDate || filters?.endDate) {
      query.date = {};
      if (filters.startDate) query.date.$gte = new Date(filters.startDate);
      if (filters.endDate) query.date.$lte = new Date(filters.endDate);
    }

    // Search filter (description only) - moved to query
    if (filters?.search) {
      query.description = { $regex: filters.search, $options: 'i' };
    }

    // Category filter - moved to query
    if (filters?.category) {
      query.category = filters.category;
    }

    // Build aggregation pipeline for type filter (requires category lookup)
    if (filters?.type) {
      const skip = filters?.skip || 0;
      const limit = filters?.limit || 50;

      const pipeline = [
        { $match: query },
        {
          $lookup: {
            from: 'categories',
            localField: 'category',
            foreignField: '_id',
            as: 'categoryDetails'
          }
        },
        { $unwind: '$categoryDetails' },
        { $match: { 'categoryDetails.type': filters.type } },
        { $sort: { date: -1 } },
        {
          $facet: {
            data: [
              { $skip: skip },
              { $limit: limit }
            ],
            total: [
              { $count: 'count' }
            ]
          }
        }
      ];

      const result = await Expense.aggregate(pipeline as any);
      const data = result[0]?.data || [];
      const total = result[0]?.total[0]?.count || 0;

      // Populate category for returned data
      await Expense.populate(data, { path: 'category' });

      return {
        data,
        total,
        hasMore: skip + limit < total,
      };
    }

    // Standard query without type filter
    const skip = filters?.skip || 0;
    const limit = filters?.limit || 50;

    const [data, total] = await Promise.all([
      Expense.find(query)
        .populate('category')
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Expense.countDocuments(query)
    ]);

    return {
      data,
      total,
      hasMore: skip + limit < total,
    };
  }

  static async getExpenseById(id: string, userId: string) {
    return Expense.findOne({
      _id: id,
      user: userId,
      _isDeleted: { $ne: true }
    }).populate("category");
  }

  static async updateExpense(id: string, data: any, userId: string) {
    const expense = await Expense.findOne({ _id: id, user: userId });
    if (!expense) return null;

    const currentVersion = expense._version || 0;
    
    return Expense.findOneAndUpdate(
      { _id: id, user: userId },
      {
        ...data,
        _syncStatus: 'synced',
        _lastModified: new Date(),
        _version: currentVersion + 1
      },
      { new: true, runValidators: true }
    ).populate("category");
  }

  static async deleteExpense(id: string, userId: string) {
    // Soft delete for sync purposes
    return Expense.findOneAndUpdate(
      { _id: id, user: userId },
      {
        _isDeleted: true,
        _syncStatus: 'synced',
        _lastModified: new Date()
      },
      { new: true }
    );
  }

  static async getExpenseTotals(
    userId: string,
    startDate: string,
    endDate: string
  ) {
    const totals = await Expense.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId),
          _isDeleted: { $ne: true },
          date: {
            $gte: new Date(startDate),
            $lte: new Date(endDate),
          },
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "categoryDetails",
        },
      },
      { $unwind: "$categoryDetails" },
      {
        $group: {
          _id: "$categoryDetails.type",
          total: { $sum: "$amount" },
        },
      },
    ]);
    const result = { income: 0, expenses: 0 };
    totals.forEach((item: any) => {
      if (item._id === "income") result.income = item.total;
      else if (item._id === "outcome") result.expenses = item.total;
    });
    return result;
  }
}
