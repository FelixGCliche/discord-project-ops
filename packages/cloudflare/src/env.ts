import { join } from 'node:path'
import { z } from 'zod'
import { linearEnvSchema, getEnvFilePath as getLinearEnvFilePath } from 'linear'
import { githubEnvSchema, getEnvFilePath as getGithubEnvFilePath } from 'github'
import type { LinearTokenStore } from './linear-token-store'
import type { GithubTokenStore } from './github-token-store'
import type { GithubInstallationStore } from './github-installation-store'

export function getEnvFilePaths(): string[] {
  return [join(import.meta.dir, '..', '.env'), getLinearEnvFilePath(), getGithubEnvFilePath()]
}

export const workerEnvSchema = z.object({
  ...linearEnvSchema.shape,
  ...githubEnvSchema.shape,
})

export type WorkerEnv = z.infer<typeof workerEnvSchema> & {
  LINEAR_TOKEN_STORE: DurableObjectNamespace<LinearTokenStore>
  GITHUB_TOKEN_STORE: DurableObjectNamespace<GithubTokenStore>
  GITHUB_INSTALLATION_STORE: DurableObjectNamespace<GithubInstallationStore>
}
