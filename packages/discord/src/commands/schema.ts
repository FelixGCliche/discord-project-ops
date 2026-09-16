import { z } from 'zod'

const commandOptionChoiceSchema = z.object({
  name: z.string().min(1).max(100),
  value: z.union([z.string().max(100), z.number()]),
  name_localizations: z.record(z.string(), z.string()).optional(),
})

const commandOptionSchema: z.ZodTypeAny = z.lazy(() =>
  z.object({
    type: z.union([
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(4),
      z.literal(5),
      z.literal(6),
      z.literal(7),
      z.literal(8),
      z.literal(9),
      z.literal(10),
      z.literal(11),
    ]),
    name: z.string().min(1).max(32),
    description: z.string().min(1).max(100),
    required: z.boolean().optional(),
    choices: z.array(commandOptionChoiceSchema).max(25).optional(),
    options: z
      .array(z.lazy(() => commandOptionSchema))
      .max(25)
      .optional(),
    channel_types: z.array(z.number()).optional(),
    min_value: z.number().optional(),
    max_value: z.number().optional(),
    min_length: z.number().int().min(0).max(6000).optional(),
    max_length: z.number().int().min(1).max(6000).optional(),
    autocomplete: z.boolean().optional(),
    file_types: z.array(z.string()).max(10).optional(),
    name_localizations: z.record(z.string(), z.string()).optional(),
    description_localizations: z.record(z.string(), z.string()).optional(),
  })
)

export const createCommandSchema = z.object({
  name: z.string().min(1).max(32),
  type: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional(),
  description: z.string().min(1).max(100),
  options: z.array(commandOptionSchema).max(25).optional(),
  default_member_permissions: z.string().nullable().optional(),
  nsfw: z.boolean().optional(),
  integration_types: z.array(z.number()).optional(),
  contexts: z.array(z.union([z.literal(0), z.literal(1), z.literal(2)])).optional(),
  name_localizations: z.record(z.string(), z.string()).optional(),
  description_localizations: z.record(z.string(), z.string()).optional(),
})

export const commandSchema = createCommandSchema.extend({
  id: z.string(),
  application_id: z.string(),
  guild_id: z.string().optional(),
  version: z.string(),
})

export type CreateCommandBody = z.infer<typeof createCommandSchema>
export type Command = z.infer<typeof commandSchema>
export type CommandOption = z.infer<typeof commandOptionSchema>
