import { Category } from '../models/category.model';
import { Types } from 'mongoose';
import { cacheService } from './cache.service';

export class CategoryService {
  static clearUserCategoryCache(userId: string) {
    cacheService.delByPrefix(`categories:${userId}`);
  }

  static async createCategory(data: any, userId: string) {
    const category = new Category({
      ...data,
      user: userId,
      _syncStatus: 'synced',
      _lastModified: new Date(),
      _version: 1,
      _isDeleted: false,
    });
    const result = await category.save();
    this.clearUserCategoryCache(userId);
    return result;
  }

  static async getCategories(query: any, userId: string) {
    const cacheKey = `categories:${userId}:query:${JSON.stringify(query)}`;
    const cached = cacheService.get<{ data: any[]; total: number }>(cacheKey);
    if (cached) return cached;

    const { q, type, page = 1, limit = 10, sort = 'order' } = query;
    const filter: Record<string, any> = {
      user: userId,
      _isDeleted: { $ne: true }, // Exclude deleted items from normal queries
    };
    if (q) filter.title = { $regex: q, $options: 'i' };
    if (type) filter.type = type;
    const sortField = sort.startsWith('-') ? sort.substring(1) : sort;
    const sortOrder = sort.startsWith('-') ? -1 : 1;
    const sortObj: Record<string, 1 | -1> = {
      [sortField]: sortOrder as 1 | -1,
    };
    const data = await Category.find(filter)
      .populate('user', 'name')
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await Category.countDocuments(filter);
    
    const result = { data, total };
    cacheService.set(cacheKey, result, 300); // Cache for 5 minutes
    return result;
  }

  static async getCategoryById(id: string, userId: string) {
    const cacheKey = `categories:${userId}:id:${id}`;
    const cached = cacheService.get<any>(cacheKey);
    if (cached) return cached;

    const category = await Category.findOne({
      _id: id,
      user: userId,
      _isDeleted: { $ne: true },
    }).populate('user', 'name');

    if (category) {
      cacheService.set(cacheKey, category, 300);
    }
    return category;
  }

  static async updateCategory(id: string, data: any, userId: string) {
    const category = await Category.findOne({ _id: id, user: userId });
    if (!category) return null;

    const currentVersion = category._version || 0;

    const updated = await Category.findOneAndUpdate(
      { _id: id, user: userId },
      {
        ...data,
        modified: new Date(),
        _syncStatus: 'synced',
        _lastModified: new Date(),
        _version: currentVersion + 1,
      },
      { new: true }
    );
    this.clearUserCategoryCache(userId);
    return updated;
  }

  static async deleteCategory(id: string, userId: string) {
    const category = await Category.findOne({ _id: id, user: userId });

    if (!category) {
      return null;
    }

    if (category.isDefault) {
      throw new Error('The default category cannot be deleted.');
    }

    // Soft delete for sync purposes
    const deleted = await Category.findOneAndUpdate(
      { _id: id, user: userId },
      {
        _isDeleted: true,
        _syncStatus: 'synced',
        _lastModified: new Date(),
      },
      { new: true }
    );
    this.clearUserCategoryCache(userId);
    return deleted;
  }

  static async updateOrder(
    categories: { categoryId: string; order: number }[],
    userId: string
  ) {
    const bulkOps = categories.map((category) => ({
      updateOne: {
        filter: {
          _id: new Types.ObjectId(category.categoryId),
          user: new Types.ObjectId(userId),
        },
        update: {
          $set: {
            order: category.order,
            _syncStatus: 'synced',
            _lastModified: new Date(),
          },
          $inc: { _version: 1 },
        } as any,
      },
    }));
    const result = await Category.bulkWrite(bulkOps as any);
    this.clearUserCategoryCache(userId);
    return result;
  }
}
