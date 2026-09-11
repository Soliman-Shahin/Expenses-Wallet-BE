import { z } from 'zod';
export const biometricEnrollSchema = z.object({
  deviceId: z.string().trim().min(1).max(128),
  label: z.string().trim().min(1).max(100),
  platform: z.enum(['android', 'ios']),
});
export const biometricSignInSchema = z.object({
  deviceId: z.string().trim().min(1).max(128),
  credential: z.string().min(1).max(512),
});
export const biometricRevokeSchema = z.object({
  deviceId: z.string().trim().min(1).max(128),
});
