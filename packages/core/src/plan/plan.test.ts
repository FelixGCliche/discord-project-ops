import { describe, expect, test } from 'bun:test'
import planValid from './fixtures/plan.valid.json'
import planInvalid from './fixtures/plan.invalid.json'
import { PlanSchema } from './schema'
import { renderPlan } from './render'
import { prettifyError } from 'zod'

describe('PlanSchema', () => {
  test('accepts a well-formed plan', () => {
    const result = PlanSchema.safeParse(planValid)

    if (!result.success) throw new Error(prettifyError(result.error))
    expect(result.success).toBe(true)
  })

  test('rejects an empty workstreams array (must plan at least one)', () => {
    const result = PlanSchema.safeParse(planInvalid.emptyWorkstreams)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.join('.') === 'workstreams')).toBe(true)
    }
  })

  test('rejects a plan missing decision_ref', () => {
    const result = PlanSchema.safeParse(planInvalid.missingDecisionRef)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.join('.') === 'decision_ref')).toBe(true)
    }
  })
})

describe('renderPlan()', () => {
  test('matches snapshot', () => {
    const plan = PlanSchema.parse(planValid)
    expect(renderPlan(plan)).toMatchSnapshot()
  })
})
