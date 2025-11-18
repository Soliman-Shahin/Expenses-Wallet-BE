import { Expense } from '../models/expense.model';
import { Category } from '../models/category.model';
import { User } from '../models/user.model';
import { SyncOperation, ConflictResolution, SyncMetadata } from '../models/sync.model';
import mongoose from 'mongoose';

export interface SyncRequest {
  lastSyncTime?: Date;
  entityType?: 'expense' | 'category' | 'user';
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

export class SyncService {
  constructor() { }

  // ==================== SYNC DATA PULL ====================

  async pullData(userId: string, request: SyncRequest): Promise<SyncResponse> {
    const { lastSyncTime, entityType, limit = 50, offset = 0 } = request;

    console.log('📥 Pull data request:', { userId, lastSyncTime, entityType, limit, offset });

    try {
      if (!userId) {
        console.error('❌ No userId provided to pullData');
        throw new Error('User ID is required');
      }

      // Convert userId string to ObjectId for MongoDB query
      const userObjectId = new mongoose.Types.ObjectId(userId);

      const query: any = {
        user: userObjectId
        // Don't filter out deleted items - we need to sync them to other devices
      };

      if (lastSyncTime) {
        query._lastModified = { $gt: lastSyncTime };
      }

      console.log('🔍 Query:', JSON.stringify(query));

      let entities: any[] = [];
      let totalCount = 0;

      if (!entityType || entityType === 'expense') {
        console.log('📦 Fetching expenses...');
        const expenses = await Expense
          .find(query)
          .populate('category', 'title icon color type')
          .sort({ _lastModified: -1 })
          .limit(limit)
          .skip(offset)
          .lean();

        console.log(`✅ Found ${expenses.length} expenses`);
        entities = [...entities, ...expenses.map(exp => ({ ...exp, _entityType: 'expense' }))];
        totalCount += await Expense.countDocuments(query);
      }

      if (!entityType || entityType === 'category') {
        console.log('📦 Fetching categories...');
        const categories = await Category
          .find(query)
          .sort({ _lastModified: -1 })
          .limit(limit)
          .skip(offset)
          .lean();

        console.log(`✅ Found ${categories.length} categories`);
        entities = [...entities, ...categories.map(cat => ({ ...cat, _entityType: 'category' }))];
        totalCount += await Category.countDocuments(query);
      }

      console.log('📦 Fetching conflicts...');
      // Get conflicts for this user
      const conflicts = await this.getConflicts(userId);
      console.log(`✅ Found ${conflicts.length} conflicts`);

      console.log('📦 Updating sync metadata...');
      // Update sync metadata
      try {
        await this.updateSyncMetadata(userId, {
          lastSyncTime: new Date(),
          totalEntities: totalCount,
          pendingCount: 0,
          conflictCount: conflicts.length
        });
        console.log('✅ Sync metadata updated');
      } catch (metadataError) {
        console.error('⚠️ Failed to update metadata, but continuing:', metadataError);
      }

      console.log('✅ Pull data completed successfully, preparing response...');

      return {
        entities: entities.sort((a, b) => new Date(b._lastModified).getTime() - new Date(a._lastModified).getTime()),
        conflicts,
        lastSyncTime: new Date(),
        hasMore: entities.length === limit,
        totalCount
      };

    } catch (error) {
      console.error('❌ Sync pull error:', error);
      throw new Error('Failed to pull sync data');
    }
  }

  // ==================== SYNC DATA PUSH ====================

  async pushData(userId: string, entities: any[]): Promise<{ success: boolean; conflicts: any[] }> {
    const conflicts: any[] = [];

    try {
      for (const entity of entities) {
        const result = await this.processEntity(userId, entity);
        if (result.conflict) {
          conflicts.push(result.entity);
        }
      }

      return { success: true, conflicts };

    } catch (error) {
      console.error('Sync push error:', error);
      throw new Error('Failed to push sync data');
    }
  }

  private async processEntity(userId: string, entity: any): Promise<{ conflict: boolean; entity: any }> {
    const { _entityType, _id, _clientId, _version, _lastModified, ...entityData } = entity;

    try {
      const userObjectId = new mongoose.Types.ObjectId(userId);
      let existingEntity: any = null;
      let Model: any;

      // Determine the model based on entity type
      switch (_entityType) {
        case 'expense':
          Model = Expense;
          existingEntity = await Model.findOne({ _id, user: userObjectId });
          break;
        case 'category':
          Model = Category;
          existingEntity = await Model.findOne({ _id, user: userObjectId });
          break;
        default:
          throw new Error(`Unknown entity type: ${_entityType}`);
      }

      // Check for conflicts
      if (existingEntity && this.hasConflict(existingEntity, entity)) {
        return { conflict: true, entity: { ...entity, _conflictData: existingEntity } };
      }

      // Process based on operation type
      if (entity._isDeleted) {
        await this.handleDelete(Model, _id, userId);
      } else if (existingEntity) {
        await this.handleUpdate(Model, _id, userId, entityData, _version);
      } else {
        await this.handleCreate(Model, entityData, userId, _clientId);
      }

      return { conflict: false, entity };

    } catch (error) {
      console.error(`Error processing ${_entityType} entity:`, error);
      throw error;
    }
  }

  private hasConflict(existing: any, incoming: any): boolean {
    // Check if the incoming data is older than existing data
    const existingTime = new Date(existing._lastModified || existing.updatedAt).getTime();
    const incomingTime = new Date(incoming._lastModified).getTime();

    return existingTime > incomingTime && existing._version > (incoming._version || 0);
  }

  private async handleCreate(Model: any, data: any, userId: string, clientId?: string): Promise<void> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const entity = new Model({
      ...data,
      user: userObjectId,
      _clientId: clientId,
      _syncStatus: 'synced',
      _lastModified: new Date(),
      _version: 1
    });

    await entity.save();
  }

  private async handleUpdate(Model: any, id: string, userId: string, data: any, version: number): Promise<void> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    await Model.updateOne(
      { _id: id, user: userObjectId },
      {
        ...data,
        _syncStatus: 'synced',
        _lastModified: new Date(),
        _version: (version || 0) + 1
      }
    );
  }

  private async handleDelete(Model: any, id: string, userId: string): Promise<void> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    await Model.updateOne(
      { _id: id, user: userObjectId },
      {
        _isDeleted: true,
        _syncStatus: 'synced',
        _lastModified: new Date()
      }
    );
  }

  // ==================== CONFLICT RESOLUTION ====================

  async resolveConflict(userId: string, request: ConflictResolutionRequest): Promise<boolean> {
    const { entityId, entityType, resolution, mergedData } = request;

    try {
      const userObjectId = new mongoose.Types.ObjectId(userId);
      let Model: any;
      let data: any;

      switch (entityType) {
        case 'expense':
          Model = Expense;
          break;
        case 'category':
          Model = Category;
          break;
        default:
          throw new Error(`Unknown entity type: ${entityType}`);
      }

      // Get the current entity
      const entity = await Model.findOne({ _id: entityId, user: userObjectId });
      if (!entity) {
        throw new Error('Entity not found');
      }

      // Apply resolution
      if (resolution === 'local') {
        // Keep local data (do nothing)
        data = entity.toObject();
      } else if (resolution === 'server') {
        // Use server data (update with server data)
        data = entity._conflictData || entity.toObject();
      } else if (resolution === 'merge') {
        // Use merged data
        data = mergedData || entity.toObject();
      }

      // Update entity
      await Model.updateOne(
        { _id: entityId, user: userObjectId },
        {
          ...data,
          _syncStatus: 'synced',
          _lastModified: new Date(),
          _version: (entity._version || 0) + 1,
          _conflictData: undefined
        }
      );

      // Record conflict resolution
      await ConflictResolution.create({
        entityId,
        entityType,
        localData: entity.toObject(),
        serverData: entity._conflictData,
        resolution,
        mergedData,
        user: userObjectId
      });

      return true;

    } catch (error) {
      console.error('Conflict resolution error:', error);
      throw new Error('Failed to resolve conflict');
    }
  }

  async getConflicts(userId: string): Promise<any[]> {
    try {
      const userObjectId = new mongoose.Types.ObjectId(userId);
      const conflicts = await ConflictResolution
        .find({ user: userObjectId })
        .sort({ timestamp: -1 })
        .lean();

      return conflicts;

    } catch (error) {
      console.error('Get conflicts error:', error);
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
          isSyncing: false
        });
      }

      return metadata;

    } catch (error) {
      console.error('Get sync metadata error:', error);
      throw new Error('Failed to get sync metadata');
    }
  }

  async updateSyncMetadata(userId: string, updates: Partial<any>): Promise<void> {
    try {
      const userObjectId = new mongoose.Types.ObjectId(userId);
      await SyncMetadata.updateOne(
        { user: userObjectId },
        { ...updates, updatedAt: new Date() },
        { upsert: true }
      );

    } catch (error) {
      console.error('Update sync metadata error:', error);
      throw new Error('Failed to update sync metadata');
    }
  }

  // ==================== BULK OPERATIONS ====================

  async bulkSync(userId: string, entities: any[]): Promise<{ success: boolean; results: any[] }> {
    const results: any[] = [];

    try {
      for (const entity of entities) {
        try {
          const result = await this.processEntity(userId, entity);
          results.push({ success: true, entity: result.entity, conflict: result.conflict });
        } catch (error: any) {
          results.push({ success: false, entity, error: error.message });
        }
      }

      return { success: true, results };

    } catch (error: any) {
      console.error('Bulk sync error:', error);
      throw new Error('Failed to perform bulk sync');
    }
  }

  // ==================== CLEANUP ====================

  async cleanupOldSyncData(userId: string, olderThanDays: number = 30): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      // Clean up old sync operations
      await SyncOperation.deleteMany({
        user: userId,
        timestamp: { $lt: cutoffDate },
        status: 'synced'
      });

      // Clean up old conflict resolutions
      await ConflictResolution.deleteMany({
        user: userId,
        timestamp: { $lt: cutoffDate }
      });

    } catch (error: any) {
      console.error('Cleanup sync data error:', error);
      throw new Error('Failed to cleanup sync data');
    }
  }
}
