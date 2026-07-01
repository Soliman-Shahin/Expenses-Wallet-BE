import { User, UserRole } from '../models/user.model';
import { Expense } from '../models/expense.model';
import { Category } from '../models/category.model';
import logger from './logger.service';
import mongoose from 'mongoose';

/**
 * Admin Service
 *
 * Handles cross-user queries and system-wide aggregations for the Admin Dashboard.
 * Bypasses user-scoped logic found in regular services.
 */
export class AdminService {
  /**
   * Get global system statistics
   */
  async getSystemStats() {
    try {
      const [totalUsers, totalExpenses, totalCategories, recentExpenses] =
        await Promise.all([
          User.countDocuments(),
          Expense.countDocuments(),
          Category.countDocuments(),
          // Get 5 most recent expenses across all users for activity feed
          Expense.find()
            .sort({ date: -1 })
            .limit(5)
            .populate('user', 'email username currency')
            .lean(),
        ]);

      return {
        totalUsers,
        totalExpenses,
        totalCategories,
        recentExpenses,
      };
    } catch (error) {
      logger.error('Error fetching system stats:', error as Error);
      throw error;
    }
  }

  /**
   * List all users with pagination, search, and status filter
   */
  async getUsers(
    page: number = 1,
    limit: number = 10,
    search?: string,
    status: string = 'active',
    sortField: string = 'createdAt',
    sortOrder: number = -1
  ) {
    try {
      const query: any = {};

      if (status === 'active') query._isDeleted = { $ne: true };
      if (status === 'deleted') query._isDeleted = true;

      if (search) {
        query.$or = [
          { email: { $regex: search, $options: 'i' } },
          { username: { $regex: search, $options: 'i' } },
          { fullName: { $regex: search, $options: 'i' } },
        ];
      }

      const skip = (page - 1) * limit;

      const [users, total] = await Promise.all([
        User.find(query)
          .sort({ [sortField]: sortOrder as 1 | -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        User.countDocuments(query),
      ]);

      return {
        data: users,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error fetching admin users:', error as Error);
      throw error;
    }
  }

  /**
   * Get user by ID with their stats
   */
  async getUserById(userId: string) {
    try {
      const user = await User.findById(userId).lean();
      if (!user) throw new Error('User not found');

      const stats = await Expense.aggregate([
        { $match: { user: user._id } },
        {
          $group: {
            _id: null,
            totalSpent: { $sum: '$amount' },
            expenseCount: { $sum: 1 },
          },
        },
      ]);

      return {
        ...user,
        stats: stats[0] || { totalSpent: 0, expenseCount: 0 },
      };
    } catch (error) {
      logger.error('Error fetching admin user by id:', error as Error);
      throw error;
    }
  }

  /**
   * Update user details (e.g., role)
   */
  async updateUser(userId: string, updateData: Partial<typeof User>) {
    try {
      const user = await User.findByIdAndUpdate(userId, updateData, {
        new: true,
        runValidators: true,
      }).lean();
      if (!user) throw new Error('User not found');
      return user;
    } catch (error) {
      logger.error('Error updating user:', error as Error);
      throw error;
    }
  }

  /**
   * Delete user (soft delete)
   */
  async deleteUser(userId: string) {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      user._isDeleted = true;
      await user.save();

      // Also soft delete their expenses and categories
      await Expense.updateMany({ user: user._id }, { _isDeleted: true });
      await Category.updateMany(
        { user: user._id, isDefault: false },
        { _isDeleted: true }
      );

      return user;
    } catch (error) {
      logger.error('Error soft deleting user:', error as Error);
      throw error;
    }
  }

  /**
   * List all categories with pagination, search, and status filter
   */
  async getCategories(
    page: number = 1,
    limit: number = 10,
    search?: string,
    status: string = 'active',
    sortField: string = 'createdAt',
    sortOrder: number = -1
  ) {
    try {
      const query: any = {};

      if (status === 'active') query._isDeleted = { $ne: true };
      if (status === 'deleted') query._isDeleted = true;

      if (search) {
        query.$or = [{ name: { $regex: search, $options: 'i' } }];
      }

      const skip = (page - 1) * limit;

      const [categories, total] = await Promise.all([
        Category.find(query)
          .sort({ isDefault: -1, [sortField]: sortOrder as 1 | -1 })
          .skip(skip)
          .limit(limit)
          .populate('user', 'email username')
          .lean(),
        Category.countDocuments(query),
      ]);

      return {
        data: categories,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error fetching admin categories:', error as Error);
      throw error;
    }
  }

  /**
   * Get category by ID
   */
  async getCategoryById(categoryId: string) {
    try {
      const category = await Category.findById(categoryId)
        .populate('user', 'email username')
        .lean();
      if (!category) throw new Error('Category not found');

      // Get stats for this category across all users
      const stats = await Expense.aggregate([
        { $match: { category: category._id } },
        {
          $group: {
            _id: null,
            totalSpent: { $sum: '$amount' },
            expenseCount: { $sum: 1 },
          },
        },
      ]);

      return {
        ...category,
        stats: stats[0] || { totalSpent: 0, expenseCount: 0 },
      };
    } catch (error) {
      logger.error('Error fetching admin category by id:', error as Error);
      throw error;
    }
  }

  /**
   * Update category details
   */
  async updateCategory(
    categoryId: string,
    updateData: Partial<typeof Category>
  ) {
    try {
      const category = await Category.findById(categoryId);
      if (!category) throw new Error('Category not found');

      // Allow modifying names, colors, icons, but logic prevents deleting if isDefault
      Object.assign(category, updateData);
      await category.save();

      return category;
    } catch (error) {
      logger.error('Error updating category:', error as Error);
      throw error;
    }
  }

  /**
   * Delete category (soft delete)
   */
  async deleteCategory(categoryId: string) {
    try {
      const category = await Category.findById(categoryId);
      if (!category) throw new Error('Category not found');

      if (category.isDefault) {
        throw new Error('Cannot delete a system default category');
      }

      category._isDeleted = true;
      await category.save();

      // We should probably also soft-delete related expenses, or keep them but hide the category
      // For now we will soft-delete the associated expenses
      await Expense.updateMany(
        { category: category._id },
        { _isDeleted: true }
      );

      return category;
    } catch (error) {
      logger.error('Error soft deleting category:', error as Error);
      throw error;
    }
  }

  /**
   * Create a system default category
   */
  async createCategory(categoryData: Partial<typeof Category>) {
    try {
      // Find the admin user to assign as owner, or we can use a system placeholder if not required
      const adminUser = await User.findOne({ role: UserRole.Admin });
      if (!adminUser)
        throw new Error('No admin user found to assign the category to');

      const category = new Category({
        ...categoryData,
        user: adminUser._id,
        isDefault: true,
      });
      await category.save();
      return category;
    } catch (error) {
      logger.error('Error creating category:', error as Error);
      throw error;
    }
  }

  /**
   * List all expenses with pagination and search/filters
   */
  async getExpenses(
    page: number = 1,
    limit: number = 10,
    search?: string,
    status: string = 'active',
    sortField: string = 'date',
    sortOrder: number = -1
  ) {
    try {
      const query: any = {};

      if (status === 'active') query._isDeleted = { $ne: true };
      if (status === 'deleted') query._isDeleted = true;

      if (search) {
        query.$or = [{ description: { $regex: search, $options: 'i' } }];
      }

      const skip = (page - 1) * limit;

      const [expenses, total] = await Promise.all([
        Expense.find(query)
          .sort({ [sortField]: sortOrder as 1 | -1, createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('user', 'email username fullName')
          .populate('category', 'name icon color type')
          .lean(),
        Expense.countDocuments(query),
      ]);

      return {
        data: expenses,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error fetching admin expenses:', error as Error);
      throw error;
    }
  }

  /**
   * Get expense by ID
   */
  async getExpenseById(expenseId: string) {
    try {
      const expense = await Expense.findById(expenseId)
        .populate('user', 'email username fullName')
        .populate('category', 'name icon color type')
        .lean();

      if (!expense) throw new Error('Expense not found');
      return expense;
    } catch (error) {
      logger.error('Error fetching admin expense by id:', error as Error);
      throw error;
    }
  }

  /**
   * Delete expense (soft delete)
   */
  async deleteExpense(expenseId: string) {
    try {
      const expense = await Expense.findById(expenseId);
      if (!expense) throw new Error('Expense not found');

      expense._isDeleted = true;
      await expense.save();

      return expense;
    } catch (error) {
      logger.error('Error soft deleting expense:', error as Error);
      throw error;
    }
  }

  /**
   * Get system health metrics
   */
  async getSystemHealth() {
    try {
      const os = require('os');
      const mongoose = require('mongoose');

      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      const memUsagePercent = (usedMem / totalMem) * 100;

      const cpus = os.cpus();
      const cpuLoad = os.loadavg();

      const dbState = mongoose.connection.readyState;
      const dbStatus =
        dbState === 1
          ? 'Connected'
          : dbState === 2
            ? 'Connecting'
            : dbState === 0
              ? 'Disconnected'
              : 'Unknown';

      return {
        status: 'OK',
        uptime: process.uptime(),
        memory: {
          total: totalMem,
          free: freeMem,
          used: usedMem,
          usagePercent: memUsagePercent.toFixed(2),
        },
        cpu: {
          cores: cpus.length,
          model: cpus[0].model,
          loadAverage: cpuLoad,
        },
        database: {
          status: dbStatus,
          state: dbState,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Error fetching system health:', error as Error);
      throw error;
    }
  }
  /**
   * Get sync operations across all users
   */
  async getSyncOperations(
    page: number = 1,
    limit: number = 20,
    status?: string,
    sortField: string = 'timestamp',
    sortOrder: number = -1
  ) {
    try {
      const SyncOperation = mongoose.model('SyncOperation');
      const query: any = {};
      if (status) query.status = status;

      const skip = (page - 1) * limit;
      const [operations, total] = await Promise.all([
        SyncOperation.find(query)
          .sort({ [sortField]: sortOrder as 1 | -1 })
          .skip(skip)
          .limit(limit)
          .populate('user', 'email username')
          .lean(),
        SyncOperation.countDocuments(query),
      ]);

      return {
        data: operations,
        pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      };
    } catch (error) {
      logger.error('Error fetching admin sync operations:', error as Error);
      throw error;
    }
  }

  /**
   * Get sync conflicts
   */
  async getSyncConflicts(
    page: number = 1,
    limit: number = 20,
    sortField: string = 'timestamp',
    sortOrder: number = -1
  ) {
    try {
      const ConflictResolution = mongoose.model('ConflictResolution');
      const skip = (page - 1) * limit;

      const [conflicts, total] = await Promise.all([
        ConflictResolution.find()
          .sort({ [sortField]: sortOrder as 1 | -1 })
          .skip(skip)
          .limit(limit)
          .populate('user', 'email username')
          .lean(),
        ConflictResolution.countDocuments(),
      ]);

      return {
        data: conflicts,
        pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      };
    } catch (error) {
      logger.error('Error fetching admin sync conflicts:', error as Error);
      throw error;
    }
  }
}

export const adminService = new AdminService();
export default adminService;
