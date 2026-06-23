import { z } from 'zod';

export const expenseSchema = z.object({
  description: z.string(),
  amount: z.number().positive(),
  category: z.string(), // Assuming category is an ID
  date: z.coerce.date(),
});
