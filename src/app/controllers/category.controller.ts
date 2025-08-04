import { Request, Response } from 'express';
import { Category } from '../models';
import { sendError, sendSuccess } from '../shared/helper';

interface CategoryQueryParams {
  title?: string;
  page?: number;
  limit?: number;
  sort?: string;
}

// Create a new category
const createCategory = async (req: Request, res: Response) => {
  try {
    const { title, icon, color } = req.body;
    const { _id } = req.headers;
    const category = new Category({ title, icon, color, user: _id });
    const newCategory = await category.save();
    sendSuccess(res, newCategory, 'Category created successfully', 201);
  } catch (error: any) {
    sendError(res, error.message);
  }
};

// Get all categories with filtering and pagination
const getCategories = async (req: Request, res: Response) => {
  try {
    const { title, page, limit, sort } = req.query as CategoryQueryParams;
    const { _id } = req.headers;
    const query: Record<string, any> = { user: _id };
    if (title) {
      query.title = { $regex: title, $options: 'i' };
    }
    const pageNumber = page ?? 1;
    const pageSize = limit ?? 10;
    let sortField = 'createdAt';
    let sortOrder = 1;
    if (sort) {
      if (sort.startsWith('-')) {
        sortField = sort.substring(1);
        sortOrder = -1;
      } else {
        sortField = sort;
        sortOrder = 1;
      }
    }
    const sortObject = { [sortField]: sortOrder as 1 | -1 };
    const data = await Category.find(query)
      .populate('user', 'name')
      .sort(sortObject)
      .skip((pageNumber - 1) * pageSize)
      .limit(pageSize);
    const total = await Category.countDocuments(query);
    sendSuccess(res, { data, total }, 'Categories retrieved successfully');
  } catch (error: any) {
    sendError(res, error.message);
  }
};

// Get category by id
const getCategoryById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const { _id } = req.headers;
    const category = await Category.findOne({ _id: id, user: _id }).populate('user', 'name');
    if (!category) {
      return sendError(res, 'Category not found', 404);
    }
    sendSuccess(res, category, 'Category retrieved successfully');
  } catch (error: any) {
    sendError(res, error.message);
  }
};

// Update a category
const updateCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, icon, color } = req.body;
    const category = await Category.findByIdAndUpdate(
      id,
      { title, icon, color, modified: new Date() },
      { new: true }
    );
    if (!category) {
      return sendError(res, 'Category not found', 404);
    }
    sendSuccess(res, category, 'Category updated successfully');
  } catch (error: any) {
    sendError(res, error.message);
  }
};

// Delete a category
const deleteCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const category = await Category.findByIdAndDelete(id);
    if (!category) {
      return sendError(res, 'Category not found', 404);
    }
    sendSuccess(res, {}, 'Category deleted successfully');
  } catch (error: any) {
    sendError(res, error.message);
  }
};

export { createCategory, deleteCategory, getCategories, getCategoryById, updateCategory };
