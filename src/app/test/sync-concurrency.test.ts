import { Types } from 'mongoose';
import { Category } from '../models/category.model';
import { Expense } from '../models/expense.model';
import { Notification } from '../models/notification.model';
import { UserNotification } from '../models/user-notification.model';
import { NotificationPreferenceService } from '../services/notification-preference.service';
import { SyncService } from '../services/sync.service';

describe('authoritative sync concurrency', () => {
  const userId = '507f1f77bcf86cd799439011';

  beforeEach(async () => {
    await NotificationPreferenceService.updateForUser(userId, {
      sync: { realtime: false, push: false },
    });
  });

  async function seedExpense() {
    const category = await Category.create({
      title: 'QA category',
      icon: 'folder',
      color: '#123456',
      user: userId,
      _version: 1,
    });
    const expense = await Expense.create({
      description: 'QA expense',
      amount: 100,
      category: category._id,
      date: new Date(),
      user: userId,
      _version: 1,
    });
    return { category, expense };
  }

  it('accepts a current update and advances the authoritative server revision', async () => {
    const { expense } = await seedExpense();
    const result = await new SyncService().pushData(userId, [
      {
        _id: expense._id.toString(),
        _entityType: 'expense',
        _version: 2,
        _baseVersion: 1,
        _lastModified: new Date('2000-01-01'),
        description: 'current',
        amount: 200,
        category: expense.category,
        date: expense.date,
      },
    ]);
    expect(result.conflicts).toHaveLength(0);
    expect((await Expense.findById(expense._id))?._version).toBe(2);
    expect((await Expense.findById(expense._id))?.amount).toBe(200);
  });

  it('rejects a stale update through the real push path and creates one notification', async () => {
    const { expense } = await seedExpense();
    await Expense.updateOne(
      { _id: expense._id },
      { $set: { amount: 300, _version: 2 } }
    );
    const result = await new SyncService().pushData(userId, [
      {
        _id: expense._id.toString(),
        _entityType: 'expense',
        _version: 2,
        _baseVersion: 1,
        _lastModified: new Date('2000-01-01'),
        description: 'stale',
        amount: 200,
        category: expense.category,
        date: expense.date,
      },
    ]);
    expect(result.conflicts).toHaveLength(1);
    expect((await Expense.findById(expense._id))?.amount).toBe(300);
    expect(await Notification.countDocuments({ event: 'sync.conflict' })).toBe(
      1
    );
    expect(await UserNotification.countDocuments({ userId })).toBe(1);
  });

  it('rejects stale deletes and preserves the newer server entity', async () => {
    const { expense } = await seedExpense();
    await Expense.updateOne(
      { _id: expense._id },
      { $set: { amount: 300, _version: 2 } }
    );
    const result = await new SyncService().pushData(userId, [
      {
        _id: expense._id.toString(),
        _entityType: 'expense',
        _version: 2,
        _baseVersion: 1,
        _isDeleted: true,
        _lastModified: new Date('2000-01-01'),
      },
    ]);
    expect(result.conflicts).toHaveLength(1);
    expect((await Expense.findById(expense._id))?._isDeleted).toBe(false);
  });

  it('allows one winner for concurrent same-base updates', async () => {
    const { expense } = await seedExpense();
    const service = new SyncService();
    const payload = (amount: number) => ({
      _id: expense._id.toString(),
      _entityType: 'expense',
      _version: 2,
      _baseVersion: 1,
      _lastModified: new Date('2000-01-01'),
      description: `winner-${amount}`,
      amount,
      category: expense.category,
      date: expense.date,
    });
    const results = await Promise.all([
      service.pushData(userId, [payload(201)]),
      service.pushData(userId, [payload(202)]),
    ]);
    expect(
      results.filter((result) => result.conflicts.length === 0)
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.conflicts.length === 1)
    ).toHaveLength(1);
  });

  it('rejects a stale update after a server tombstone', async () => {
    const { expense } = await seedExpense();
    const service = new SyncService();
    const deleted = await service.pushData(userId, [
      {
        _id: expense._id.toString(),
        _entityType: 'expense',
        _baseVersion: 1,
        _isDeleted: true,
      },
    ]);
    expect(deleted.conflicts).toHaveLength(0);
    const stale = await service.pushData(userId, [
      {
        _id: expense._id.toString(),
        _entityType: 'expense',
        _baseVersion: 1,
        amount: 999,
        description: 'must not resurrect',
        category: expense.category,
        date: expense.date,
      },
    ]);
    expect(stale.conflicts).toHaveLength(1);
    expect((await Expense.findById(expense._id))?._isDeleted).toBe(true);
  });

  it('keeps offline create reconciliation on the existing path', async () => {
    const category = await Category.create({
      title: 'QA category',
      icon: 'folder',
      color: '#123456',
      user: userId,
      _version: 1,
    });
    const clientId = `offline_${new Types.ObjectId().toString()}`;
    const result = await new SyncService().pushData(userId, [
      {
        _id: clientId,
        _clientId: clientId,
        _entityType: 'expense',
        _version: 1,
        description: 'offline create',
        amount: 50,
        category: category._id,
        date: new Date(),
      },
    ]);
    expect(result.conflicts).toHaveLength(0);
    expect(result.idMap[clientId]).toMatch(/^[a-f\d]{24}$/i);
    expect(
      await Expense.countDocuments({ user: userId, _clientId: clientId })
    ).toBe(1);
  });

  it('applies the same authoritative revision contract to categories', async () => {
    const category = await Category.create({
      title: 'Original',
      icon: 'folder',
      color: '#123456',
      user: userId,
      _version: 1,
    });
    await Category.updateOne(
      { _id: category._id },
      { $set: { title: 'Server', _version: 2 } }
    );
    const result = await new SyncService().pushData(userId, [
      {
        _id: category._id.toString(),
        _entityType: 'category',
        _baseVersion: 1,
        title: 'Stale',
        icon: category.icon,
        color: category.color,
        type: category.type,
        order: category.order,
      },
    ]);
    expect(result.conflicts).toHaveLength(1);
    expect((await Category.findById(category._id))?.title).toBe('Server');
  });
});
