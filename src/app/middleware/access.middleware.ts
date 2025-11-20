import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { sendError } from '../shared/helper';

// Use JWT_SECRET from .env (same as user.service.ts)
const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || process.env.ACCESS_TOKEN_SECRET || 'default_access_secret';

export const verifyAccessToken = (req: Request & { user_id?: string; user?: any }, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Missing or invalid Authorization header');
      return sendError(
        res,
        'Missing or invalid Authorization header',
        401,
        'AUTH_MISSING_OR_INVALID_HEADER'
      );
    }
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      console.error('No token provided');
      return sendError(res, 'No token provided', 401, 'AUTH_NO_TOKEN');
    }
    
    const payload = jwt.verify(token, ACCESS_TOKEN_SECRET) as any;
    
    if (!payload._id) {
      console.error('Invalid token payload - missing _id');
      return sendError(res, 'Invalid token payload', 401, 'AUTH_INVALID_PAYLOAD');
    }
    
    // Attach user id and user object to request for downstream use
    req.user_id = payload._id;
    req.user = { _id: payload._id, email: payload.email };
    
    console.log('✅ JWT verified successfully for user:', payload._id);
    
    next();
  } catch (err: any) {
    console.error('❌ JWT verification failed:', err.message);
    return sendError(res, 'Invalid or expired access token', 401, 'AUTH_INVALID_TOKEN');
  }
};
