import { Request, Response } from 'express';
import { Category } from '../models';

interface CategoryQueryParams {
  title?: string;
  page?: number;
  limit?: number;
  sort?: string;
}

// Error handling function
const handleError = (res: Response, error: any) => {
  res.status(error.status || 500).json({ message: error.message });
};

// Create a new category
const createCategory = async (req: Request, res: Response) => {
  try {
    const { title, icon, color } = req.body;
    const { _id } = req.headers;
    const category = new Category({ title, icon, color, user: _id });
    const newCategory = await category.save();
    res.status(201).json(newCategory);
  } catch (error) {
    handleError(res, error);
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
    res.json({ data, total });
  } catch (error) {
    handleError(res, error);
  }
};

// Get category by id
const getCategoryById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const { _id } = req.headers;
    const category = await Category.find({ _id: id, user: _id }).populate('user', 'name');
    if (!category) {
      res.status(404).json({ message: 'Category not found' });
    } else {
      res.json(category);
    }
  } catch (error) {
    handleError(res, error);
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
      res.status(404).json({ message: 'Category not found' });
    } else {
      res.json(category);
    }
  } catch (error) {
    handleError(res, error);
  }
};

// Delete a category
const deleteCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const category = await Category.findByIdAndDelete(id);
    if (!category) {
      res.status(404).json({ message: 'Category not found' });
    } else {
      res.json({ message: 'Category deleted' });
    }
  } catch (error) {
    handleError(res, error);
  }
};

export { createCategory, deleteCategory, getCategories, getCategoryById, updateCategory };
