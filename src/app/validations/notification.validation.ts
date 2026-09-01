import { z } from 'zod';

export const broadcastNotificationSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    message: z.string().trim().min(1).max(1000),
    type: z.enum(['info', 'success', 'warn', 'error']).default('info'),
    audience: z.enum(['all', 'admins', 'moderators']).default('all'),
  })
  .strict();
