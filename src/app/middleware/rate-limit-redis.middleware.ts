import { Request, Response, NextFunction } from 'express';
import { sendError } from '../shared/helper';
import logger from '../utils/logger';

/**
 * Redis-based Rate Limiting Middleware (Optional Enhancement)
 *
 * To use Redis rate limiting:
 * 1. Install: npm install ioredis
 * 2. Set REDIS_URL in .env
 * 3. Import and use this middleware instead of rate-limit.middleware.ts
 *
 * Benefits:
 * - Supports horizontal scaling (multiple server instances)
 * - Persistent rate limit data across restarts
 * - Better performance for high-traffic applications
 */

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message?: string;
  statusCode?: number;
}

/**
 * Creates a Redis-based rate limiter
 * Falls back to memory-based limiter if Redis is not available
 */
export function createRedisRateLimiter(config: RateLimitConfig) {
  const {
    windowMs,
    maxRequests,
    message = 'Too many requests, please try again later',
    statusCode = 429,
  } = config;

  // Check if Redis is available
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    logger.warn(
      '[Rate Limiter] REDIS_URL not configured, using memory-based rate limiting'
    );
    // Fallback to memory-based rate limiting
    return createMemoryRateLimiter(config);
  }

  // TODO: Implement Redis-based rate limiting
  // Uncomment when ioredis is installed:
  /*
  const Redis = require('ioredis');
  const redis = new Redis(redisUrl);

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = `ratelimit:${req.ip}`;
      const current = await redis.incr(key);
      
      if (current === 1) {
        await redis.expire(key, Math.ceil(windowMs / 1000));
      }

      const ttl = await redis.ttl(key);
      const resetTime = Date.now() + (ttl * 1000);

      res.setHeader('X-RateLimit-Limit', maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - current).toString());
      res.setHeader('X-RateLimit-Reset', new Date(resetTime).toISOString());

      if (current > maxRequests) {
        return sendError(res, message, statusCode, 'RATE_LIMIT_EXCEEDED');
      }

      next();
    } catch (error) {
      logger.error('[Rate Limiter] Redis error:', error);
      // Fallback: allow request if Redis fails
      next();
    }
  };
  */

  // For now, fallback to memory-based
  logger.info(
    '[Rate Limiter] Redis support not yet implemented, using memory-based rate limiting'
  );
  return createMemoryRateLimiter(config);
}

/**
 * Memory-based rate limiter (fallback)
 */
function createMemoryRateLimiter(config: RateLimitConfig) {
  const store: { [key: string]: { count: number; resetTime: number } } = {};
  const {
    windowMs,
    maxRequests,
    message = 'Too many requests',
    statusCode = 429,
  } = config;

  // Cleanup old entries every minute
  setInterval(() => {
    const now = Date.now();
    Object.keys(store).forEach((key) => {
      if (store[key].resetTime < now) {
        delete store[key];
      }
    });
  }, 60000);

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || 'unknown';
    const now = Date.now();

    if (!store[key] || store[key].resetTime < now) {
      store[key] = {
        count: 1,
        resetTime: now + windowMs,
      };
    } else {
      store[key].count++;
    }

    const remaining = Math.max(0, maxRequests - store[key].count);

    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader(
      'X-RateLimit-Reset',
      new Date(store[key].resetTime).toISOString()
    );

    if (store[key].count > maxRequests) {
      return sendError(res, message, statusCode, 'RATE_LIMIT_EXCEEDED');
    }

    next();
  };
}

// Export pre-configured rate limiters
export const apiRateLimiter = createRedisRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,
});

export const authRateLimiter = createRedisRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
  message: 'Too many authentication attempts, please try again later',
});
