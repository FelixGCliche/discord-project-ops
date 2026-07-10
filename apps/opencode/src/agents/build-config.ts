import { z } from 'zod'
import type { Config } from '@opencode-ai/sdk'
import staticConfig from '../../opencode.json' with { type: 'json' }
import { agentsSchema, PERMISSION, TOOLS } from './agent-config-schema.ts'
import { buildAgents } from './build-agents.ts'

// opencode.json is hand-written JSON with nothing type-checking it, so its
// `agent` map is parsed with the same schema its built pipeline agents are
// validated against -- catches a typo'd field instead of silently widening
// to `string` the way a plain `as Config['agent']` cast would. Everything
// else in opencode.json (theme, tui, keybinds, ...) is left as opaque static
// config: `agent` is the only slice this app actively constructs/merges, and
// the `opencode` CLI itself validates the rest when it loads
// OPENCODE_CONFIG_CONTENT, so duplicating that validation here would just be
// re-checking what the binary already checks.
//
// Static agents default to the same deny-all baseline the built pipeline
// agents use (PERMISSION/TOOLS above) rather than opencode.json keeping its
// own copy -- that copy had already drifted (missing task/skill denials). A
// static agent can still override either field explicitly.
export function buildConfig(): Config {
  const parsedStaticAgents = agentsSchema.safeParse(staticConfig.agent ?? {})
  if (!parsedStaticAgents.success) {
    throw new Error(`opencode.json has an invalid agent config:\n${z.prettifyError(parsedStaticAgents.error)}`)
  }

  const staticAgents = Object.fromEntries(
    Object.entries(parsedStaticAgents.data).map(([name, agent]) => [
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
