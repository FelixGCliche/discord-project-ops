import { z } from 'zod'

export const ComponentType = {
  ACTION_ROW: 1,
  BUTTON: 2,
  STRING_SELECT: 3,
  TEXT_INPUT: 4,
  USER_SELECT: 5,
  ROLE_SELECT: 6,
  MENTIONABLE_SELECT: 7,
  CHANNEL_SELECT: 8,
} as const

export const ButtonStyle = {
  PRIMARY: 1,
  SECONDARY: 2,
  SUCCESS: 3,
  DANGER: 4,
  LINK: 5,
  PREMIUM: 6,
} as const

const emojiSchema = z.object({
  id: z.string().nullable().optional(),
  name: z.string().nullable(),
  animated: z.boolean().optional(),
})

export const buttonSchema = z.object({
  type: z.literal(2),
  style: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6)]),
  label: z.string().max(80).optional(),
  emoji: emojiSchema.optional(),
  custom_id: z.string().min(1).max(100).optional(),
  url: z.string().max(512).optional(),
  sku_id: z.string().optional(),
  disabled: z.boolean().optional(),
  id: z.number().optional(),
})

export const actionRowSchema = z.object({
  type: z.literal(1),
  id: z.number().optional(),
  components: z.array(buttonSchema).min(1),
})

export type Button = z.infer<typeof buttonSchema>
export type ActionRow = z.infer<typeof actionRowSchema>
export type Emoji = z.infer<typeof emojiSchema>
