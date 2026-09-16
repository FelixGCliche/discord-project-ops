import { join } from 'node:path'
import { z } from 'zod'

export function getEnvFilePath(): string {
  return join(import.meta.dir, '..', '.env')
}

export const discordEnvSchema = z.object({
  DISCORD_APPLICATION_ID: z.string().min(1),
  DISCORD_PUBLIC_KEY: z
    .string()
    .length(64)
    .regex(/^[0-9a-fA-F]+$/),
  DISCORD_BOT_TOKEN: z.string().min(1),
})

export type DiscordEnv = z.infer<typeof discordEnvSchema>
