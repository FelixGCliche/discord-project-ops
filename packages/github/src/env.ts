import { z } from 'zod'

export const githubEnvSchema = z.object({
  GITHUB_TOKEN: z.string(),
  GITHUB_OWNER: z.string(),
  GITHUB_REPO: z.string(),
})

export type BotEnv = z.infer<typeof githubEnvSchema>
