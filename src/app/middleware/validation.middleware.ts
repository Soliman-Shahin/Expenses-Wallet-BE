import { NextFunction, Request, Response } from 'express';
import { validationResult } from 'express-validator';
import Joi from 'joi';
import { CustomRequest } from '../types/custom-request';

// Joi-based validation (for body validation)
export const validateRequestWithJoi = (schema: Joi.ObjectSchema) => {
  return (req: CustomRequest, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    next();
  };
};

// Express-validator based validation (for query/params/body validation)
export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error('❌ Validation errors:', errors.array());
    return res.status(400).json({ 
      success: false,
      errors: errors.array(),
      message: 'Validation failed'
    });
  }
  next();
};
