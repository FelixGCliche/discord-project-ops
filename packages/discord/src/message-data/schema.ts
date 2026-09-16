import { z } from 'zod'

export const embedSchema = z.object({
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

export const allowedMentionsSchema = z.object({
  parse: z.array(z.enum(['roles', 'users', 'everyone'])).optional(),
  roles: z.array(z.string()).optional(),
  users: z.array(z.string()).optional(),
  replied_user: z.boolean().optional(),
})

export const attachmentSchema = z.object({
  filename: z.string(),
  description: z.string().optional(),
})

export type Embed = z.infer<typeof embedSchema>
export type AllowedMentions = z.infer<typeof allowedMentionsSchema>
export type Attachment = z.infer<typeof attachmentSchema>
