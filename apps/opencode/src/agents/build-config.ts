import { z } from 'zod'
import type { Config } from '@opencode-ai/sdk'
import staticConfig from '../../opencode.json' with { type: 'json' }
import { agentsSchema, PERMISSION, TOOLS, type Agents } from './agent-config-schema.ts'
import { buildAgents } from './build-agents.ts'

export function parseStaticAgents(rawAgents: unknown): Agents {
  const parsed = agentsSchema.safeParse(rawAgents ?? {})
  if (!parsed.success) {
    throw new Error(`opencode.json has an invalid agent config:\n${z.prettifyError(parsed.error)}`)
  }
  return parsed.data
}

export function buildConfig(): Config {
  const staticAgents = Object.fromEntries(
    Object.entries(parseStaticAgents(staticConfig.agent)).map(([name, agent]) => [
      name,
      { permission: PERMISSION, tools: TOOLS, ...agent },
    ])
  )

  return {
    ...(staticConfig as Omit<Config, 'agent'>),
    agent: {
      ...staticAgents,
      ...buildAgents(),
    },
  }
}
