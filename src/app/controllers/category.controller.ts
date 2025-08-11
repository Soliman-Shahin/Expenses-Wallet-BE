import { Request, Response } from 'express';
import { sendError, sendSuccess } from '../shared/helper';
import { CategoryService } from '../services/category.service';

interface CategoryQueryParams {
  title?: string;
  page?: number;
  limit?: number;
  sort?: string;
}

// Create a new category
const createCategory = async (req: Request & { user_id?: string }, res: Response) => {
  try {
    const userId = req.user_id as string;
    const category = await CategoryService.createCategory(req.body, userId);
    sendSuccess(res, category, 'Category created successfully', 201);
  } catch (error: any) {
    sendError(res, error.message);
  }
};

// Get all categories with filtering and pagination
const getCategories = async (req: Request & { user_id?: string }, res: Response) => {
  try {
    const userId = req.user_id as string;
    const result = await CategoryService.getCategories(req.query, userId);
    sendSuccess(res, result, 'Categories retrieved successfully');
  } catch (error: any) {
    sendError(res, error.message);
  }
};

// Get category by id
const getCategoryById = async (req: Request & { user_id?: string }, res: Response) => {
  try {
    const id = req.params.id;
    const userId = req.user_id as string;
    const category = await CategoryService.getCategoryById(id, userId);
    if (!category) {
      return sendError(res, 'Category not found', 404);
    }
    sendSuccess(res, category, 'Category retrieved successfully');
  } catch (error: any) {
    sendError(res, error.message);
  }
};

// Update a category
const updateCategory = async (req: Request & { user_id?: string }, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user_id as string;
    const category = await CategoryService.updateCategory(id, req.body, userId);
    if (!category) {
      return sendError(res, 'Category not found', 404);
    }
    sendSuccess(res, category, 'Category updated successfully');
  } catch (error: any) {
    sendError(res, error.message);
  }
};

// Delete a category
const deleteCategory = async (req: Request & { user_id?: string }, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user_id as string;
    const category = await CategoryService.deleteCategory(id, userId);
    if (!category) {
      return sendError(res, 'Category not found', 404);
    }
    sendSuccess(res, {}, 'Category deleted successfully');
  } catch (error: any) {
    sendError(res, error.message);
  }
};

export { createCategory, deleteCategory, getCategories, getCategoryById, updateCategory };
