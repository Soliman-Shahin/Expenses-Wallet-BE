import { Request, Response, NextFunction } from 'express';
import { SyncService } from '../services/sync.service';

export interface SyncRequest extends Request {
  syncService?: SyncService;
}

/**
 * Middleware to inject sync service into request
 */
export const injectSyncService = (syncService: SyncService) => {
  return (req: SyncRequest, res: Response, next: NextFunction) => {
    req.syncService = syncService;
    next();
  };
};

/**
 * Middleware to track sync operations
 */
export const trackSyncOperation = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Track the operation
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const userId = (req as any).user?._id;
    
    if (userId) {
      console.log(`Sync operation: ${req.method} ${req.path} - User: ${userId} - Duration: ${duration}ms - Status: ${res.statusCode}`);
      
      // Update sync metadata if it's a sync endpoint
      if (req.path.startsWith('/sync/') && res.statusCode < 400) {
        // This would be handled by the sync service
        console.log(`Sync operation completed successfully for user: ${userId}`);
      }
    }
  });
  
  next();
};

/**
 * Middleware to handle sync errors
 */
export const handleSyncError = (error: any, req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/sync/')) {
    console.error('Sync error:', error);
    
    // Update sync metadata with error
    const userId = (req as any).user?._id;
    if (userId) {
      // This would be handled by the sync service
      console.log(`Sync error recorded for user: ${userId}`);
    }
    
    res.status(500).json({
      success: false,
      message: 'Sync operation failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  } else {
    next(error);
  }
};

/**
 * Middleware to validate sync data
 */
export const validateSyncData = (req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/sync/push') || req.path.startsWith('/sync/bulk')) {
    const { entities } = req.body;
    
    if (!entities || !Array.isArray(entities)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid sync data: entities must be an array'
      });
    }
    
    // Validate each entity
    for (const entity of entities) {
      if (!entity._entityType || !entity._id) {
        return res.status(400).json({
          success: false,
          message: 'Invalid sync data: each entity must have _entityType and _id'
        });
      }
      
      if (!['expense', 'category', 'user'].includes(entity._entityType)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid sync data: _entityType must be expense, category, or user'
        });
      }
    }
  }
  
  next();
};

/**
 * Middleware to rate limit sync operations
 */
export const rateLimitSync = (maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) => {
  const requests = new Map<string, { count: number; resetTime: number }>();
  
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/sync/')) {
      const userId = (req as any).user?._id;
      const now = Date.now();
      const key = `sync_${userId}`;
      
      const userRequests = requests.get(key);
      
      if (!userRequests || now > userRequests.resetTime) {
        requests.set(key, { count: 1, resetTime: now + windowMs });
      } else if (userRequests.count >= maxRequests) {
        return res.status(429).json({
          success: false,
          message: 'Too many sync requests. Please try again later.',
          retryAfter: Math.ceil((userRequests.resetTime - now) / 1000)
        });
      } else {
        userRequests.count++;
      }
    }
    
    next();
  };
};

/**
 * Middleware to compress sync responses
 */
export const compressSyncResponse = (req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/sync/')) {
    // Set compression headers
    res.setHeader('Content-Encoding', 'gzip');
    res.setHeader('Vary', 'Accept-Encoding');
  }
  
  next();
};

/**
 * Middleware to add sync headers
 */
export const addSyncHeaders = (req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/sync/')) {
    res.setHeader('X-Sync-Version', '1.0.0');
    res.setHeader('X-Sync-Timestamp', new Date().toISOString());
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  
  next();
};
