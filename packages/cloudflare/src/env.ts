import { z } from 'zod'
import { linearEnvSchema } from 'linear/src/env'

export const workerEnvSchema = z.object({
  ...linearEnvSchema.shape,
})

export type WorkerEnv = z.infer<typeof workerEnvSchema>
