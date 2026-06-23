import { Router } from 'express';
import {
  createExpense,
  deleteExpense,
  getExpenseById,
  getExpenses,
  getExpenseTotals,
  updateExpense,
} from '../controllers';
import { validateRequestWithZod } from '../middleware';
import { verifyAccessToken } from '../middleware/access.middleware';
import { expenseSchema } from '../validations/expense.validation';

const router = Router();

router.use(verifyAccessToken);

router.post('/', validateRequestWithZod(expenseSchema), createExpense);
router.get('/totals', getExpenseTotals);
router.get('/', getExpenses);
router.get('/:id', getExpenseById);
router.put('/:id', validateRequestWithZod(expenseSchema), updateExpense);
router.delete('/:id', deleteExpense);

export default router;
