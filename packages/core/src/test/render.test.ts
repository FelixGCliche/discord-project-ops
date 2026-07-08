import { describe, expect, test } from 'bun:test'
import decisionValid from './fixtures/decision.valid.json'
import planValid from './fixtures/plan.valid.json'
import issuesValid from './fixtures/issues.valid.json'
import { DecisionSchema, PlanSchema, IssuesSchema } from '../schemas'
import { renderDecision, renderPlan, renderIssue, renderIssues } from '../render'

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

describe('renderPlan', () => {
  test('matches snapshot', () => {
    const plan = PlanSchema.parse(planValid)
    expect(renderPlan(plan)).toMatchSnapshot()
  })
})

describe('renderIssue / renderIssues', () => {
  test('renderIssue matches snapshot for a single issue', () => {
    const doc = IssuesSchema.parse(issuesValid)
    expect(renderIssue(doc.issues[0]!)).toMatchSnapshot()
  })

  test('renderIssues matches snapshot for the full proposed list', () => {
    const doc = IssuesSchema.parse(issuesValid)
    expect(renderIssues(doc)).toMatchSnapshot()
  })
})
