import { Response } from 'express';
import { sendError, sendSuccess } from '../shared/helper';
import { CustomRequest } from '../types/custom-request';
import { ExpenseService } from '../services/expense.service';

export const createExpense = async (req: CustomRequest, res: Response) => {
  try {
    const user = req.user_id || '';
    const expense = await ExpenseService.createExpense(req.body, user);
    sendSuccess(res, expense, 'Expense created successfully');
  } catch (error: any) {
    sendError(res, error.message);
  }
};

export const getExpenses = async (req: CustomRequest, res: Response) => {
  try {
    const user = req.user_id || '';
    const { search, category, type, startDate, endDate, limit, skip } = req.query;
    
    const filters = {
      search: search as string,
      category: category as string,
      type: type as 'income' | 'expense',
      startDate: startDate as string,
      endDate: endDate as string,
      limit: limit ? parseInt(limit as string) : undefined,
      skip: skip ? parseInt(skip as string) : undefined,
    };

    const expenses = await ExpenseService.getExpenses(user, filters);
    sendSuccess(res, expenses);
  } catch (error: any) {
    sendError(res, error.message);
  }
};

export const getExpenseById = async (req: CustomRequest, res: Response) => {
  try {
    const id = req.params.id || '';
    const user = req.user_id || '';
    const expense = await ExpenseService.getExpenseById(id, user);
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
    const id = req.params.id || '';
    const user = req.user_id || '';
    const updatedExpense = await ExpenseService.updateExpense(id, req.body, user);
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
    const id = req.params.id || '';
    const user = req.user_id || '';
    const deletedExpense = await ExpenseService.deleteExpense(id, user);
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
    const user = req.user_id || '';
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return sendError(res, 'Start date and end date are required', 400);
    }
    const result = await ExpenseService.getExpenseTotals(user, String(startDate), String(endDate));
    sendSuccess(res, result);
  } catch (error: any) {
    sendError(res, error.message);
  }
};
