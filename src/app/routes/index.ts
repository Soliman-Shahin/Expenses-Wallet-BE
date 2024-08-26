import { Router } from 'express';
import CategoryRoutes from './category.route';
import userRoutes from './user.route';

const router = Router();

router.use('/user', userRoutes);
router.use('/categories', CategoryRoutes);

export default router;
