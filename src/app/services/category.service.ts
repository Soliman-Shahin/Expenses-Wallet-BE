import { Category } from "../models/category.model";
import { Types } from "mongoose";

export class CategoryService {
  static async createCategory(data: any, userId: string) {
    const category = new Category({
      ...data,
      user: userId,
      _syncStatus: 'synced',
      _lastModified: new Date(),
      _version: 1,
      _isDeleted: false
    });
    return category.save();
  }

  static async getCategories(query: any, userId: string) {
    const { q, type, page = 1, limit = 10, sort = "order" } = query;
    const filter: Record<string, any> = {
      user: userId,
      _isDeleted: { $ne: true } // Exclude deleted items from normal queries
    };
    if (q) filter.title = { $regex: q, $options: "i" };
    if (type) filter.type = type;
    const sortField = sort.startsWith("-") ? sort.substring(1) : sort;
    const sortOrder = sort.startsWith("-") ? -1 : 1;
    const sortObj: Record<string, 1 | -1> = {
      [sortField]: sortOrder as 1 | -1,
    };
    const data = await Category.find(filter)
      .populate("user", "name")
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await Category.countDocuments(filter);
    return { data, total };
  }

  static async getCategoryById(id: string, userId: string) {
    return Category.findOne({
      _id: id,
      user: userId,
      _isDeleted: { $ne: true }
    }).populate("user", "name");
  }

  static async updateCategory(id: string, data: any, userId: string) {
    const category = await Category.findOne({ _id: id, user: userId });
    if (!category) return null;

    const currentVersion = category._version || 0;
    
    return Category.findOneAndUpdate(
      { _id: id, user: userId },
      {
        ...data,
        modified: new Date(),
        _syncStatus: 'synced',
        _lastModified: new Date(),
        _version: currentVersion + 1
      },
      { new: true }
    );
  }

  static async deleteCategory(id: string, userId: string) {
    const category = await Category.findOne({ _id: id, user: userId });

    if (!category) {
      return null;
    }

    if (category.isDefault) {
      throw new Error("The default category cannot be deleted.");
    }

    // Soft delete for sync purposes
    return Category.findOneAndUpdate(
      { _id: id, user: userId },
      {
        _isDeleted: true,
        _syncStatus: 'synced',
        _lastModified: new Date()
      },
      { new: true }
    );
  }

  static async updateOrder(
    categories: { id: string; order: number }[],
    userId: string
  ) {
    const bulkOps = categories.map((category) => ({
      updateOne: {
        filter: {
          _id: new Types.ObjectId(category.id),
          user: new Types.ObjectId(userId),
        },
        update: {
          $set: {
            order: category.order,
            _syncStatus: 'synced',
            _lastModified: new Date()
          },
          $inc: { _version: 1 }
        } as any, // Type assertion to bypass strict typing for bulkWrite
      },
    }));
    return Category.bulkWrite(bulkOps as any);
  }
}
