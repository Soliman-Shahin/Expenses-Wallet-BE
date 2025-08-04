import Joi from 'joi';

export const expenseSchema = Joi.object({
  description: Joi.string().required(),
  amount: Joi.number().positive().required(),
  category: Joi.string().required(), // Assuming category is an ID
  date: Joi.date().required(),
});
