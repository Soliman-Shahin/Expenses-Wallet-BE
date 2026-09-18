import { z } from 'zod';

const channels = z
  .object({
    inbox: z.boolean().optional(),
    realtime: z.boolean().optional(),
    push: z.boolean().optional(),
  })
  .strict();

export const notificationPreferencePatchSchema = z
  .object({
    sync: channels.optional(),
    subscription: channels.optional(),
    security: channels.optional(),
    general: channels.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one preference category is required',
  });
