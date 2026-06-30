import { Router } from 'express';
import userRoutes from './user.route';
import categoryRoutes from './category.route';
import expenseRoutes from './expense.route';
import syncRoutes from './sync.route';
import adminRoutes from './admin.route';

const router = Router();

router.use('/user', userRoutes);
router.use('/categories', categoryRoutes);
router.use('/expenses', expenseRoutes);
router.use('/sync', syncRoutes);
router.use('/admin', adminRoutes);

export default router;
