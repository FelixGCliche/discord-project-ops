import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { buildConfig } from './build-config.ts'
import { PERMISSION, TOOLS } from './agent-config-schema.ts'
import { MODEL, STAGE_AGENTS as PIPELINE_STAGE_AGENTS } from './build-agents.ts'
import { connectTestServer, type TestServer } from './pipeline/server.ts'

const STAGE_AGENTS: ReadonlyArray<readonly [name: string, prompt: string]> = Object.entries(PIPELINE_STAGE_AGENTS).map(
  ([name, stage]) => [name, stage.prompt] as const
)

describe('opencode server: pipeline agent wiring', () => {
  let server: TestServer

  beforeAll(async () => {
    server = await connectTestServer()
  })

  afterAll(() => {
    server.close()
  })

  test.each(STAGE_AGENTS)('%s is registered with its exact role prompt', async (name, prompt) => {
    const config = await server.client.config.get()
    const agent = config.data?.agent?.[name]

    expect(agent).toBeDefined()
    expect(agent?.prompt).toBe(prompt)
    expect(agent?.mode).toBe('subagent')
  })

  test.each(STAGE_AGENTS)('%s denies every permission', async (name) => {
    const config = await server.client.config.get()
    const agent = config.data?.agent?.[name]

    expect(agent?.permission).toBeDefined()
    for (const value of Object.values(agent?.permission ?? {})) {
      expect(value).toBe('deny')
    }
  })

  test.each(STAGE_AGENTS)('%s has every tool disabled', async (name) => {
    const config = await server.client.config.get()
    const agent = config.data?.agent?.[name]

    expect(agent?.tools).toBeDefined()
    for (const value of Object.values(agent?.tools ?? {})) {
      expect(value).toBe(false)
    }
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

  test.each(STAGE_AGENTS)('%s has correct model, temperature, and mode', (name) => {
    const config = buildConfig()
    const agent = config.agent?.[name]
    expect(agent).toBeDefined()
    expect(agent?.model).toBe(MODEL)
    expect(agent?.temperature).toBe(0)
    expect(agent?.mode).toBe('subagent')
  })

  test.each(STAGE_AGENTS)('%s has correct role prompt', (name, prompt) => {
    const config = buildConfig()
    const agent = config.agent?.[name]
    expect(agent).toBeDefined()
    expect(agent?.prompt).toBe(prompt)
  })

  test('pipeline agents have all permissions denied', () => {
    const config = buildConfig()
    for (const [name] of STAGE_AGENTS) {
      expect(config.agent?.[name]?.permission).toEqual(PERMISSION)
    }
  })

  test('pipeline agents have all tools disabled', () => {
    const config = buildConfig()
    for (const [name] of STAGE_AGENTS) {
      expect(config.agent?.[name]?.tools).toEqual(TOOLS)
    }
  })

  test('static agent inherits deny-all baseline', () => {
    const config = buildConfig()
    const pipeline = config.agent?.pipeline
    expect(pipeline).toBeDefined()
    expect(pipeline?.permission).toEqual(PERMISSION)
    expect(pipeline?.tools).toEqual(TOOLS)
  })
})
