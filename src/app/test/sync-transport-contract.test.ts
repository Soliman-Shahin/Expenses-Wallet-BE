import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { createEncryptionMiddleware } from '../middleware/encryption-advanced.middleware';
import { SyncService } from '../services/sync.service';
import { Category } from '../models/category.model';
import { Expense } from '../models/expense.model';

describe('sync transport contract', () => {
  it('leaves plaintext sync identities intact when the sync route uses TLS transport', () => {
    const next = jest.fn();
    const req = {
      path: '/v1/sync/push',
      originalUrl: '/v1/sync/push',
      body: {
        entities: [
          {
            _id: 'offline_expense_1',
            _clientId: 'offline_expense_1',
            _entityType: 'expense',
          },
        ],
      },
    } as unknown as Request;
    const res = {} as Response;

    createEncryptionMiddleware()(req, res, next);

    expect(req.body.entities[0]._id).toBe('offline_expense_1');
    expect(req.body.entities[0]._syncError).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('processes CREATE, returns idMap, and deletes without requiring idMap', async () => {
    const service = new SyncService();
    const userId = new Types.ObjectId().toString();
    const categoryId = 'offline_category_contract';
    const expenseId = 'offline_expense_contract';

    const created = await service.pushData(userId, [
      {
        _id: categoryId,
        _clientId: categoryId,
        _entityType: 'category',
        title: 'Contract category',
        icon: 'tag-outline',
        color: '#3366ff',
        type: 'outcome',
        order: 0,
      },
      {
        _id: expenseId,
        _clientId: expenseId,
        _entityType: 'expense',
        description: 'Contract expense',
        amount: 10,
        category: categoryId,
        date: new Date().toISOString(),
      },
    ]);

    expect(created.success).toBe(true);
    expect(created.errors).toHaveLength(0);
    expect(created.idMap[categoryId]).toBeDefined();
    expect(created.idMap[expenseId]).toBeDefined();
    const serverExpenseId = created.idMap[expenseId];
    expect(
      await Expense.exists({ _id: serverExpenseId, user: userId })
    ).toBeTruthy();

    const deleted = await service.pushData(userId, [
      {
        _id: serverExpenseId,
        _entityType: 'expense',
        _isDeleted: true,
        _operationId: 'delete-contract-operation',
      },
    ]);

    expect(deleted.success).toBe(true);
    expect(deleted.errors).toHaveLength(0);
    expect(deleted.idMap).toEqual({});
    expect(
      await Expense.exists({
        _id: serverExpenseId,
        _isDeleted: true,
        user: userId,
      })
    ).toBeTruthy();
  });

  it('isolates an invalid entity while processing a valid entity in the same batch', async () => {
    const service = new SyncService();
    const userId = new Types.ObjectId().toString();
    const validId = 'offline_valid_category';

    const result = await service.pushData(userId, [
      { _id: 'offline_invalid', _entityType: 'not-an-entity' },
      {
        _id: validId,
        _clientId: validId,
        _entityType: 'category',
        title: 'Valid category',
        icon: 'tag-outline',
        color: '#3366ff',
        type: 'outcome',
        order: 0,
      },
    ]);

    expect(result.success).toBe(true);
    expect(result.idMap[validId]).toBeDefined();
    expect(
      await Category.exists({ _id: result.idMap[validId], user: userId })
    ).toBeTruthy();
  });
});
