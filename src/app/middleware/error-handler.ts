import logger from '../services/logger.service';
import { NextFunction, Request, Response } from 'express';
import { sendError } from '../shared/helper';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error(err.message, err);
  sendError(res, err.message || 'Something went wrong!', 500);
};
