import { describe, expect, test } from 'bun:test'
import { agentConfigSchema, agentsSchema, PERMISSION, TOOLS, type AgentConfig } from './agent-config-schema.ts'

describe('agentConfigSchema', () => {
  test('parses empty object (all fields are optional)', () => {
    const result = agentConfigSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  test('parses fully populated config', () => {
    const input: AgentConfig = {
      description: 'test agent',
      mode: 'subagent',
      model: 'test-model',
      temperature: 0.5,
      prompt: 'test prompt',
      permission: {
        edit: 'deny',
        bash: 'deny',
        webfetch: 'ask',
        external_directory: 'allow',
        doom_loop: 'deny',
      },
      tools: { write: true, read: false },
    }
    const result = agentConfigSchema.safeParse(input)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.description).toBe('test agent')
    expect(result.data.mode).toBe('subagent')
    expect(result.data.model).toBe('test-model')
    expect(result.data.temperature).toBe(0.5)
    expect(result.data.prompt).toBe('test prompt')
    expect(result.data.permission?.webfetch).toBe('ask')
    expect(result.data.permission?.external_directory).toBe('allow')
    expect(result.data.tools?.write).toBe(true)
    expect(result.data.tools?.read).toBe(false)
  })

  test('rejects invalid mode', () => {
    const result = agentConfigSchema.safeParse({ mode: 'invalid' })
    expect(result.success).toBe(false)
  })

  test('rejects invalid permission value', () => {
    const result = agentConfigSchema.safeParse({
      permission: { edit: 'nope' },
    })
    expect(result.success).toBe(false)
  })

  test.each([['ask'], ['allow'], ['deny']] as const)('accepts permission value "%s"', (value) => {
    const result = agentConfigSchema.safeParse({
      permission: { edit: value },
    })
    expect(result.success).toBe(true)
  })

  test('strips unknown top-level fields', () => {
    const result = agentConfigSchema.safeParse({
      mode: 'subagent',
      extraField: 'should be stripped',
    })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect((result.data as Record<string, unknown>).extraField).toBeUndefined()
  })

  test('rejects non-boolean tools values', () => {
    const result = agentConfigSchema.safeParse({
      tools: { write: 'yes' },
    })
    expect(result.success).toBe(false)
  })

  test('accepts boolean tools values', () => {
    const result = agentConfigSchema.safeParse({
      tools: { write: true, read: false },
    })
    expect(result.success).toBe(true)
  })
})

describe('agentsSchema', () => {
  test('parses a multi-agent record', () => {
    const input = {
      agent1: { mode: 'subagent' as const },
      agent2: { mode: 'primary' as const, description: 'desc' },
    }
    const result = agentsSchema.safeParse(input)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(Object.keys(result.data)).toHaveLength(2)
    expect(result.data['agent1']).toBeDefined()
    expect(result.data['agent2']).toBeDefined()
    expect(result.data['agent1']!.mode).toBe('subagent')
    expect(result.data['agent2']!.mode).toBe('primary')
  })

  test('parses an empty record', () => {
    const result = agentsSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  test('rejects a record containing an invalid agent', () => {
    const result = agentsSchema.safeParse({
      valid: { mode: 'subagent' as const },
      invalid: { mode: 'nope' as const },
    })
    expect(result.success).toBe(false)
  })
})

describe('PERMISSION constant', () => {
  test('has the expected keys', () => {
    const keys = Object.keys(PERMISSION)
    expect(keys).toEqual(['edit', 'bash', 'webfetch', 'external_directory', 'doom_loop'])
  })

  test('all values are deny', () => {
    for (const value of Object.values(PERMISSION)) {
      expect(value).toBe('deny')
    }
  })
})

describe('TOOLS constant', () => {
  test('has the expected keys', () => {
    const keys = Object.keys(TOOLS)
    expect(keys).toEqual([
      'write',
      'edit',
      'patch',
      'bash',
      'read',
      'grep',
      'glob',
      'list',
      'webfetch',
      'task',
      'skill',
    ])
  })

  test('all values are false', () => {
    for (const value of Object.values(TOOLS)) {
      expect(value).toBe(false)
    }
  })
})
