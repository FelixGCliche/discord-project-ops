import { describe, expect, test } from 'bun:test'
import { agentsSchema, PERMISSION, TOOLS } from './agent-config-schema.ts'
import { buildAgents, MODEL, STAGE_AGENTS } from './build-agents.ts'

const STAGE_LABELS: Record<string, string> = {
  summarizer: 'Stage 1',
  planner: 'Stage 2',
  'issue-generator': 'Stage 3',
}

const STAGE_NAMES = Object.keys(STAGE_AGENTS)

describe('buildAgents()', () => {
  test('return value validates against agentsSchema', () => {
    const result = buildAgents()
    const parsed = agentsSchema.safeParse(result)
    expect(parsed.success).toBe(true)
  })

  test('returns exactly 3 pipeline agents', () => {
    const result = buildAgents()
    const keys = Object.keys(result)
    expect(keys).toHaveLength(3)
    expect(keys).toEqual(['summarizer', 'planner', 'issue-generator'])
  })

  test.each(STAGE_NAMES)('%s has the correct description', (name) => {
    const result = buildAgents()
    const agent = result[name]!
    expect(agent).toBeDefined()
    expect(agent.description).toBeString()
    expect(agent.description).toInclude(STAGE_LABELS[name]!)
  })

  test.each(STAGE_NAMES)('%s has correct model, temperature, and mode', (name) => {
    const result = buildAgents()
    const agent = result[name]!
    expect(agent).toBeDefined()
    expect(agent.model).toBe(MODEL)
    expect(agent.temperature).toBe(0)
    expect(agent.mode).toBe('subagent')
  })

  test.each(STAGE_NAMES)('%s references shared PERMISSION and TOOLS constants', (name) => {
    const result = buildAgents()
    const agent = result[name]!
    expect(agent).toBeDefined()
    expect(agent.permission).toBe(PERMISSION)
    expect(agent.tools).toBe(TOOLS)
  })

  test.each(STAGE_NAMES)('%s has correct prompt', (name) => {
    const result = buildAgents()
    const agent = result[name]!
    expect(agent).toBeDefined()
    expect(agent.prompt).toBe(STAGE_AGENTS[name]!.prompt)
  })
})
