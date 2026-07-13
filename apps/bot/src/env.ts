import { z } from 'zod'
import { workerEnvSchema, type WorkerEnv } from 'cloudflare'

export const botEnvSchema = z.object({
  DISCORD_BOT_TOKEN: z.string().min(1),
  BOT_ADMIN_TOKEN: z.string().min(1),
  ...workerEnvSchema.shape,
})

export type BotEnv = z.infer<typeof botEnvSchema> & Pick<WorkerEnv, 'LINEAR_TOKEN_STORE'>
