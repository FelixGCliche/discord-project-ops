import { describe, expect, test } from 'bun:test'
import decisionValid from './fixtures/decision.valid.json'
import decisionInvalid from './fixtures/decision.invalid.json'
import planValid from './fixtures/plan.valid.json'
import planInvalid from './fixtures/plan.invalid.json'
import issuesValid from './fixtures/issues.valid.json'
import issuesInvalid from './fixtures/issues.invalid.json'
import { DecisionSchema, PlanSchema, IssuesSchema } from '../schemas'
import { prettifyError } from 'zod'

describe('DecisionSchema', () => {
  test('accepts a well-formed decision record', () => {
    const result = DecisionSchema.safeParse(decisionValid)

    if (!result.success) throw new Error(prettifyError(result.error))
    expect(result.success).toBe(true)
  })

  test('rejects a decision missing a required field', () => {
    const result = DecisionSchema.safeParse(decisionInvalid.missingTitle)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i: { path: any[] }) => i.path.join('.') === 'title')).toBe(true)
    }
  })

  test('rejects wrong type for an array field', () => {
    const result = DecisionSchema.safeParse(decisionInvalid.wrongTypeParticipants)
    expect(result.success).toBe(false)
  })
})

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
      expect(result.error.issues.some((i: { path: any[] }) => i.path.join('.') === 'workstreams')).toBe(true)
    }
  })

  test('rejects an invalid estimate_overall enum value', () => {
    const result = PlanSchema.safeParse(planInvalid.badEstimateEnum)
    expect(result.success).toBe(false)
  })

  test('rejects a plan missing decision_ref', () => {
    const result = PlanSchema.safeParse(planInvalid.missingDecisionRef)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i: { path: any[] }) => i.path.join('.') === 'decision_ref')).toBe(true)
    }
  })
})

describe('IssuesSchema', () => {
  test('accepts a well-formed issues list with valid depends_on references', () => {
    const result = IssuesSchema.safeParse(issuesValid)

    if (!result.success) throw new Error(prettifyError(result.error))
    expect(result.success).toBe(true)
  })

  test('rejects a title over 70 characters', () => {
    const result = IssuesSchema.safeParse(issuesInvalid.titleTooLong)
    expect(result.success).toBe(false)
  })

  test('rejects depends_on referencing a title not present in the list', () => {
    const result = IssuesSchema.safeParse(issuesInvalid.unknownDependsOn)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(
        result.error.issues.some((i: { message: string | string[] }) => i.message.includes('unknown issue title'))
      ).toBe(true)
    }
  })

  test('rejects an issue that depends on itself', () => {
    const result = IssuesSchema.safeParse(issuesInvalid.selfDependency)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(
        result.error.issues.some((i: { message: string | string[] }) => i.message.includes('depend on itself'))
      ).toBe(true)
    }
  })

  test('rejects an empty issues array', () => {
    const result = IssuesSchema.safeParse(issuesInvalid.emptyIssuesArray)
    expect(result.success).toBe(false)
  })
})
