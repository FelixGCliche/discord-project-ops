import { z } from 'zod'

const messageAuthorSchema = z.object({
  id: z.string(),
  username: z.string(),
  discriminator: z.string(),
  avatar: z.string().nullable(),
  global_name: z.string().nullable().optional(),
  bot: z.boolean().optional(),
})

const attachmentSchema = z.object({
  id: z.string(),
  filename: z.string(),
  size: z.number(),
  url: z.string(),
  proxy_url: z.string(),
  height: z.number().optional().nullable(),
  width: z.number().optional().nullable(),
  content_type: z.string().optional(),
})

const reactionSchema = z.object({
  count: z.number(),
  me: z.boolean(),
  emoji: z.object({
    id: z.string().nullable(),
    name: z.string().nullable(),
  }),
})

export const messageSchema = z.object({
  id: z.string(),
  channel_id: z.string(),
  author: messageAuthorSchema,
  content: z.string(),
  timestamp: z.string(),
  edited_timestamp: z.string().nullable(),
  tts: z.boolean(),
  mention_everyone: z.boolean(),
  mentions: z.array(messageAuthorSchema),
  mention_roles: z.array(z.string()),
  attachments: z.array(attachmentSchema),
  embeds: z.array(z.unknown()),
  pinned: z.boolean(),
  type: z.number(),
  flags: z.number().optional(),
  components: z.array(z.unknown()).optional(),
  thread: z.unknown().optional(),
  reactions: z.array(reactionSchema).optional(),
  webhook_id: z.string().optional(),
  application_id: z.string().optional(),
  interaction_metadata: z.unknown().optional(),
  position: z.number().optional(),
})

export type Message = z.infer<typeof messageSchema>
export type MessageAuthor = z.infer<typeof messageAuthorSchema>
