import { z } from 'zod'

export const opencodeEnvSchema = z.object({
  OPENCODE_GO_API_KEY: z.string().min(1),
  OPENCODE_SERVER_HOSTNAME: z.string().default('0.0.0.0'),
  OPENCODE_SERVER_PORT: z.coerce.number().int().positive().default(4096),
})

export type OpencodeEnv = z.infer<typeof opencodeEnvSchema>
