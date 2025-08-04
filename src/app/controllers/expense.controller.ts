import { Response } from 'express';
import mongoose from 'mongoose';
import { Expense } from '../models';
import { sendError, sendSuccess } from '../shared/helper';
import { CustomRequest } from '../types/custom-request';

export const createExpense = async (req: CustomRequest, res: Response) => {
  try {
    const { description, amount, category, date } = req.body;
    const user = req.user_id;

    const newExpense = new Expense({ description, amount, category, date, user });
    await newExpense.save();

    sendSuccess(res, newExpense, 'Expense created successfully');
  } catch (error: any) {
    sendError(res, error.message);
  }
};

export const getExpenses = async (req: CustomRequest, res: Response) => {
  try {
    const user = req.user_id;
    const expenses = await Expense.find({ user }).populate('category');
    sendSuccess(res, expenses);
  } catch (error: any) {
    sendError(res, error.message);
  }
};

export const getExpenseById = async (req: CustomRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user_id;

    const expense = await Expense.findOne({ _id: id, user }).populate('category');
    if (!expense) {
      return sendError(res, 'Expense not found', 404);
    }

    sendSuccess(res, expense);
  } catch (error: any) {
    sendError(res, error.message);
  }
};

export const updateExpense = async (req: CustomRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user_id;
    const { description, amount, category, date } = req.body;

    const updatedExpense = await Expense.findOneAndUpdate(
      { _id: id, user },
      { description, amount, category, date },
      { new: true, runValidators: true }
    ).populate('category');

    if (!updatedExpense) {
      return sendError(res, 'Expense not found', 404);
    }

    sendSuccess(res, updatedExpense, 'Expense updated successfully');
  } catch (error: any) {
    sendError(res, error.message);
  }
};

export const deleteExpense = async (req: CustomRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user_id;

    const deletedExpense = await Expense.findOneAndDelete({ _id: id, user });

    if (!deletedExpense) {
      return sendError(res, 'Expense not found', 404);
    }

    sendSuccess(res, {}, 'Expense deleted successfully');
  } catch (error: any) {
    sendError(res, error.message);
  }
};

export const getExpenseTotals = async (req: CustomRequest, res: Response) => {
  try {
    const user = req.user_id;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return sendError(res, 'Start date and end date are required', 400);
    }

    const totals = await Expense.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(user),
          date: {
            $gte: new Date(startDate as string),
            $lte: new Date(endDate as string),
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
      {
        $unwind: '$categoryDetails',
      },
      {
        $group: {
          _id: '$categoryDetails.type',
          total: { $sum: '$amount' },
        },
      },
    ]);

    const result = {
      income: 0,
      expenses: 0,
    };

    totals.forEach(item => {
      if (item._id === 'income') {
        result.income = item.total;
      } else if (item._id === 'expense') {
        result.expenses = item.total;
      }
    });

    sendSuccess(res, result);
  } catch (error: any) {
    sendError(res, error.message);
  }
};
