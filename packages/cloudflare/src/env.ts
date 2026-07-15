import { z } from 'zod'
import { linearEnvSchema } from 'linear'
import type { LinearTokenStore } from './linear-token-store'

export const workerEnvSchema = z.object({
  ...linearEnvSchema.shape,
})

export type WorkerEnv = z.infer<typeof workerEnvSchema> & {
  LINEAR_TOKEN_STORE: DurableObjectNamespace<LinearTokenStore>
}
