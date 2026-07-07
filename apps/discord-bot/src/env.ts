import { z } from 'zod'

export const botEnvSchema = z.object({
  DISCORD_BOT_TOKEN: z.string(),
})

export type BotEnv = z.infer<typeof botEnvSchema>
