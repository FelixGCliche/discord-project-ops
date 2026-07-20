import { join } from 'node:path'
import { z } from 'zod'
import { linearEnvSchema, ENV_FILE_PATH as linearEnvFilePath } from 'linear'
import type { LinearTokenStore } from './linear-token-store'

const cloudflareEnvFilePath = join(import.meta.dir, '..', '.env')

export const envFilePaths = [cloudflareEnvFilePath, linearEnvFilePath]

export const workerEnvSchema = z.object({
  ...linearEnvSchema.shape,
})

export type WorkerEnv = z.infer<typeof workerEnvSchema> & {
  LINEAR_TOKEN_STORE: DurableObjectNamespace<LinearTokenStore>
}
