import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/access.middleware';
import { sendError, sendSuccess } from '../shared/helper';
import { PushDeviceService } from '../services/push-device.service';
import { pushDeviceIdSchema } from '../validations/push-device.validation';

export const registerPushDevice = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user_id;
    if (!userId) return sendError(res, 'Authentication required', 401);

    const device = await PushDeviceService.register({
      userId,
      deviceId: req.body.deviceId,
      token: req.body.token,
      platform: req.body.platform,
      appVersion: req.body.appVersion,
    });
    return sendSuccess(res, device, 'Push device registered');
  } catch {
    return sendError(res, 'Failed to register push device', 500);
  }
};

export const unregisterPushDevice = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user_id;
    if (!userId) return sendError(res, 'Authentication required', 401);

    const parsedDeviceId = pushDeviceIdSchema.safeParse(req.params.deviceId);
    if (!parsedDeviceId.success) {
      return sendError(res, 'Invalid device ID', 400, 'VALIDATION_ERROR');
    }

    const result = await PushDeviceService.unregister(
      userId,
      parsedDeviceId.data
    );
    return sendSuccess(res, result, 'Push device unregistered');
  } catch {
    return sendError(res, 'Failed to unregister push device', 500);
  }
};
