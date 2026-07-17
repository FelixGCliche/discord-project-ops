import { z } from 'zod'
import { workerEnvSchema, type WorkerEnv } from 'cloudflare'

export const botEnvSchema = z.object({
  ...workerEnvSchema.shape,
})

export type BotEnv = z.infer<typeof botEnvSchema> & Pick<WorkerEnv, 'LINEAR_TOKEN_STORE'>
