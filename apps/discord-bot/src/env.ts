import { z } from 'zod'

export const botEnvSchema = z.object({
  botToken: z.string(),
})

export type BotEnv = z.infer<typeof botEnvSchema>
