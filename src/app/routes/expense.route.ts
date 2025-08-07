import { Router } from 'express';
import {
  createExpense,
  deleteExpense,
  getExpenseById,
  getExpenses,
  getExpenseTotals,
  updateExpense,
} from '../controllers';
import { validateRequest } from '../middleware';
import { verifyAccessToken } from '../middleware/access.middleware';
import { expenseSchema } from '../validations/expense.validation';

const router = Router();

router.use(verifyAccessToken);

router.post('/', validateRequest(expenseSchema), createExpense);
router.get('/totals', getExpenseTotals);
router.get('/', getExpenses);
router.get('/:id', getExpenseById);
router.put('/:id', validateRequest(expenseSchema), updateExpense);
router.delete('/:id', deleteExpense);

export default router;
