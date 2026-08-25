import { Router } from 'express';
import { rateLimitController } from '../controllers/rate-limit.controller';
import { verifyAccessToken } from '../middleware/access.middleware';

const router = Router();

// All rate limit routes require authentication
router.use(verifyAccessToken);

/**
 * Get current user's rate limit configuration
 */
router.get(
  '/me',
  rateLimitController.getMyRateLimits.bind(rateLimitController)
);

/**
 * Get current rate limit status (remaining requests, reset time)
 */
router.get(
  '/status',
  rateLimitController.getRateLimitStatus.bind(rateLimitController)
);

export default router;
