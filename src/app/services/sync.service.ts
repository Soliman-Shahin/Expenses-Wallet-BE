import { Expense } from "../models/expense.model";
import { Category } from "../models/category.model";
import { User } from "../models/user.model";
import {
  SyncOperation,
  ConflictResolution,
  SyncMetadata,
} from "../models/sync.model";
import mongoose from "mongoose";

export interface SyncRequest {
  lastSyncTime?: Date;
  entityType?: "expense" | "outcome" | "category" | "user";
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
  resolution: "local" | "server" | "merge";
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

    console.log("📥 [SYNC] Pull request:", {
      userId,
      lastSyncTime,
      entityType,
      limit,
      offset,
    });

    try {
      if (!userId) {
        throw new Error("User ID is required");
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

      console.log("🔍 [SYNC] Query:", JSON.stringify(query));

      let entities: any[] = [];
      let totalCount = 0;

      // Fetch Expenses (or Outcomes)
      if (!entityType || entityType === "expense" || entityType === "outcome") {
        console.log("💰 [SYNC] Fetching expenses...");

        const expenses = await Expense.find(query)
          .populate("category", "title icon color type")
          .sort({ _lastModified: -1, updatedAt: -1 })
          .limit(limit)
          .skip(offset)
          .lean()
          .exec();

        console.log(`✅ [SYNC] Found ${expenses.length} expenses`);

        entities = [
          ...entities,
          ...expenses.map((exp) => ({
            ...exp,
            _entityType: "expense",
            _lastModified: exp._lastModified || exp.updatedAt || exp.createdAt,
          })),
        ];

        totalCount += await Expense.countDocuments(query);
      }

      // Fetch Categories
      if (!entityType || entityType === "category") {
        console.log("📁 [SYNC] Fetching categories...");

        const categories = await Category.find(query)
          .sort({ _lastModified: -1, updatedAt: -1 })
          .limit(limit)
          .skip(offset)
          .lean()
          .exec();

        console.log(`✅ [SYNC] Found ${categories.length} categories`);

        entities = [
          ...entities,
          ...categories.map((cat) => ({
            ...cat,
            _entityType: "category",
            _lastModified: cat._lastModified || cat.updatedAt || cat.createdAt,
          })),
        ];

        totalCount += await Category.countDocuments(query);
      }

      // Fetch conflicts
      console.log("⚠️ [SYNC] Fetching conflicts...");
      const conflicts = await this.getConflicts(userId);
      console.log(`✅ [SYNC] Found ${conflicts.length} conflicts`);

      // Update sync metadata
      try {
        await this.updateSyncMetadata(userId, {
          lastSyncTime: new Date(),
          totalEntities: totalCount,
          pendingCount: 0,
          conflictCount: conflicts.length,
        });
        console.log("✅ [SYNC] Metadata updated");
      } catch (metadataError) {
        console.warn("⚠️ [SYNC] Failed to update metadata:", metadataError);
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

      console.log("✅ [SYNC] Pull completed:", {
        entitiesCount: entities.length,
        conflictsCount: conflicts.length,
        totalCount,
        hasMore: response.hasMore,
      });

      return response;
    } catch (error: any) {
      console.error("❌ [SYNC] Pull error:", error);
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
    console.log(
      `📤 [SYNC] Push request: ${entities.length} entities from user ${userId}`
    );

    const conflicts: any[] = [];
    let processed = 0;

    try {
      for (const entity of entities) {
        try {
          const result = await this.processEntity(userId, entity);

          if (result.conflict) {
            conflicts.push(result.entity);
            console.log(
              `⚠️ [SYNC] Conflict detected for ${entity._entityType}:${entity._id}`
            );
          } else {
            processed++;
          }
        } catch (error: any) {
          console.error(
            `❌ [SYNC] Error processing entity ${entity._id}:`,
            error
          );
          // Continue processing other entities
        }
      }

      console.log(
        `✅ [SYNC] Push completed: ${processed} processed, ${conflicts.length} conflicts`
      );

      return {
        success: true,
        conflicts,
        processed,
      };
    } catch (error: any) {
      console.error("❌ [SYNC] Push error:", error);
      throw new Error(`Failed to push sync data: ${error.message}`);
    }
  }

  /**
   * معالجة entity واحدة
   */
  private async processEntity(
    userId: string,
    entity: any
  ): Promise<{ conflict: boolean; entity: any }> {
    const {
      _entityType,
      _id,
      _version,
      _lastModified,
      _isDeleted,
      ...entityData
    } = entity;

    console.log(`🔄 [SYNC] Processing ${_entityType}:${_id}...`);

    try {
      const userObjectId = new mongoose.Types.ObjectId(userId);
      let Model: any;

      // Determine model
      switch (_entityType) {
        case "expense":
        case "outcome":
          Model = Expense;
          break;
        case "category":
          Model = Category;
          break;
        default:
          throw new Error(`Unknown entity type: ${_entityType}`);
      }

      // Find existing entity
      const existingEntity = await Model.findOne({ _id, user: userObjectId });

      // Check for conflicts
      if (existingEntity && this.hasConflict(existingEntity, entity)) {
        console.log(`⚠️ [SYNC] Conflict for ${_entityType}:${_id}`);
        return {
          conflict: true,
          entity: { ...entity, _conflictData: existingEntity.toObject() },
        };
      }

      // Process based on operation
      if (_isDeleted) {
        await this.handleDelete(Model, _id, userId);
        console.log(`🗑️ [SYNC] Deleted ${_entityType}:${_id}`);
      } else if (existingEntity) {
        await this.handleUpdate(Model, _id, userId, entityData, _version || 1);
        console.log(`✏️ [SYNC] Updated ${_entityType}:${_id}`);
      } else {
        await this.handleCreate(Model, entityData, userId, _id);
        console.log(`🆕 [SYNC] Created ${_entityType}:${_id}`);
      }

      return { conflict: false, entity };
    } catch (error: any) {
      console.error(`❌ [SYNC] Error processing ${_entityType}:${_id}:`, error);
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
    entityId?: string
  ): Promise<void> {
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const entityData: any = {
      ...data,
      user: userObjectId,
      _syncStatus: "synced",
      _lastModified: new Date(),
      _version: 1,
    };

    // Use provided ID if available
    if (entityId) {
      entityData._id = entityId;
    }

    const entity = new Model(entityData);
    await entity.save();
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
          _syncStatus: "synced",
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
          _syncStatus: "synced",
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

    console.log(
      `🔧 [SYNC] Resolving conflict for ${entityType}:${entityId} with strategy: ${resolution}`
    );

    try {
      const userObjectId = new mongoose.Types.ObjectId(userId);
      let Model: any;

      switch (entityType) {
        case "expense":
        case "outcome":
          Model = Expense;
          break;
        case "category":
          Model = Category;
          break;
        default:
          throw new Error(`Unknown entity type: ${entityType}`);
      }

      const entity = await Model.findOne({ _id: entityId, user: userObjectId });
      if (!entity) {
        throw new Error("Entity not found");
      }

      let resolvedData: any;

      if (resolution === "local") {
        resolvedData = entity.toObject();
      } else if (resolution === "server") {
        resolvedData = entity._conflictData || entity.toObject();
      } else if (resolution === "merge") {
        resolvedData = mergedData || entity.toObject();
      }

      // Update entity
      await Model.updateOne(
        { _id: entityId, user: userObjectId },
        {
          $set: {
            ...resolvedData,
            _syncStatus: "synced",
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

      console.log(`✅ [SYNC] Conflict resolved for ${entityType}:${entityId}`);
      return true;
    } catch (error: any) {
      console.error("❌ [SYNC] Conflict resolution error:", error);
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
      console.error("❌ [SYNC] Get conflicts error:", error);
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
      console.error("❌ [SYNC] Get metadata error:", error);
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
      console.error("❌ [SYNC] Update metadata error:", error);
      throw new Error(`Failed to update sync metadata: ${error.message}`);
    }
  }

  // ==================== BULK OPERATIONS ====================

  async bulkSync(
    userId: string,
    entities: any[]
  ): Promise<{ success: boolean; results: any[] }> {
    console.log(`📦 [SYNC] Bulk sync: ${entities.length} entities`);

    const results: any[] = [];

    try {
      for (const entity of entities) {
        try {
          const result = await this.processEntity(userId, entity);
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
      console.error("❌ [SYNC] Bulk sync error:", error);
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
        status: "synced",
      });

      // Clean up old conflict resolutions
      await ConflictResolution.deleteMany({
        user: userId,
        timestamp: { $lt: cutoffDate },
      });

      console.log(`🧹 [SYNC] Cleaned up data older than ${olderThanDays} days`);
    } catch (error: any) {
      console.error("❌ [SYNC] Cleanup error:", error);
      throw new Error(`Failed to cleanup sync data: ${error.message}`);
    }
  }
}
