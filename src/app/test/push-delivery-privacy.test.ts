import { Types } from 'mongoose';
import { DevicePushToken } from '../models/device-push-token.model';
import { firebaseAdminService } from '../services/firebase-admin.service';
import { PushDeliveryService } from '../services/push-delivery.service';

type MockDevice = {
  _id: Types.ObjectId;
  token: string;
};

function mockDevices(tokens: string[]): MockDevice[] {
  return tokens.map((token) => ({ _id: new Types.ObjectId(), token }));
}

function mockDeviceQuery(devices: MockDevice[]) {
  return jest.spyOn(DevicePushToken, 'find').mockReturnValue({
    select: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(devices),
    }),
  } as any);
}

function mockMessaging() {
  const sendEachForMulticast = jest.fn().mockResolvedValue({
    successCount: 1,
    failureCount: 0,
    responses: [{ success: true }],
  });
  const getMessaging = jest
    .spyOn(firebaseAdminService, 'getMessaging')
    .mockReturnValue({ sendEachForMulticast } as any);
  return { getMessaging, sendEachForMulticast };
}

const input = {
  userIds: [new Types.ObjectId()],
  notificationId: '507f1f77bcf86cd799439011',
  title: 'Sensitive canonical title: $1,250 from Main Wallet',
  message: 'Sensitive canonical message for Alice / password login',
  type: 'warn',
  routeKey: 'notification-detail',
};

describe('PushDeliveryService centralized visible-content privacy', () => {
  afterEach(() => jest.restoreAllMocks());

  it('always sends generic visible content and preserves only approved routing data', async () => {
    mockDeviceQuery(mockDevices(['token-1']));
    const { sendEachForMulticast } = mockMessaging();

    await PushDeliveryService.sendToUsers({
      ...input,
    });

    expect(sendEachForMulticast).toHaveBeenCalledWith({
      tokens: ['token-1'],
      notification: {
        title: 'Madar Flow',
        body: 'You have a new notification.',
      },
      data: {
        notificationId: input.notificationId,
        type: input.type,
        routeKey: input.routeKey,
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'madar_flow_general',
          tag: input.notificationId,
        },
      },
    });

    const payload = sendEachForMulticast.mock.calls[0][0];
    expect(JSON.stringify(payload)).not.toContain(input.title);
    expect(JSON.stringify(payload)).not.toContain(input.message);
    expect(payload.data).not.toHaveProperty('metadata');
    expect(payload.data).not.toHaveProperty('userId');
    expect(payload.data).not.toHaveProperty('accountId');
  });

  it('does not forward sensitive canonical metadata', async () => {
    mockDeviceQuery(mockDevices(['token-1']));
    const { sendEachForMulticast } = mockMessaging();

    await PushDeliveryService.sendToUsers({
      ...input,
      title: 'Subscription expires for Private Wallet',
      message: 'Expires at 2030-01-01T00:00:00.000Z',
    });

    const payload = sendEachForMulticast.mock.calls[0][0];
    const serialized = JSON.stringify(payload);
    for (const value of [
      '1250.00',
      'Private Wallet',
      'password',
      '2030-01-01T00:00:00.000Z',
      'expense-entity-123',
    ]) {
      expect(serialized).not.toContain(value);
    }
    expect(payload.data).toEqual({
      notificationId: input.notificationId,
      type: input.type,
      routeKey: input.routeKey,
    });
  });

  it('applies the same generic visible content to every token in a batch', async () => {
    const devices = mockDevices(['token-1', 'token-2']);
    mockDeviceQuery(devices);
    const { sendEachForMulticast } = mockMessaging();
    sendEachForMulticast.mockResolvedValue({
      successCount: 2,
      failureCount: 0,
      responses: [{ success: true }, { success: true }],
    });

    await PushDeliveryService.sendToUsers({ ...input });

    expect(sendEachForMulticast).toHaveBeenCalledTimes(1);
    expect(sendEachForMulticast.mock.calls[0][0].notification).toEqual({
      title: 'Madar Flow',
      body: 'You have a new notification.',
    });
    expect(sendEachForMulticast.mock.calls[0][0].tokens).toEqual([
      'token-1',
      'token-2',
    ]);
  });

  it('preserves invalid-token cleanup and partial delivery accounting', async () => {
    const devices = mockDevices(['token-1', 'token-2']);
    mockDeviceQuery(devices);
    const { sendEachForMulticast } = mockMessaging();
    sendEachForMulticast.mockResolvedValue({
      successCount: 1,
      failureCount: 1,
      responses: [
        { success: true },
        {
          success: false,
          error: { code: 'messaging/registration-token-not-registered' },
        },
      ],
    });
    const updateMany = jest
      .spyOn(DevicePushToken, 'updateMany')
      .mockResolvedValue({} as any);

    const result = await PushDeliveryService.sendToUsers({ ...input });

    expect(result).toEqual({
      attempted: 2,
      succeeded: 1,
      failed: 1,
      invalidTokens: 1,
    });
    expect(updateMany).toHaveBeenCalledTimes(1);
  });
});
