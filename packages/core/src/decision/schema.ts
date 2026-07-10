import { z } from 'zod'

export const OptionConsideredSchema = z.object({
  option: z.string().min(1),
  pros: z.string().min(1),
  cons: z.string().min(1),
})

export const DecisionSchema = z.object({
  post_id: z.string().min(1),
  title: z.string().min(1),
  decision: z.string().min(1),
  context: z.string().min(1),
  options_considered: z.array(OptionConsideredSchema).default([]),
  rationale: z.string().min(1),
  non_goals: z.array(z.string().min(1)).default([]),
  open_questions: z.array(z.string().min(1)).default([]),
  participants: z.array(z.string().min(1)).default([]),
})

export type OptionConsidered = z.infer<typeof OptionConsideredSchema>
export type Decision = z.infer<typeof DecisionSchema>
