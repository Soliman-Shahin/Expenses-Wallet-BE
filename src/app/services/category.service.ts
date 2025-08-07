import { Category } from '../models/category.model';
import { Types } from 'mongoose';

export class CategoryService {
  static async createCategory(data: any, userId: string) {
    const category = new Category({ ...data, user: userId });
    return category.save();
  }

  static async getCategories(query: any, userId: string) {
    const { title, page = 1, limit = 10, sort = 'createdAt' } = query;
    const filter: Record<string, any> = { user: userId };
    if (title) filter.title = { $regex: title, $options: 'i' };
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

  static async updateCategory(id: string, data: any) {
    return Category.findByIdAndUpdate(id, { ...data, modified: new Date() }, { new: true });
  }

  static async deleteCategory(id: string) {
    return Category.findByIdAndDelete(id);
  }
}
