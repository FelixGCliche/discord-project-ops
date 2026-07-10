import { z } from 'zod'

export const opencodeEnvSchema = z.object({
  // Named OPENCODE_API_KEY, not OPENCODE_GO_API_KEY: opencode's built-in
  // provider auto-discovery keys off this exact env var name to activate
  // the "opencode-go" provider (confirmed against a live `opencode serve`'s
  // GET /config/providers -- a differently-named var silently leaves that
  // provider unregistered and the pipeline's model unresolvable).
  OPENCODE_API_KEY: z.string().min(1),
  OPENCODE_SERVER_HOSTNAME: z.string().default('0.0.0.0'),
  OPENCODE_SERVER_PORT: z.coerce.number().int().positive().default(4096),
})

export type OpencodeEnv = z.infer<typeof opencodeEnvSchema>
