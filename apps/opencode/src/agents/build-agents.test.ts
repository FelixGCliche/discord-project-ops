import { describe, expect, test } from 'bun:test'
import { PROMPTS } from 'core'
import { agentsSchema, PERMISSION, TOOLS } from './agent-config-schema.ts'
import { buildAgents, MODEL, STAGE_AGENTS } from './build-agents.ts'

const EXPECTED_PROMPTS: Record<string, string> = {
  summarizer: PROMPTS.summarize,
  planner: PROMPTS.plan,
  'issue-generator': PROMPTS.issue,
}

const STAGE_NAMES = Object.keys(STAGE_AGENTS)

describe('buildAgents()', () => {
  const result = buildAgents()

  test('return value validates against agentsSchema', () => {
    const parsed = agentsSchema.safeParse(result)
    expect(parsed.success).toBe(true)
  })

  test('returns exactly 3 pipeline agents', () => {
    const keys = Object.keys(result)
    expect(keys).toHaveLength(3)
    expect(keys).toEqual(['summarizer', 'planner', 'issue-generator'])
  })

  test.each(STAGE_NAMES)('%s has the correct description', (name) => {
    const agent = result[name]!
    const stageNumber = STAGE_NAMES.indexOf(name) + 1
    expect(agent).toBeDefined()
    expect(agent.description).toBeString()
    expect(agent.description).toInclude(`Stage ${stageNumber}`)
  })

  test.each(STAGE_NAMES)('%s has correct model, temperature, and mode', (name) => {
    const agent = result[name]!
    expect(agent).toBeDefined()
    expect(agent.model).toBe(MODEL)
    expect(agent.temperature).toBe(0)
    expect(agent.mode).toBe('subagent')
  })

  test.each(STAGE_NAMES)('%s references shared PERMISSION and TOOLS constants', (name) => {
    const agent = result[name]!
    expect(agent).toBeDefined()
    expect(agent.permission).toBe(PERMISSION)
    expect(agent.tools).toBe(TOOLS)
  })

  test.each(STAGE_NAMES)('%s has correct prompt', (name) => {
    const agent = result[name]!
    expect(agent).toBeDefined()
    expect(agent.prompt).toBe(EXPECTED_PROMPTS[name])
  })
})
