import { Router } from 'express';
import {
  registerPushDevice,
  unregisterPushDevice,
} from '../controllers/push-device.controller';
import { verifyAccessToken } from '../middleware/access.middleware';
import { standardRateLimiter } from '../middleware/rate-limit.middleware';
import { validateRequestWithZod } from '../middleware/validation.middleware';
import { registerPushDeviceSchema } from '../validations/push-device.validation';

const router = Router();

router.post(
  '/devices',
  verifyAccessToken,
  standardRateLimiter,
  validateRequestWithZod(registerPushDeviceSchema),
  registerPushDevice
);

router.delete(
  '/devices/:deviceId',
  verifyAccessToken,
  standardRateLimiter,
  unregisterPushDevice
);

export default router;
