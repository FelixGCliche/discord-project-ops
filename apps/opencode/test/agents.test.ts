import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { PROMPTS } from 'core/src/prompts.ts'
import { connectTestServer, type TestServer } from './support/server.ts'

const STAGE_AGENTS: ReadonlyArray<readonly [name: string, prompt: string]> = [
  ['summarizer', PROMPTS.summarize],
  ['planner', PROMPTS.plan],
  ['issue-generator', PROMPTS.issue],
]

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
