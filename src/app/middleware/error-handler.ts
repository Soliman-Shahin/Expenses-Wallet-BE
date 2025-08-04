import { NextFunction, Request, Response } from 'express';
import { sendError } from '../shared/helper';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error(err.stack);
  sendError(res, err.message || 'Something went wrong!', 500);
};
