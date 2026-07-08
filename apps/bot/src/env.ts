import { z } from 'zod'

export const botEnvSchema = z.object({
  DISCORD_BOT_TOKEN: z.string().min(1),
})

export type BotEnv = z.infer<typeof botEnvSchema>
