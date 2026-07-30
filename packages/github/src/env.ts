import { join } from 'node:path'
import { z } from 'zod'

export function getEnvFilePath(): string {
  return join(import.meta.dir, '..', '.env')
}

export const githubEnvSchema = z.object({
  GITHUB_OAUTH_CLIENT_ID: z.string().min(1),
  GITHUB_OAUTH_CLIENT_SECRET: z.string().min(1),
  GITHUB_OAUTH_REDIRECT_URI: z.url(),
  GITHUB_OAUTH_STATE_SECRET: z.string().min(1),
  GITHUB_APP_ID: z.string().min(1),
  GITHUB_APP_PRIVATE_KEY_BASE64: z.string().min(1),
  GITHUB_APP_SLUG: z.string().min(1),
})

export type GithubEnv = z.infer<typeof githubEnvSchema>
