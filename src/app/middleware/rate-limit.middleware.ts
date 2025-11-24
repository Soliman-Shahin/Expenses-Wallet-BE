import { Request, Response, NextFunction } from "express";
import { sendError } from "../shared/helper";

/**
 * Advanced Rate Limiting Middleware
 *
 * Features:
 * - IP-based rate limiting
 * - User-based rate limiting (for authenticated requests)
 * - Configurable windows and limits
 * - Automatic cleanup of old entries
 * - Standard rate limit headers
 */

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  message?: string;
  statusCode?: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
    firstRequest: number;
  };
}

class RateLimiter {
  private store: RateLimitStore = {};
  private config: RateLimitConfig;
  private cleanupInterval: NodeJS.Timeout;

  constructor(config: RateLimitConfig) {
    this.config = {
      message: "Too many requests, please try again later",
      statusCode: 429,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      ...config,
    };

    // Cleanup old entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  private cleanup() {
    const now = Date.now();
    Object.keys(this.store).forEach((key) => {
      if (this.store[key].resetTime < now) {
        delete this.store[key];
      }
    });
  }

  private getKey(req: Request): string {
    // Use user ID if authenticated, otherwise use IP
    const userId = (req as any).user_id;
    return userId || req.ip || req.socket.remoteAddress || "unknown";
  }

  public middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const key = this.getKey(req);
      const now = Date.now();

      // Initialize or get existing record
      if (!this.store[key] || this.store[key].resetTime < now) {
        this.store[key] = {
          count: 0,
          resetTime: now + this.config.windowMs,
          firstRequest: now,
        };
      }

      const record = this.store[key];

      // Increment count
      record.count++;

      // Set rate limit headers
      const remaining = Math.max(0, this.config.maxRequests - record.count);
      const resetTime = Math.ceil(record.resetTime / 1000);

      res.setHeader("X-RateLimit-Limit", this.config.maxRequests.toString());
      res.setHeader("X-RateLimit-Remaining", remaining.toString());
      res.setHeader("X-RateLimit-Reset", resetTime.toString());

      // Check if limit exceeded
      if (record.count > this.config.maxRequests) {
        const retryAfter = Math.ceil((record.resetTime - now) / 1000);
        res.setHeader("Retry-After", retryAfter.toString());

        return sendError(
          res,
          this.config.message!,
          this.config.statusCode!,
          "RATE_LIMIT_EXCEEDED",
          { retryAfter }
        );
      }

      next();
    };
  }

  public destroy() {
    clearInterval(this.cleanupInterval);
  }
}

/**
 * Create rate limiter middleware
 */
export function createRateLimiter(config: RateLimitConfig) {
  const limiter = new RateLimiter(config);
  return limiter.middleware();
}

/**
 * Strict rate limiter for auth endpoints (login, signup)
 * 5 requests per 15 minutes
 */
export const strictAuthRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,
  message: "Too many authentication attempts, please try again later",
});

/**
 * Standard rate limiter for API endpoints
 * 100 requests per 15 minutes
 */
export const standardRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,
  message: "Too many requests, please try again later",
});

/**
 * Lenient rate limiter for read operations
 * 200 requests per 15 minutes
 */
export const lenientRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 200,
  message: "Too many requests, please try again later",
});

/**
 * Very strict limiter for expensive operations
 * 10 requests per hour
 */
export const veryStrictRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10,
  message: "Too many requests for this operation, please try again later",
});

export default {
  createRateLimiter,
  strictAuthRateLimiter,
  standardRateLimiter,
  lenientRateLimiter,
  veryStrictRateLimiter,
};
