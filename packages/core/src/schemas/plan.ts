import { z } from 'zod'

export const WorkstreamSchema = z.object({
  name: z.string().min(1),
  goal: z.string().min(1),
  steps: z.array(z.string()).min(1),
  risks: z.array(z.string()).default([]),
})

export const EstimateOverallSchema = z.enum(['S', 'M', 'L', 'XL'])

export const PlanSchema = z.object({
  post_id: z.string(),
  decision_ref: z.string(),
  summary: z.string().min(1),
  approach: z.string().min(1),
  affected_areas: z.array(z.string()).default([]),
  workstreams: z.array(WorkstreamSchema).min(1),
  dependencies: z.array(z.string()).default([]),
  open_questions: z.array(z.string()).default([]),
  estimate_overall: EstimateOverallSchema,
})

export type Workstream = z.infer<typeof WorkstreamSchema>
export type EstimateOverall = z.infer<typeof EstimateOverallSchema>
export type Plan = z.infer<typeof PlanSchema>
