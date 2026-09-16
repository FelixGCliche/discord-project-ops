import { z } from 'zod'

export const InteractionType = {
  PING: 1,
  APPLICATION_COMMAND: 2,
  MESSAGE_COMPONENT: 3,
  APPLICATION_COMMAND_AUTOCOMPLETE: 4,
  MODAL_SUBMIT: 5,
} as const

const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  avatar: z.string().nullable(),
  discriminator: z.string(),
  public_flags: z.number().optional(),
  global_name: z.string().nullable().optional(),
  bot: z.boolean().optional(),
})

const guildMemberSchema = z.object({
  user: userSchema.optional(),
  nick: z.string().nullable().optional(),
  avatar: z.string().nullable().optional(),
  roles: z.array(z.string()),
  joined_at: z.string(),
  premium_since: z.string().nullable().optional(),
  deaf: z.boolean(),
  mute: z.boolean(),
  pending: z.boolean().optional(),
  permissions: z.string().optional(),
  communication_disabled_until: z.string().nullable().optional(),
})

const applicationCommandOptionDataSchema: z.ZodTypeAny = z.lazy(() =>
  z.object({
    name: z.string(),
    type: z.number(),
    value: z.union([z.string(), z.number(), z.boolean()]).optional(),
    options: z.array(z.lazy(() => applicationCommandOptionDataSchema)).optional(),
    focused: z.boolean().optional(),
  })
)

export const applicationCommandDataSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.number(),
  resolved: z.record(z.string(), z.unknown()).optional(),
  options: z.array(applicationCommandOptionDataSchema).optional(),
  guild_id: z.string().optional(),
  target_id: z.string().optional(),
})

export const messageComponentDataSchema = z.object({
  custom_id: z.string(),
  component_type: z.number(),
  values: z.array(z.string()).optional(),
  resolved: z.record(z.string(), z.unknown()).optional(),
})

export const interactionSchema = z.object({
  id: z.string(),
  application_id: z.string(),
  type: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  data: z.union([applicationCommandDataSchema, messageComponentDataSchema]).optional(),
  guild_id: z.string().optional(),
  channel_id: z.string().optional(),
  member: guildMemberSchema.optional(),
  user: userSchema.optional(),
  token: z.string(),
  version: z.literal(1),
  message: z.unknown().optional(),
  app_permissions: z.string().optional(),
  locale: z.string().optional(),
  guild_locale: z.string().optional(),
})

export type Interaction = z.infer<typeof interactionSchema>
export type ApplicationCommandData = z.infer<typeof applicationCommandDataSchema>
export type MessageComponentData = z.infer<typeof messageComponentDataSchema>
