import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { prettifyError } from 'zod'
import { DecisionSchema, IssuesSchema, JSON_SCHEMAS, PlanSchema } from 'core/src/schemas/index.ts'
import decisionFixture from 'core/src/test/fixtures/decision.valid.json'
import messagesFixture from 'core/src/test/fixtures/messages.valid.json'
import planFixture from 'core/src/test/fixtures/plan.valid.json'
import { shouldRunLive } from './support/env.ts'
import { connectTestServer, type TestServer } from './support/server.ts'

const VAULT_CONTEXT =
  'No GDD note exists yet for inventory carry rules. Closest related note: "Character Stats" ' +
  'defines strength on a 1-10 scale, used elsewhere for combat roll bonuses.'

function systemPromptFor(schema: object): string {
  return `Respond with JSON only, matching this JSON Schema exactly. No prose, no code fences:\n${JSON.stringify(schema)}`
}

function parseJSONResponse(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  return JSON.parse(fenced ? fenced[1]! : text)
}

async function promptStage(server: TestServer, agent: string, schema: object, inputText: string): Promise<unknown> {
  const session = await server.client.session.create({ body: {} })
  if (!session.data) throw new Error(`session.create failed: ${JSON.stringify(session.error)}`)

  const response = await server.client.session.prompt({
    path: { id: session.data.id },
    body: {
      agent,
      system: systemPromptFor(schema),
      parts: [{ type: 'text', text: inputText }],
    },
  })
  if (!response.data) throw new Error(`session.prompt failed: ${JSON.stringify(response.error)}`)

  const text = response.data.parts
    .filter((part): part is Extract<typeof part, { type: 'text' }> => part.type === 'text')
    .map((part) => part.text)
    .join('')

  return parseJSONResponse(text)
}

describe.skipIf(!shouldRunLive)('opencode server: pipeline stage outputs (live)', () => {
  let server: TestServer

  beforeAll(async () => {
    server = await connectTestServer()
  })

  afterAll(() => {
    server.close()
  })

  test('summarizer output matches DecisionSchema', async () => {
    const output = await promptStage(server, 'summarizer', JSON_SCHEMAS.summarize, JSON.stringify(messagesFixture))
    const result = DecisionSchema.safeParse(output)
    if (!result.success) throw new Error(prettifyError(result.error))
    expect(result.success).toBe(true)
  }, 60_000)

  test('planner output matches PlanSchema', async () => {
    const inputText = `DECISION:\n${JSON.stringify(decisionFixture)}\n\nVAULT_CONTEXT:\n${VAULT_CONTEXT}`
    const output = await promptStage(server, 'planner', JSON_SCHEMAS.plan, inputText)
    const result = PlanSchema.safeParse(output)
    if (!result.success) throw new Error(prettifyError(result.error))
    expect(result.success).toBe(true)
  }, 60_000)

  test('issue-generator output matches IssuesSchema', async () => {
    const output = await promptStage(server, 'issue-generator', JSON_SCHEMAS.issue, JSON.stringify(planFixture))
    const result = IssuesSchema.safeParse(output)
    if (!result.success) throw new Error(prettifyError(result.error))
    expect(result.success).toBe(true)
  }, 60_000)
})
