import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../shared/helper';
import { adminService } from '../services/admin.service';
import logger from '../services/logger.service';

/**
 * Admin Controller
 *
 * Handles administrative endpoints.
 */
export class AdminController {
  /**
   * Get global system statistics
   * GET /v1/admin/stats
   */
  async getStats(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      logger.info('Admin pulling system stats');
      const stats = await adminService.getSystemStats();
      sendSuccess(res, stats, 'System statistics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all users
   * GET /v1/admin/users
   */
  async getUsers(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;

      const result = await adminService.getUsers(page, limit, search);
      sendSuccess(res, result, 'Users retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a specific user by ID
   * GET /v1/admin/users/:id
   */
  async getUserById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const user = await adminService.getUserById(req.params.id as string);
      sendSuccess(res, user, 'User retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a user (e.g., role)
   * PUT /v1/admin/users/:id
   */
  async updateUser(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const user = await adminService.updateUser(req.params.id as string, req.body);
      sendSuccess(res, user, 'User updated successfully');
    } catch (error) {
      next(error);
    }
  }
  /**
   * Get all categories
   * GET /v1/admin/categories
   */
  async getCategories(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;

      const result = await adminService.getCategories(page, limit, search);
      sendSuccess(res, result, 'Categories retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a specific category by ID
   * GET /v1/admin/categories/:id
   */
  async getCategoryById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const category = await adminService.getCategoryById(req.params.id as string);
      sendSuccess(res, category, 'Category retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a category
   * PUT /v1/admin/categories/:id
   */
  async updateCategory(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const category = await adminService.updateCategory(
        req.params.id as string,
        req.body
      );
      sendSuccess(res, category, 'Category updated successfully');
    } catch (error) {
      next(error);
    }
  }
  /**
   * Get all expenses
   * GET /v1/admin/expenses
   */
  async getExpenses(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;

      const result = await adminService.getExpenses(page, limit, search);
      sendSuccess(res, result, 'Expenses retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a specific expense by ID
   * GET /v1/admin/expenses/:id
   */
  async getExpenseById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const expense = await adminService.getExpenseById(req.params.id as string);
      sendSuccess(res, expense, 'Expense retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get system health metrics
   * GET /v1/admin/health
   */
  async getSystemHealth(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const health = await adminService.getSystemHealth();
      sendSuccess(res, health, 'System health retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
  /**
   * Get sync operations
   * GET /v1/admin/sync/operations
   */
  async getSyncOperations(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string;

      const result = await adminService.getSyncOperations(page, limit, status);
      sendSuccess(res, result, 'Sync operations retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get sync conflicts
   * GET /v1/admin/sync/conflicts
   */
  async getSyncConflicts(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await adminService.getSyncConflicts(page, limit);
      sendSuccess(res, result, 'Sync conflicts retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}
export const adminController = new AdminController();
export default adminController;
