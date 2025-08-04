import { Router } from 'express';
import userRoutes from './user.route';
import categoryRoutes from './category.route';
import expenseRoutes from './expense.route';

const router = Router();

router.use('/user', userRoutes);
router.use('/categories', categoryRoutes);
router.use('/expenses', expenseRoutes);

export default router;
