import { z } from 'zod'

export const InteractionCallbackType = {
  PONG: 1,
  CHANNEL_MESSAGE_WITH_SOURCE: 4,
  DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE: 5,
  DEFERRED_UPDATE_MESSAGE: 6,
  UPDATE_MESSAGE: 7,
  APPLICATION_COMMAND_AUTOCOMPLETE_RESULT: 8,
  MODAL: 9,
  LAUNCH_ACTIVITY: 12,
} as const

export const InteractionMessageFlags = {
  EPHEMERAL: 1 << 6,
  SUPPRESS_EMBEDS: 1 << 2,
  SUPPRESS_NOTIFICATIONS: 1 << 12,
  IS_VOICE_MESSAGE: 1 << 13,
  IS_COMPONENTS_V2: 1 << 15,
} as const

const embedSchema = z.object({
  title: z.string().optional(),
  type: z.literal('rich').optional(),
  description: z.string().optional(),
  url: z.string().optional(),
  timestamp: z.string().optional(),
  color: z.number().optional(),
  footer: z
    .object({
      text: z.string(),
      icon_url: z.string().optional(),
      proxy_icon_url: z.string().optional(),
    })
    .optional(),
  image: z
    .object({
      url: z.string(),
      proxy_url: z.string().optional(),
      height: z.number().optional(),
      width: z.number().optional(),
    })
    .optional(),
  thumbnail: z
    .object({
      url: z.string(),
      proxy_url: z.string().optional(),
      height: z.number().optional(),
      width: z.number().optional(),
    })
    .optional(),
  author: z
    .object({
      name: z.string(),
      url: z.string().optional(),
      icon_url: z.string().optional(),
      proxy_icon_url: z.string().optional(),
    })
    .optional(),
  fields: z
    .array(
      z.object({
        name: z.string(),
        value: z.string(),
        inline: z.boolean().optional(),
      })
    )
    .optional(),
})

const allowedMentionsSchema = z.object({
  parse: z.array(z.enum(['roles', 'users', 'everyone'])).optional(),
  roles: z.array(z.string()).optional(),
  users: z.array(z.string()).optional(),
  replied_user: z.boolean().optional(),
})

const interactionCallbackDataSchema = z.object({
  tts: z.boolean().optional(),
  content: z.string().optional(),
  embeds: z.array(embedSchema).max(10).optional(),
  allowed_mentions: allowedMentionsSchema.optional(),
  flags: z.number().optional(),
  components: z.array(z.unknown()).optional(),
  attachments: z
    .array(
      z.object({
        filename: z.string(),
        description: z.string().optional(),
      })
    )
    .optional(),
})

export const interactionResponseSchema = z.object({
  type: z.union([
    z.literal(1),
    z.literal(4),
    z.literal(5),
    z.literal(6),
    z.literal(7),
    z.literal(8),
    z.literal(9),
    z.literal(12),
  ]),
  data: interactionCallbackDataSchema.optional(),
})

export type InteractionCallbackData = z.infer<typeof interactionCallbackDataSchema>
export type InteractionResponse = z.infer<typeof interactionResponseSchema>
