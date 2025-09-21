import { Request, Response, NextFunction } from 'express';
import { SyncService, SyncRequest, SyncResponse, ConflictResolutionRequest } from '../services/sync.service';

export class SyncController {
  private syncService: SyncService;

  constructor() {
    this.syncService = new SyncService();
  }

  // ==================== SYNC DATA PULL ====================

  async pullData(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?._id;
      const { lastSyncTime, entityType, limit, offset } = req.query;
      
      const request: SyncRequest = {
        lastSyncTime: lastSyncTime ? new Date(lastSyncTime as string) : undefined,
        entityType: entityType as 'expense' | 'category' | 'user',
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0
      };

      const result = await this.syncService.pullData(userId, request);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Sync data pulled successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== SYNC DATA PUSH ====================

  async pushData(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?._id;
      const { entities } = req.body;

      if (!entities || !Array.isArray(entities)) {
        res.status(400).json({
          success: false,
          message: 'Entities array is required'
        });
        return;
      }

      const result = await this.syncService.pushData(userId, entities);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Sync data pushed successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== BULK SYNC ====================

  async bulkSync(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?._id;
      const { entities } = req.body;

      if (!entities || !Array.isArray(entities)) {
        res.status(400).json({
          success: false,
          message: 'Entities array is required'
        });
        return;
      }

      const result = await this.syncService.bulkSync(userId, entities);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Bulk sync completed'
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== CONFLICTS ====================

  async getConflicts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?._id;
      const conflicts = await this.syncService.getConflicts(userId);
      res.status(200).json({
        success: true,
        data: conflicts,
        message: 'Conflicts retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async resolveConflict(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?._id;
      const conflictData: ConflictResolutionRequest = req.body;

      if (!conflictData.entityId || !conflictData.entityType || !conflictData.resolution) {
        res.status(400).json({
          success: false,
          message: 'Entity ID, entity type, and resolution are required'
        });
        return;
      }

      const success = await this.syncService.resolveConflict(userId, conflictData);
      res.status(200).json({
        success: true,
        data: { success },
        message: 'Conflict resolved successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== SYNC METADATA ====================

  async getSyncMetadata(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?._id;
      const metadata = await this.syncService.getSyncMetadata(userId);
      res.status(200).json({
        success: true,
        data: metadata,
        message: 'Sync metadata retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async updateSyncMetadata(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?._id;
      const updates = req.body;

      await this.syncService.updateSyncMetadata(userId, updates);
      res.status(200).json({
        success: true,
        data: { success: true },
        message: 'Sync metadata updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== CLEANUP ====================

  async cleanupSyncData(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?._id;
      const { olderThanDays } = req.query;
      const days = olderThanDays ? parseInt(olderThanDays as string) : 30;

      await this.syncService.cleanupOldSyncData(userId, days);
      res.status(200).json({
        success: true,
        data: { success: true },
        message: 'Sync data cleaned up successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== FORCE SYNC ====================

  async forceSync(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?._id;
      
      // Update metadata to indicate syncing
      await this.syncService.updateSyncMetadata(userId, { isSyncing: true });
      
      // Perform full sync
      const pullResult = await this.syncService.pullData(userId, {});
      
      // Update metadata to indicate sync complete
      await this.syncService.updateSyncMetadata(userId, { 
        isSyncing: false,
        lastSyncTime: new Date(),
        totalEntities: pullResult.totalCount
      });

      res.status(200).json({
        success: true,
        data: { 
          success: true, 
          message: `Sync completed. ${pullResult.entities.length} entities synced.`,
          entities: pullResult.entities.length,
          totalCount: pullResult.totalCount
        },
        message: 'Force sync completed'
      });

    } catch (error) {
      // Update metadata to indicate sync error
      const userId = (req as any).user?._id;
      if (userId) {
        await this.syncService.updateSyncMetadata(userId, { isSyncing: false });
      }
      next(error);
    }
  }

  // ==================== SYNC STATUS ====================

  async getSyncStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?._id;
      const metadata = await this.syncService.getSyncMetadata(userId);
      const conflicts = await this.syncService.getConflicts(userId);
      
      const status = {
        metadata,
        conflicts: conflicts.length,
        isOnline: true, // This would be determined by network status
        lastSyncTime: metadata.lastSyncTime,
        pendingCount: metadata.pendingCount,
        conflictCount: conflicts.length,
        errorCount: metadata.errorCount
      };

      res.status(200).json({
        success: true,
        data: status,
        message: 'Sync status retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

export const syncController = new SyncController();