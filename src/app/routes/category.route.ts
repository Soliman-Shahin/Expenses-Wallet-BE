import { Router } from 'express';
import { verifyAccessToken } from '../middleware/access.middleware';
import {
  createCategory,
  deleteCategory,
  getCategories,
  getCategoryById,
  updateCategory,
} from '../controllers';
const router = Router();

// Protect all category routes to ensure we have a user context
router.post('/create', verifyAccessToken, createCategory);
router.get('/list', verifyAccessToken, getCategories);
router.get('/:id', verifyAccessToken, getCategoryById);
router.put('/update/:id', verifyAccessToken, updateCategory);
router.delete('/delete/:id', verifyAccessToken, deleteCategory);

export default router;
