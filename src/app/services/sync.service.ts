import logger from './logger.service';
import { Expense } from '../models/expense.model';
import { Category } from '../models/category.model';
import { User } from '../models/user.model';
import {
  SyncOperation,
  ConflictResolution,
  SyncMetadata,
} from '../models/sync.model';
import mongoose from 'mongoose';
import { CategoryService } from './category.service';

export interface SyncRequest {
  lastSyncTime?: Date;
  entityType?: 'expense' | 'outcome' | 'category' | 'user';
  limit?: number;
  offset?: number;
}

export interface SyncResponse {
  entities: any[];
  conflicts: any[];
  lastSyncTime: Date;
  hasMore: boolean;
  totalCount: number;
}

export interface ConflictResolutionRequest {
  entityId: string;
  entityType: string;
  resolution: 'local' | 'server' | 'merge';
  mergedData?: any;
}

/**
 * 🔄 Sync Service - Professional Backend Implementation
 *
 * المسؤوليات:
 * 1. معالجة طلبات المزامنة من العميل (Pull & Push)
 * 2. إدارة التعارضات
 * 3. تتبع metadata المزامنة
 */
export class SyncService {
  constructor() {}

  // ==================== PULL DATA FROM CLIENT ====================

  /**
   * 📥 Pull البيانات للعميل
   * يرجع كل البيانات المعدلة بعد lastSyncTime
   */
  async pullData(userId: string, request: SyncRequest): Promise<SyncResponse> {
    const { lastSyncTime, entityType, limit = 50, offset = 0 } = request;

    logger.info('📥 [SYNC] Pull request:', {
      userId,
      lastSyncTime,
      entityType,
      limit,
      offset,
    });

    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Convert userId to ObjectId
      const userObjectId = new mongoose.Types.ObjectId(userId);

      // Build query
      const query: any = {
        user: userObjectId,
        // لا نفلتر _isDeleted لأننا نحتاج إرسال العناصر المحذوفة للمزامنة
      };

      // Filter by lastSyncTime if provided
      if (lastSyncTime) {
        const syncDate = new Date(lastSyncTime);
        query.$or = [
          { _lastModified: { $gt: syncDate } },
          { updatedAt: { $gt: syncDate } },
          { createdAt: { $gt: syncDate } },
        ];
      }

      logger.info(`🔍 [SYNC] Query: ${JSON.stringify(query)}`);

      let entities: any[] = [];
      let totalCount = 0;

      // Fetch Expenses (or Outcomes)
      if (!entityType || entityType === 'expense' || entityType === 'outcome') {
        logger.info('💰 [SYNC] Fetching expenses...');

        const expenses = await Expense.find(query)
          .populate('category', 'title icon color type')
          .sort({ _lastModified: -1, updatedAt: -1 })
          .limit(limit)
          .skip(offset)
          .lean()
          .exec();

        logger.info(`✅ [SYNC] Found ${expenses.length} expenses`);

        entities = [
          ...entities,
          ...expenses.map((exp) => ({
            ...exp,
            _entityType: 'expense',
            _lastModified: exp._lastModified || exp.updatedAt || exp.createdAt,
          })),
        ];

        totalCount += await Expense.countDocuments(query);
      }

      // Fetch Categories
      if (!entityType || entityType === 'category') {
        logger.info('📁 [SYNC] Fetching categories...');

        const categories = await Category.find(query)
          .sort({ _lastModified: -1, updatedAt: -1 })
          .limit(limit)
          .skip(offset)
          .lean()
          .exec();

        logger.info(`✅ [SYNC] Found ${categories.length} categories`);

        entities = [
          ...entities,
          ...categories.map((cat) => ({
            ...cat,
            _entityType: 'category',
            _lastModified: cat._lastModified || cat.updatedAt || cat.createdAt,
          })),
        ];

        totalCount += await Category.countDocuments(query);
      }

      // Fetch conflicts
      logger.info('⚠️ [SYNC] Fetching conflicts...');
      const conflicts = await this.getConflicts(userId);
      logger.info(`✅ [SYNC] Found ${conflicts.length} conflicts`);

      // Update sync metadata
      try {
        await this.updateSyncMetadata(userId, {
          lastSyncTime: new Date(),
          totalEntities: totalCount,
          pendingCount: 0,
          conflictCount: conflicts.length,
        });
        logger.info('✅ [SYNC] Metadata updated');
      } catch (metadataError) {
        logger.warn('⚠️ [SYNC] Failed to update metadata:', undefined, metadataError);
      }

      // Sort entities by modification date (newest first)
      entities.sort((a, b) => {
        const dateA = new Date(
          a._lastModified || a.updatedAt || a.createdAt
        ).getTime();
        const dateB = new Date(
          b._lastModified || b.updatedAt || b.createdAt
        ).getTime();
        return dateB - dateA;
      });

      const response: SyncResponse = {
        entities,
        conflicts,
        lastSyncTime: new Date(),
        hasMore: entities.length === limit,
        totalCount,
      };

      logger.info('✅ [SYNC] Pull completed:', {
        entitiesCount: entities.length,
        conflictsCount: conflicts.length,
        totalCount,
        hasMore: response.hasMore,
      });

      return response;
    } catch (error: any) {
      logger.error('❌ [SYNC] Pull error:', error);
      throw new Error(`Failed to pull sync data: ${error.message}`);
    }
  }

  // ==================== PUSH DATA FROM CLIENT ====================

  /**
   * 📤 استقبال البيانات من العميل
   * معالجة التغييرات وإرجاع النتيجة والتعارضات
   */
  async pushData(
    userId: string,
    entities: any[]
  ): Promise<{ success: boolean; conflicts: any[]; processed: number }> {
    logger.info(
      `📤 [SYNC] Push request: ${entities.length} entities from user ${userId}`
    );

    const conflicts: any[] = [];
    let processed = 0;
    const idMap = new Map<string, string>();

    try {
      for (const entity of entities) {
        try {
          const result = await this.processEntity(userId, entity, idMap);

          if (result.conflict) {
            conflicts.push(result.entity);
            logger.info(
              `⚠️ [SYNC] Conflict detected for ${entity._entityType}:${entity._id}`
            );
          } else {
            processed++;
          }
        } catch (error: any) {
          logger.error(
            `❌ [SYNC] Error processing entity ${entity._id}:`,
            error
          );
          // Continue processing other entities
        }
      }

      logger.info(
        `✅ [SYNC] Push completed: ${processed} processed, ${conflicts.length} conflicts`
      );

      return {
        success: true,
        conflicts,
        processed,
      };
    } catch (error: any) {
      logger.error('❌ [SYNC] Push error:', error);
      throw new Error(`Failed to push sync data: ${error.message}`);
    }
  }

  /**
   * معالجة entity واحدة
   */
  private async processEntity(
    userId: string,
    entity: any,
    idMap: Map<string, string>
  ): Promise<{ conflict: boolean; entity: any }> {
    const {
      _entityType,
      _id,
      _version,
      _lastModified,
      _isDeleted,
      ...entityData
    } = entity;

    logger.info(`🔄 [SYNC] Processing ${_entityType}:${_id}...`);

    try {
      // Map offline IDs to new MongoDB IDs if they were created in this batch
      if (
        entityData.category &&
        typeof entityData.category === 'string' &&
        entityData.category.startsWith('offline_')
      ) {
        if (idMap.has(entityData.category)) {
          entityData.category = idMap.get(entityData.category);
        }
      }

      const userObjectId = new mongoose.Types.ObjectId(userId);
      let Model: any;

      // Determine model
      switch (_entityType) {
        case 'expense':
        case 'outcome':
          Model = Expense;
          break;
        case 'category':
          Model = Category;
          break;
        default:
          throw new Error(`Unknown entity type: ${_entityType}`);
      }

      // Find existing entity
      let existingEntity = null;
      let targetId = _id;
      
      if (mongoose.Types.ObjectId.isValid(_id)) {
        existingEntity = await Model.findOne({ _id, user: userObjectId });
      } else if (_id && typeof _id === 'string' && _id.startsWith('offline_')) {
        // It's an offline ID, search by _clientId
        existingEntity = await Model.findOne({ _clientId: _id, user: userObjectId });
        if (existingEntity) {
          targetId = existingEntity._id.toString();
        }
      }

      // Check for conflicts
      if (existingEntity && this.hasConflict(existingEntity, entity)) {
        logger.info(`⚠️ [SYNC] Conflict for ${_entityType}:${_id}`);
        return {
          conflict: true,
          entity: { ...entity, _conflictData: existingEntity.toObject() },
        };
      }

      // Process based on operation
      if (_isDeleted) {
        await this.handleDelete(Model, targetId, userId);
        logger.info(`🗑️ [SYNC] Deleted ${_entityType}:${targetId}`);
      } else if (existingEntity) {
        await this.handleUpdate(Model, targetId, userId, entityData, _version || 1);
        logger.info(`✏️ [SYNC] Updated ${_entityType}:${targetId}`);
      } else {
        await this.handleCreate(Model, entityData, userId, targetId, idMap);
        logger.info(`🆕 [SYNC] Created ${_entityType}:${targetId}`);
      }

      // Clear cache if entity type is category
      if (_entityType === 'category') {
        CategoryService.clearUserCategoryCache(userId);
      }

      return { conflict: false, entity };
    } catch (error: any) {
      logger.error(`❌ [SYNC] Error processing ${_entityType}:${_id}:`, error);
      throw error;
    }
  }

  /**
   * التحقق من وجود تعارض
   */
  private hasConflict(existing: any, incoming: any): boolean {
    const existingTime = new Date(
      existing._lastModified || existing.updatedAt
    ).getTime();
    const incomingTime = new Date(incoming._lastModified).getTime();
    const existingVersion = existing._version || 0;
    const incomingVersion = incoming._version || 0;

    // Conflict if server version is newer
    return existingTime > incomingTime && existingVersion > incomingVersion;
  }

  /**
   * إنشاء entity جديدة
   */
  private async handleCreate(
    Model: any,
    data: any,
    userId: string,
    entityId: string | undefined,
    idMap: Map<string, string>
  ): Promise<void> {
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const entityData: any = {
      ...data,
      user: userObjectId,
      _syncStatus: 'synced',
      _lastModified: new Date(),
      _version: 1,
    };

    // Use provided ID if available and valid
    if (entityId) {
      if (mongoose.Types.ObjectId.isValid(entityId)) {
        entityData._id = entityId;
      } else {
        // It's an offline ID, map it to _clientId so frontend can track it
        entityData._clientId = entityId;
      }
    }

    const entity = new Model(entityData);
    await entity.save();

    if (entityId && entityId.startsWith('offline_')) {
      idMap.set(entityId, entity._id.toString());
    }
  }

  /**
   * تحديث entity موجودة
   */
  private async handleUpdate(
    Model: any,
    id: string,
    userId: string,
    data: any,
    version: number
  ): Promise<void> {
    const userObjectId = new mongoose.Types.ObjectId(userId);

    await Model.updateOne(
      { _id: id, user: userObjectId },
      {
        $set: {
          ...data,
          _syncStatus: 'synced',
          _lastModified: new Date(),
          _version: version + 1,
        },
      }
    );
  }

  /**
   * حذف entity (soft delete)
   */
  private async handleDelete(
    Model: any,
    id: string,
    userId: string
  ): Promise<void> {
    const userObjectId = new mongoose.Types.ObjectId(userId);

    await Model.updateOne(
      { _id: id, user: userObjectId },
      {
        $set: {
          _isDeleted: true,
          _syncStatus: 'synced',
          _lastModified: new Date(),
        },
      }
    );
  }

  // ==================== CONFLICT RESOLUTION ====================

  async resolveConflict(
    userId: string,
    request: ConflictResolutionRequest
  ): Promise<boolean> {
    const { entityId, entityType, resolution, mergedData } = request;

    logger.info(
      `🔧 [SYNC] Resolving conflict for ${entityType}:${entityId} with strategy: ${resolution}`
    );

    try {
      const userObjectId = new mongoose.Types.ObjectId(userId);
      let Model: any;

      switch (entityType) {
        case 'expense':
        case 'outcome':
          Model = Expense;
          break;
        case 'category':
          Model = Category;
          break;
        default:
          throw new Error(`Unknown entity type: ${entityType}`);
      }

      const entity = await Model.findOne({ _id: entityId, user: userObjectId });
      if (!entity) {
        throw new Error('Entity not found');
      }

      let resolvedData: any;

      if (resolution === 'local') {
        resolvedData = entity.toObject();
      } else if (resolution === 'server') {
        resolvedData = entity._conflictData || entity.toObject();
      } else if (resolution === 'merge') {
        resolvedData = mergedData || entity.toObject();
      }

      // Update entity
      await Model.updateOne(
        { _id: entityId, user: userObjectId },
        {
          $set: {
            ...resolvedData,
            _syncStatus: 'synced',
            _lastModified: new Date(),
            _version: (entity._version || 0) + 1,
          },
          $unset: { _conflictData: 1 },
        }
      );

      // Record resolution
      await ConflictResolution.create({
        entityId,
        entityType,
        localData: entity.toObject(),
        serverData: entity._conflictData,
        resolution,
        mergedData,
        user: userObjectId,
      });

      logger.info(`✅ [SYNC] Conflict resolved for ${entityType}:${entityId}`);
      return true;
    } catch (error: any) {
      logger.error('❌ [SYNC] Conflict resolution error:', error);
      throw new Error(`Failed to resolve conflict: ${error.message}`);
    }
  }

  async getConflicts(userId: string): Promise<any[]> {
    try {
      const userObjectId = new mongoose.Types.ObjectId(userId);
      const conflicts = await ConflictResolution.find({ user: userObjectId })
        .sort({ timestamp: -1 })
        .limit(50)
        .lean();

      return conflicts;
    } catch (error) {
      logger.error('❌ [SYNC] Get conflicts error:', error as Error);
      return [];
    }
  }

  // ==================== SYNC METADATA ====================

  async getSyncMetadata(userId: string): Promise<any> {
    try {
      const userObjectId = new mongoose.Types.ObjectId(userId);
      let metadata = await SyncMetadata.findOne({ user: userObjectId });

      if (!metadata) {
        metadata = await SyncMetadata.create({
          user: userObjectId,
          lastSyncTime: new Date(),
          totalEntities: 0,
          pendingCount: 0,
          conflictCount: 0,
          errorCount: 0,
          isOnline: true,
          isSyncing: false,
        });
      }

      return metadata.toObject();
    } catch (error: any) {
      logger.error('❌ [SYNC] Get metadata error:', error);
      throw new Error(`Failed to get sync metadata: ${error.message}`);
    }
  }

  async updateSyncMetadata(
    userId: string,
    updates: Partial<any>
  ): Promise<void> {
    try {
      const userObjectId = new mongoose.Types.ObjectId(userId);

      await SyncMetadata.updateOne(
        { user: userObjectId },
        {
          $set: {
            ...updates,
            updatedAt: new Date(),
          },
        },
        { upsert: true }
      );
    } catch (error: any) {
      logger.error('❌ [SYNC] Update metadata error:', error);
      throw new Error(`Failed to update sync metadata: ${error.message}`);
    }
  }

  // ==================== BULK OPERATIONS ====================

  async bulkSync(
    userId: string,
    entities: any[]
  ): Promise<{ success: boolean; results: any[] }> {
    logger.info(`📦 [SYNC] Bulk sync: ${entities.length} entities`);

    const results: any[] = [];

    try {
      const idMap = new Map<string, string>();
      for (const entity of entities) {
        try {
          const result = await this.processEntity(userId, entity, idMap);
          results.push({
            success: true,
            entity: result.entity,
            conflict: result.conflict,
          });
        } catch (error: any) {
          results.push({
            success: false,
            entity,
            error: error.message,
          });
        }
      }

      return { success: true, results };
    } catch (error: any) {
      logger.error('❌ [SYNC] Bulk sync error:', error);
      throw new Error(`Failed to perform bulk sync: ${error.message}`);
    }
  }

  // ==================== CLEANUP ====================

  async cleanupOldSyncData(
    userId: string,
    olderThanDays: number = 30
  ): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      // Clean up old sync operations
      await SyncOperation.deleteMany({
        user: userId,
        timestamp: { $lt: cutoffDate },
        status: 'synced',
      });

      // Clean up old conflict resolutions
      await ConflictResolution.deleteMany({
        user: userId,
        timestamp: { $lt: cutoffDate },
      });

      logger.info(`🧹 [SYNC] Cleaned up data older than ${olderThanDays} days`);
    } catch (error: any) {
      logger.error('❌ [SYNC] Cleanup error:', error);
      throw new Error(`Failed to cleanup sync data: ${error.message}`);
    }
  }
}
