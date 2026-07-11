import { z } from 'zod'
import { workerEnvSchema } from 'cloudflare/src/env'

export const botEnvSchema = z.object({
  DISCORD_BOT_TOKEN: z.string().min(1),
  ...workerEnvSchema.shape,
})

export type BotEnv = z.infer<typeof botEnvSchema>
