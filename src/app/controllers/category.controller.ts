import { Request, Response } from 'express';
import { Category } from '../models';

interface CategoryQueryParams {
  title?: string;
  page?: number;
  size?: number;
}

// Error handling function
const handleError = (res: Response, error: any) => {
  res.status(error.status || 500).json({ message: error.message });
};

// Create a new category
const createCategory = async (req: Request, res: Response) => {
  try {
    const { title, icon, color, user } = req.body;
    const category = new Category({ title, icon, color, user });
    const newCategory = await category.save();
    res.status(201).json(newCategory);
  } catch (error) {
    handleError(res, error);
  }
};

// Get all categories with filtering and pagination
const getCategories = async (req: Request, res: Response) => {
  try {
    const { title, page, size } = req.query as CategoryQueryParams;
    const query: Record<string, any> = {};
    if (title) {
      query.title = { $regex: title, $options: 'i' };
    }
    const pageNumber = page ?? 1;
    const pageSize = size ?? 10;
    const data = await Category.find(query)
      .populate('user', 'name')
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
    const category = await Category.findById(id).populate('user', 'name');
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
