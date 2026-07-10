import { z } from 'zod'
import { parseEnv } from 'core/src/env.ts'
import { opencodeEnvSchema } from '../../env.ts'

const testEnvSchema = z.object({
  OPENCODE_API_KEY: opencodeEnvSchema.shape.OPENCODE_API_KEY.optional(),
  OPENCODE_SERVER_HOSTNAME: opencodeEnvSchema.shape.OPENCODE_SERVER_HOSTNAME,
  OPENCODE_SERVER_PASSWORD: opencodeEnvSchema.shape.OPENCODE_SERVER_PASSWORD.optional(),
  OPENCODE_SERVER_USERNAME: z.string().min(1).default('opencode'),
  OPENCODE_LIVE_SERVER_URL: z.string().optional(),
  OPENCODE_ISOLATION_LIVE: z.literal('1').optional(),
})

export const testEnv = parseEnv(testEnvSchema, process.env)

export const shouldRunLive = testEnv.OPENCODE_ISOLATION_LIVE === '1' && !!testEnv.OPENCODE_API_KEY
