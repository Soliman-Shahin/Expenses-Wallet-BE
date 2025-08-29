import { Category } from '../models/category.model';
import { Types } from 'mongoose';

export class CategoryService {
  static async createCategory(data: any, userId: string) {
    const category = new Category({ ...data, user: userId });
    return category.save();
  }

  static async getCategories(query: any, userId: string) {
    const { q, type, page = 1, limit = 10, sort = 'order' } = query;
    const filter: Record<string, any> = { user: userId };
    if (q) filter.title = { $regex: q, $options: 'i' };
    if (type) filter.type = type;
    const sortField = sort.startsWith('-') ? sort.substring(1) : sort;
    const sortOrder = sort.startsWith('-') ? -1 : 1;
    const sortObj: Record<string, 1 | -1> = { [sortField]: sortOrder as 1 | -1 };
    const data = await Category.find(filter)
      .populate('user', 'name')
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await Category.countDocuments(filter);
    return { data, total };
  }

  static async getCategoryById(id: string, userId: string) {
    return Category.findOne({ _id: id, user: userId }).populate('user', 'name');
  }

  static async updateCategory(id: string, data: any, userId: string) {
    return Category.findOneAndUpdate(
      { _id: id, user: userId },
      { ...data, modified: new Date() },
      { new: true }
    );
  }

  static async deleteCategory(id: string, userId: string) {
    const category = await Category.findOne({ _id: id, user: userId });

    if (!category) {
      return null;
    }

    if (category.isDefault) {
      throw new Error('The default category cannot be deleted.');
    }

    return category.deleteOne();
  }

  static async updateOrder(categories: { id: string; order: number }[], userId: string) {
    const bulkOps = categories.map(category => ({
      updateOne: {
        filter: { _id: new Types.ObjectId(category.id), user: new Types.ObjectId(userId) },
        update: { $set: { order: category.order } },
      },
    }));
    return Category.bulkWrite(bulkOps);
  }
}
