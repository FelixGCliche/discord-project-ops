import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import type { AgentConfig } from '@opencode-ai/sdk'
import { PROMPTS } from 'core'
import staticConfig from '../../opencode.json' with { type: 'json' }
import { buildConfig, parseStaticAgents } from './build-config.ts'
import { PERMISSION, TOOLS } from './agent-config-schema.ts'
import { connectTestServer, type TestServer } from './pipeline/server.ts'
import { expectAllValuesToBe } from './test-utils.ts'

const STAGE_AGENTS: ReadonlyArray<readonly [name: string, prompt: string]> = [
  ['summarizer', PROMPTS.summarize],
  ['planner', PROMPTS.plan],
  ['issue-generator', PROMPTS.issue],
]

const NATIVE_AGENTS = Object.keys(staticConfig.agent).filter((name) => name !== 'pipeline')

describe('opencode server: pipeline agent wiring', () => {
  let server: TestServer
  let agents: Record<string, AgentConfig | undefined> | undefined

  beforeAll(async () => {
    server = await connectTestServer()
    const config = await server.client.config.get()
    agents = config.data?.agent
  })

  afterAll(() => {
    server.close()
  })

  test.each(STAGE_AGENTS)('%s is registered with its exact role prompt', (name, prompt) => {
    const agent = agents?.[name]

    expect(agent).toBeDefined()
    expect(agent?.prompt).toBe(prompt)
    expect(agent?.mode).toBe('subagent')
  })

  test.each(STAGE_AGENTS)('%s denies every permission', (name) => {
    const agent = agents?.[name]

    expect(agent?.permission).toBeDefined()
    expectAllValuesToBe(agent?.permission, 'deny')
  })

  test.each(STAGE_AGENTS)('%s has every tool disabled', (name) => {
    const agent = agents?.[name]

    expect(agent?.tools).toBeDefined()
    expectAllValuesToBe(agent?.tools, false)
  })

  test.each(NATIVE_AGENTS)('native agent %s denies every permission', (name) => {
    const agent = agents?.[name]

    expect(agent?.permission).toBeDefined()
    expectAllValuesToBe(agent?.permission, 'deny')
  })
})

describe('buildConfig()', () => {
  test('returns a config with agent entries', () => {
    const config = buildConfig()
    expect(config.agent).toBeDefined()
    expect(Object.keys(config.agent ?? {}).length).toBeGreaterThan(0)
  })

  test('includes all static and pipeline agents', () => {
    const config = buildConfig()
    expect(config.agent).toHaveProperty('pipeline')
    expect(config.agent).toHaveProperty('summarizer')
    expect(config.agent).toHaveProperty('planner')
    expect(config.agent).toHaveProperty('issue-generator')
  })

  test('static agent inherits deny-all baseline', () => {
    const config = buildConfig()
    const pipeline = config.agent?.pipeline
    expect(pipeline).toBeDefined()
    expect(pipeline?.permission).toEqual(PERMISSION)
    expect(pipeline?.tools).toEqual(TOOLS)
  })

  test('parseStaticAgents throws a helpful error for an invalid agent config', () => {
    expect(() => parseStaticAgents({ pipeline: { mode: 'not-a-real-mode' } })).toThrow(
      /opencode\.json has an invalid agent config/
    )
  })
})
