import { Request, Response, NextFunction } from 'express';
import { sendError } from '../shared/helper';
import logger from '../utils/logger';
import { User, UserRole } from '../models/user.model';
import { AuthenticatedRequest } from './access.middleware';

/**
 * Admin Middleware
 * 
 * Verifies that the authenticated user has an 'admin' role.
 * Must be used AFTER verifyAccessToken middleware.
 * 
 * Role is checked against the database, not just the JWT payload,
 * since the JWT only contains the user _id.
 */
export const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user_id;

    if (!userId) {
      logger.warn('Admin check failed: No user_id in request (verifyAccessToken missing?)');
      return sendError(res, 'Authentication required', 401, 'AUTH_NO_TOKEN');
    }

    // Fetch user from database to check current role
    const user = await User.findById(userId).select('role').lean();

    if (!user) {
      logger.warn(`Admin check failed: User not found for ID ${userId}`);
      return sendError(res, 'User not found', 404, 'RESOURCE_NOT_FOUND');
    }

    // Role check logic (extensible for future roles if needed)
    if (user.role !== UserRole.Admin) {
      logger.warn(`Admin check failed: User ${userId} is not an admin. Role: ${user.role}`);
      return sendError(
        res,
        'Insufficient permissions. Admin access required.',
        403,
        'AUTHZ_INSUFFICIENT_PERMISSIONS'
      );
    }

    logger.debug(`Admin access granted for user: ${userId}`);
    next();
  } catch (error: any) {
    logger.error('Error in admin middleware:', error.message);
    return sendError(res, 'Internal server error during authorization', 500, 'INTERNAL_ERROR');
  }
};
