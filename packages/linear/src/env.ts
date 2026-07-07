import { z } from 'zod'

export const linearEnvSchema = z.object({
  LINEAR_OAUTH_CLIENT_ID: z.string(),
  LINEAR_OAUTH_CLIENT_SECRET: z.string(),
  LINEAR_OAUTH_REDIRECT_URI: z.url(),
})

export type LinearEnv = z.infer<typeof linearEnvSchema>
