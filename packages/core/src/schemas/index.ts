import { z } from 'zod'
import { DecisionSchema } from './decisions'
import { PlanSchema } from './plan'
import { IssuesSchema } from './generate-issue'

export * from './decisions'
export * from './plan'
export * from './generate-issue'

export const JSON_SCHEMAS = {
  summarize: z.toJSONSchema(DecisionSchema),
  plan: z.toJSONSchema(PlanSchema),
  issue: z.toJSONSchema(IssuesSchema),
} as const
