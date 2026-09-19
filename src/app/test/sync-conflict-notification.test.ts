const mockSocketDelivery = jest.fn();
const mockPushDelivery = jest.fn().mockResolvedValue({
  attempted: 1,
  succeeded: 1,
  failed: 0,
  invalidTokens: 0,
});

jest.mock('../services/socket.service', () => ({
  getSocketService: () => ({ sendNotificationToUser: mockSocketDelivery }),
}));
jest.mock('../services/push-delivery.service', () => ({
  PushDeliveryService: { sendToUsers: mockPushDelivery },
}));

import { Notification } from '../models/notification.model';
import { NotificationPreferenceService } from '../services/notification-preference.service';
import { SyncConflict } from '../models/sync.model';
import { UserNotification } from '../models/user-notification.model';
import { SyncService } from '../services/sync.service';

describe('sync.conflict notification producer', () => {
  const userId = '507f1f77bcf86cd799439011';

  beforeEach(async () => {
    mockSocketDelivery.mockClear();
    mockPushDelivery.mockClear();
    await NotificationPreferenceService.updateForUser(userId, {
      sync: { realtime: false, push: false },
    });
    await NotificationPreferenceService.updateForUser(
      '507f1f77bcf86cd799439013',
      {
        sync: { realtime: false, push: false },
      }
    );
  });

  it('creates one owner-scoped notification for one unresolved conflict', async () => {
    const service = new SyncService();
    const conflict = {
      _id: '507f1f77bcf86cd799439012',
      _entityType: 'expense',
      _version: 4,
      _lastModified: '2026-01-01T00:00:00.000Z',
      _conflictData: { _version: 5, _lastModified: '2026-01-02T00:00:00.000Z' },
    };

    await (service as any).recordConflict(userId, conflict);
    await (service as any).recordConflict(userId, conflict);

    expect(
      await SyncConflict.countDocuments({
        user: userId,
        resolvedAt: { $exists: false },
      })
    ).toBe(1);
    expect(await Notification.countDocuments({ event: 'sync.conflict' })).toBe(
      1
    );
    expect(await UserNotification.countDocuments({ userId })).toBe(1);
    const notification = await Notification.findOne({
      event: 'sync.conflict',
    }).lean();
    expect(notification?.category).toBe('sync');
    expect(notification?.metadata).toEqual({
      conflictId: expect.any(String),
      entityType: 'expense',
    });
    expect(JSON.stringify(notification?.metadata)).not.toContain(
      '_conflictData'
    );
  });

  it('honors inbox, realtime, and push preference channels', async () => {
    const service = new SyncService();
    await NotificationPreferenceService.updateForUser(userId, {
      sync: { inbox: true, realtime: true, push: true },
    });
    await (service as any).recordConflict(userId, {
      _id: '507f1f77bcf86cd799439012',
      _entityType: 'expense',
      _version: 1,
      _conflictData: { _version: 2 },
    });
    expect(await UserNotification.countDocuments({ userId })).toBe(1);
    expect(mockSocketDelivery).toHaveBeenCalledTimes(1);
    expect(mockPushDelivery).toHaveBeenCalledTimes(1);

    await NotificationPreferenceService.updateForUser(userId, {
      sync: { inbox: false, realtime: false, push: false },
    });
    await (service as any).recordConflict(userId, {
      _id: '507f1f77bcf86cd799439014',
      _entityType: 'expense',
      _version: 1,
      _conflictData: { _version: 2 },
    });
    expect(await UserNotification.countDocuments({ userId })).toBe(1);
    expect(mockSocketDelivery).toHaveBeenCalledTimes(1);
    expect(mockPushDelivery).toHaveBeenCalledTimes(1);
  });

  it('creates separate notifications for distinct conflicts and isolates owners', async () => {
    const service = new SyncService();
    await (service as any).recordConflict(userId, {
      _id: '507f1f77bcf86cd799439012',
      _entityType: 'expense',
      _version: 1,
      _conflictData: { _version: 2 },
    });
    await (service as any).recordConflict('507f1f77bcf86cd799439013', {
      _id: '507f1f77bcf86cd799439012',
      _entityType: 'expense',
      _version: 1,
      _conflictData: { _version: 2 },
    });

    expect(await Notification.countDocuments({ event: 'sync.conflict' })).toBe(
      2
    );
    expect(await UserNotification.countDocuments({ userId })).toBe(1);
    expect(
      await UserNotification.countDocuments({
        userId: '507f1f77bcf86cd799439013',
      })
    ).toBe(1);
  });

  it('allows exactly one notification winner under concurrent duplicate detection', async () => {
    const service = new SyncService();
    const conflict = {
      _id: '507f1f77bcf86cd799439012',
      _entityType: 'expense',
      _version: 1,
      _conflictData: { _version: 2 },
    };
    await Promise.all([
      (service as any).recordConflict(userId, conflict),
      (service as any).recordConflict(userId, conflict),
    ]);
    expect(await Notification.countDocuments({ event: 'sync.conflict' })).toBe(
      1
    );
    expect(await UserNotification.countDocuments({ userId })).toBe(1);
  });

  it('permits a new conflict after the prior conflict is resolved', async () => {
    const service = new SyncService();
    const base = {
      _id: '507f1f77bcf86cd799439012',
      _entityType: 'expense',
      _version: 1,
      _conflictData: { _version: 2 },
    };
    await (service as any).recordConflict(userId, base);
    await SyncConflict.updateOne(
      { user: userId },
      { $set: { resolvedAt: new Date() } }
    );
    expect(await service.getConflicts(userId)).toHaveLength(0);
    await (service as any).recordConflict(userId, { ...base, _version: 2 });
    expect(await Notification.countDocuments({ event: 'sync.conflict' })).toBe(
      2
    );
  });

  it('returns only unresolved conflicts in the existing conflict-review shape', async () => {
    const service = new SyncService();
    await (service as any).recordConflict(userId, {
      _id: '507f1f77bcf86cd799439012',
      _entityType: 'expense',
      _version: 1,
      _conflictData: { _version: 2 },
    });
    const conflicts = await service.getConflicts(userId);
    expect(conflicts[0]).toEqual(
      expect.objectContaining({
        entityId: '507f1f77bcf86cd799439012',
        entityType: 'expense',
        timestamp: expect.any(Date),
      })
    );
    expect(conflicts[0]).not.toHaveProperty('dedupeKey');
  });
});
