import { NextFunction, Response } from 'express';
import Joi from 'joi';
import { CustomRequest } from '../types/custom-request';

export const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: CustomRequest, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    next();
  };
};
