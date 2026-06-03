import NodeCache from 'node-cache';
import logger from '../utils/logger';

/**
 * Cache Service
 * 
 * Simple in-memory caching layer using node-cache
 * 
 * Features:
 * - TTL (Time To Live) support
 * - Automatic cleanup
 * - Statistics tracking
 * 
 * Usage:
 * ```typescript
 * import { cacheService } from './services/cache.service';
 * 
 * // Set cache
 * cacheService.set('user:123', userData, 600); // 10 minutes
 * 
 * // Get cache
 * const user = cacheService.get('user:123');
 * ```
 */

class CacheService {
  private cache: NodeCache;
  private enabled: boolean;

  constructor() {
    this.enabled = process.env.ENABLE_CACHE !== 'false';
    
    if (!this.enabled) {
      logger.warn('[Cache] Caching is disabled');
    }

    this.cache = new NodeCache({
      stdTTL: 600, // Default TTL: 10 minutes
      checkperiod: 120, // Check for expired keys every 2 minutes
      useClones: false, // Don't clone objects (better performance)
      deleteOnExpire: true,
    });

    // Log cache statistics periodically (development only)
    if (process.env.NODE_ENV !== 'production') {
      setInterval(() => {
        const stats = this.cache.getStats();
        if (stats.keys > 0) {
          logger.debug('[Cache] Stats:', stats);
        }
      }, 60000); // Every minute
    }
  }

  /**
   * Get value from cache
   */
  get<T>(key: string): T | undefined {
    if (!this.enabled) return undefined;

    try {
      const value = this.cache.get<T>(key);
      if (value !== undefined) {
        logger.debug(`[Cache] HIT: ${key}`);
      } else {
        logger.debug(`[Cache] MISS: ${key}`);
      }
      return value;
    } catch (error) {
      logger.error('[Cache] Get error:', error);
      return undefined;
    }
  }

  /**
   * Set value in cache
   */
  set<T>(key: string, value: T, ttl?: number): boolean {
    if (!this.enabled) return false;

    try {
      const success = this.cache.set(key, value, ttl || 0);
      if (success) {
        logger.debug(`[Cache] SET: ${key} (TTL: ${ttl || 'default'}s)`);
      }
      return success;
    } catch (error) {
      logger.error('[Cache] Set error:', error);
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  del(key: string | string[]): number {
    if (!this.enabled) return 0;

    try {
      const deleted = this.cache.del(key);
      logger.debug(`[Cache] DEL: ${key} (deleted: ${deleted})`);
      return deleted;
    } catch (error) {
      logger.error('[Cache] Delete error:', error);
      return 0;
    }
  }

  /**
   * Clear all cache
   */
  flush(): void {
    if (!this.enabled) return;

    try {
      this.cache.flushAll();
      logger.info('[Cache] Flushed all cache');
    } catch (error) {
      logger.error('[Cache] Flush error:', error);
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return this.cache.getStats();
  }

  /**
   * Check if key exists
   */
  has(key: string): boolean {
    if (!this.enabled) return false;
    return this.cache.has(key);
  }

  /**
   * Get TTL for a key
   */
  getTtl(key: string): number | undefined {
    if (!this.enabled) return undefined;
    return this.cache.getTtl(key);
  }

  /**
   * Generate cache key for user data
   */
  static userKey(userId: string): string {
    return `user:${userId}`;
  }

  /**
   * Generate cache key for categories
   */
  static categoriesKey(userId: string): string {
    return `categories:${userId}`;
  }

  /**
   * Generate cache key for expenses
   */
  static expensesKey(userId: string, filters?: string): string {
    return filters ? `expenses:${userId}:${filters}` : `expenses:${userId}`;
  }
}

// Export singleton instance
export const cacheService = new CacheService();
export default cacheService;
