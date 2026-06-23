import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { sendError } from '../shared/helper';
import logger from '../utils/logger';

// Use ACCESS_TOKEN_SECRET from .env (must match token generation)
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;

if (!ACCESS_TOKEN_SECRET) {
  throw new Error('ACCESS_TOKEN_SECRET is required in environment variables');
}

// Export the interface so other files can use it
export interface AuthenticatedRequest extends Request {
  user_id?: string;
  user?: { _id: string; email?: string };
}

export const verifyAccessToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Missing or invalid Authorization header');
      return sendError(
        res,
        'Missing or invalid Authorization header',
        401,
        'AUTH_MISSING_OR_INVALID_HEADER'
      );
    }
    const token = authHeader.split(' ')[1];

    if (!token) {
      logger.warn('No token provided');
      return sendError(res, 'No token provided', 401, 'AUTH_NO_TOKEN');
    }

    const payload = jwt.verify(token, ACCESS_TOKEN_SECRET) as any;

    if (!payload._id) {
      logger.error('Invalid token payload - missing _id');
      return sendError(
        res,
        'Invalid token payload',
        401,
        'AUTH_INVALID_PAYLOAD'
      );
    }

    // Attach user id and user object to request for downstream use
    authReq.user_id = payload._id;
    authReq.user = { _id: payload._id, email: payload.email };

    logger.debug('JWT verified successfully for user:', payload._id);

    next();
  } catch (err: unknown) {
    const error = err as Error;
    logger.error('JWT verification failed:', error.message);
    return sendError(
      res,
      'Invalid or expired access token',
      401,
      'AUTH_INVALID_TOKEN'
    );
  }
};
