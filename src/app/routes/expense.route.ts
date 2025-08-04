import { Router } from 'express';
import {
  createExpense,
  deleteExpense,
  getExpenseById,
  getExpenses,
  getExpenseTotals,
  updateExpense,
} from '../controllers';
import { validateRequest, verifySession } from '../middleware';
import { expenseSchema } from '../validations/expense.validation';

const router = Router();

router.use(verifySession);

router.post('/', validateRequest(expenseSchema), createExpense);
router.get('/totals', getExpenseTotals);
router.get('/', getExpenses);
router.get('/:id', getExpenseById);
router.put('/:id', validateRequest(expenseSchema), updateExpense);
router.delete('/:id', deleteExpense);

export default router;
