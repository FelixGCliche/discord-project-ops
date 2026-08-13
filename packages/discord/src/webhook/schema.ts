import { z } from 'zod'
import { allowedMentionsSchema, attachmentSchema, embedSchema } from '../message-data/schema'

export const createFollowupSchema = z.object({
  content: z.string().max(2000).optional(),
  embeds: z.array(embedSchema).max(10).optional(),
  allowed_mentions: allowedMentionsSchema.optional(),
  components: z.array(z.unknown()).optional(),
  flags: z.number().optional(),
  attachments: z.array(attachmentSchema).optional(),
})

export const editFollowupSchema = z.object({
  content: z.string().max(2000).optional().nullable(),
  embeds: z.array(embedSchema).max(10).optional().nullable(),
  allowed_mentions: allowedMentionsSchema.optional(),
  components: z.array(z.unknown()).optional().nullable(),
  flags: z.number().optional(),
  attachments: z.array(attachmentSchema).optional(),
})

export type CreateFollowupBody = z.infer<typeof createFollowupSchema>
export type EditFollowupBody = z.infer<typeof editFollowupSchema>
