import { z } from 'zod'

export const githubEnvSchema = z.object({
  GITHUB_TOKEN: z.string().min(1),
  GITHUB_OWNER: z.string().min(1),
  GITHUB_REPO: z.string().min(1),
})

export type GithubEnv = z.infer<typeof githubEnvSchema>
