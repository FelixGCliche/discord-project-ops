import { z } from 'zod'
import { DecisionSchema } from './decision/schema'
import { PlanSchema } from './plan/schema'
import { IssuesSchema } from './issue/schema'

export * from './decision/schema'
export * from './decision/render'
export * from './plan/schema'
export * from './plan/render'
export * from './issue/schema'
export * from './issue/render'
export * from './prompts'
export * from './env'
export * from './signed-state'

export const JSON_SCHEMAS = {
  summarize: z.toJSONSchema(DecisionSchema),
  plan: z.toJSONSchema(PlanSchema),
  issue: z.toJSONSchema(IssuesSchema),
} as const
