import { describe, expect, test } from 'bun:test'
import decisionValid from './fixtures/decision.valid.json'
import decisionInvalid from './fixtures/decision.invalid.json'
import { DecisionSchema } from './schema'
import { renderDecision } from './render'
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

describe('renderDecision', () => {
  test('matches snapshot', () => {
    const decision = DecisionSchema.parse(decisionValid)
    expect(renderDecision(decision)).toMatchSnapshot()
  })

  test('is deterministic across repeated calls on the same input', () => {
    const decision = DecisionSchema.parse(decisionValid)
    expect(renderDecision(decision)).toBe(renderDecision(decision))
  })
})
