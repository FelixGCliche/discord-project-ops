import { join } from 'node:path'
import { z } from 'zod'
import { linearEnvSchema, getEnvFilePath as getLinearEnvFilePath } from 'linear'
import type { LinearTokenStore } from './linear-token-store'

export function getEnvFilePaths(): string[] {
  return [join(import.meta.dir, '..', '.env'), getLinearEnvFilePath()]
}

export const workerEnvSchema = z.object({
  ...linearEnvSchema.shape,
})

export type WorkerEnv = z.infer<typeof workerEnvSchema> & {
  LINEAR_TOKEN_STORE: DurableObjectNamespace<LinearTokenStore>
}
