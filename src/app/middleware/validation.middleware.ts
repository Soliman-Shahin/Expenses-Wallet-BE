import logger from '../services/logger.service';
import { NextFunction, Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { ZodSchema, ZodError } from 'zod';
import { CustomRequest } from '../types/custom-request';
import { sendError } from '../shared/helper';

// Zod-based validation (for body validation)
export const validateRequestWithZod = (schema: ZodSchema) => {
  return async (req: CustomRequest, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return sendError(
          res,
          'Validation failed',
          400,
          'VALIDATION_ERROR',
          (error as any).errors
        );
      }
      next(error);
    }
  };
};

// Express-validator based validation (for query/params/body validation)
export const validateRequest = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.error('❌ Validation errors:', errors.array());
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
