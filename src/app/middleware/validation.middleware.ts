import { NextFunction, Request, Response } from 'express';
import { validationResult } from 'express-validator';
import Joi from 'joi';
import { CustomRequest } from '../types/custom-request';
import { sendError } from '../shared/helper';

// Joi-based validation (for body validation)
export const validateRequestWithJoi = (schema: Joi.ObjectSchema) => {
  return (req: CustomRequest, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return sendError(
        res,
        'Validation failed',
        400,
        'VALIDATION_ERROR',
        error.details
      );
    }
    next();
  };
};

// Express-validator based validation (for query/params/body validation)
export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error('❌ Validation errors:', errors.array());
    return sendError(
      res,
      'Validation failed',
      400,
      'VALIDATION_ERROR',
      errors.array()
    );
  }
  next();
};
