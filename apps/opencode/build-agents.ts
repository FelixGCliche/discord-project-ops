import { z } from 'zod'
import { PROMPTS } from 'core/src/prompts.ts'
import type { AgentConfig as SdkAgentConfig, Config } from '@opencode-ai/sdk'
import staticConfig from './opencode.json' with { type: 'json' }

const permissionValueSchema = z.enum(['ask', 'allow', 'deny'])

export const agentConfigSchema = z.object({
  description: z.string().optional(),
  mode: z.enum(['subagent', 'primary', 'all']).optional(),
  model: z.string().optional(),
  temperature: z.number().optional(),
  prompt: z.string().optional(),
  permission: z
    .object({
      edit: permissionValueSchema.optional(),
      bash: permissionValueSchema.optional(),
      webfetch: permissionValueSchema.optional(),
      external_directory: permissionValueSchema.optional(),
      doom_loop: permissionValueSchema.optional(),
    })
    .optional(),
  tools: z.record(z.string(), z.boolean()).optional(),
})

export type AgentConfig = z.infer<typeof agentConfigSchema>

// Compile-time check that our hand-picked schema stays assignable into the
// SDK's real AgentConfig -- fails to typecheck if @opencode-ai/sdk changes
// the shape of a field we do model here.
type _AssertAssignable = AgentConfig extends SdkAgentConfig ? true : never
const _assertAssignable = true satisfies _AssertAssignable

export const agentsSchema = z.record(z.string(), agentConfigSchema)
export type Agents = z.infer<typeof agentsSchema>

export const PERMISSION: NonNullable<AgentConfig['permission']> = {
  edit: 'deny',
  bash: 'deny',
  webfetch: 'deny',
  external_directory: 'deny',
  doom_loop: 'deny',
}

export const TOOLS: NonNullable<AgentConfig['tools']> = {
  write: false,
  edit: false,
  patch: false,
  bash: false,
  read: false,
  grep: false,
  glob: false,
  list: false,
  webfetch: false,
  task: false,
  skill: false,
}

const MODEL = 'opencode-go/deepseek-v4-pro'
const TEMPERATURE = 0
const STAGE_AGENTS: Record<string, { description: string; prompt: string }> = {
  summarizer: {
    description:
      'Stage 1: converts a raw Discord forum post into a structured decision record. Tool-less -- invoked only by the pipeline, never by a human in chat.',
    prompt: PROMPTS.summarize,
  },
  planner: {
    description:
      'Stage 2: turns an approved decision record + vault context into an implementation plan. Tool-less -- invoked only by the pipeline, never by a human in chat.',
    prompt: PROMPTS.plan,
  },
  'issue-generator': {
    description:
      'Stage 3: decomposes an approved plan into a list of proposed Linear issues. Tool-less -- invoked only by the pipeline, never by a human in chat.',
    prompt: PROMPTS.issue,
  },
}

export function buildAgents(): Agents {
  const agents: Agents = {}

  for (const [name, stage] of Object.entries(STAGE_AGENTS)) {
    agents[name] = {
      description: stage.description,
      mode: 'subagent',
      model: MODEL,
      temperature: TEMPERATURE,
      prompt: stage.prompt,
      permission: PERMISSION,
      tools: TOOLS,
    }
  }

  return agents
}

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
  const staticAgents = Object.fromEntries(
    Object.entries(agentsSchema.parse(staticConfig.agent ?? {})).map(([name, agent]) => [
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
