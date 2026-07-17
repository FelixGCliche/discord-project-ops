import { z } from 'zod'

export const linearEnvSchema = z.object({
  LINEAR_OAUTH_CLIENT_ID: z.string().min(1),
  LINEAR_OAUTH_CLIENT_SECRET: z.string().min(1),
  LINEAR_OAUTH_REDIRECT_URI: z.url(),
  LINEAR_OAUTH_STATE_SECRET: z.string().min(1),
})

export type LinearEnv = z.infer<typeof linearEnvSchema>
