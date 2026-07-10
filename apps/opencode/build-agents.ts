// apps/opencode/build-agents.ts
//
// Builds the three pipeline-stage agent configs in memory, straight from the
// canonical role prompts (core/src/prompts.ts). No files are written: the
// opencode SDK's createOpencodeServer() takes a full Config object and hands
// it to the CLI via an env var (OPENCODE_CONFIG_CONTENT), so there's nothing
// to gain from round-tripping through frontmatter'd .md files the CLI would
// just re-parse. Prompt bodies are never edited here -- if a stage's
// contract changes, change core/src/prompts.ts, not this file.
//
// The agent shape is validated with zod rather than trusted as a plain
// TypeScript record: opencode.json's static agents (entrypoint.ts) are
// hand-written JSON with nothing type-checking them, so parsing is the only
// thing that actually catches a typo'd field there.

import { z } from 'zod'
import { PROMPTS } from 'core/src/prompts.ts'
import type { AgentConfig as SdkAgentConfig } from '@opencode-ai/sdk'

const permissionValueSchema = z.enum(['ask', 'allow', 'deny'])

// VERIFY: shape taken from the AgentConfig type actually shipped in
// @opencode-ai/sdk@1.17.15 (node_modules/@opencode-ai/sdk/dist/gen/types.gen.d.ts)
// rather than from opencode's docs, since the two have drifted before (see
// PIPELINE-SPEC.md's "Why it's built this way" section on the old OpenClaw +
// Lobster design). `permission` only covers
// edit/bash/webfetch/doom_loop/external_directory -- it has no
// read/glob/grep/list/task/skill keys, so those still have to go through the
// (undeprecated-in-this-version) `tools` map.
//
// Spot-checked against a live `opencode serve` (1.17.15, entrypoint.ts run
// locally, `GET /agent`): both `permission` and `tools` end up flattened
// into one permission *rule list* per agent, with our denies appended after
// opencode's built-in allow-all defaults -- e.g. summarizer's rules include
// both {read,*,allow} (default) and {read,*,deny} (ours), in that order.
// That's consistent with last-match-wins and suggests the deny-all does
// apply, but it was only checked by reading the rule list back, not by
// actually trying a denied tool call from inside the agent -- worth doing
// before relying on this for anything security-sensitive.
//
// This is a hand-picked subset of the SDK's AgentConfig, not a derivation of
// it, so `.passthrough()` lets any field we haven't modeled (e.g. `color`,
// `maxSteps`, `top_p`) through unvalidated instead of zod silently stripping
// it -- a field opencode.json sets that we don't know about should reach the
// CLI, not vanish.
export const agentConfigSchema = z
  .object({
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
      .passthrough()
      .optional(),
    tools: z.record(z.string(), z.boolean()).optional(),
  })
  .passthrough()

export type AgentConfig = z.infer<typeof agentConfigSchema>

// Compile-time check that our hand-picked schema stays assignable into the
// SDK's real AgentConfig -- fails to typecheck if @opencode-ai/sdk changes
// the shape of a field we do model here.
type _AssertAssignable = AgentConfig extends SdkAgentConfig ? true : never
const _assertAssignable = true satisfies _AssertAssignable

export const agentsSchema = z.record(z.string(), agentConfigSchema)

export type Agents = z.infer<typeof agentsSchema>

// Exported so entrypoint.ts can apply the same deny-all baseline to
// opencode.json's static agents -- one list instead of a second hand-kept
// copy in JSON that silently drifts out of sync (it already had: the static
// "pipeline" agent's tools list was missing task/skill).
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

// model is pinned per-agent rather than left to the global default or
// passed at prompt-call time:
//   1. opencode's own docs: "Use the model config to override the model
//      for this agent" -- agent-level `model` is the documented, supported
//      override point.
//   2. A currently-open opencode bug (anomalyco/opencode#18615) shows an
//      explicit `model` passed in the *session.prompt* call body being
//      silently ignored once `agent` is also set, falling back to that
//      agent's built-in model chain instead. Pinning at the agent-definition
//      level sidesteps this entirely.
//
// VERIFY: same model used for all three stages as a starting point (matches
// openclaw.json's agents.defaults.model.primary). Bump planner/issue-generator
// to opencode-go/deepseek-v4-pro individually if flash's structured-output
// adherence proves flaky in testing -- see verify/isolation-test.ts.
const MODEL = 'opencode-go/deepseek-v4-pro'

// Deterministic JSON output. Worth being explicit: opencode's per-model
// default temperature is 0 for most models but 0.55 for Qwen -- if a stage
// ever moves onto a qwen3.7-* model, this override is what keeps output
// deterministic, not the model default.
const TEMPERATURE = 0

// Filenames map 1:1 onto agent names, matching PIPELINE-SPEC.md's stage
// table. Keys on the left are the agent slugs; PROMPTS' keys (summarize/
// plan/issue) are core's own naming and don't need to match. Plain typed
// object, not zod-parsed: every field here is a string literal or a
// core/src/prompts.ts export, already guaranteed non-empty by TypeScript --
// there's nothing a runtime check would catch that the compiler doesn't.
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

// Not zod-validated on the way out: every field comes from the constants
// above, already typed against AgentConfig, so there's no untrusted input
// here for a parse to catch. opencode.json's static agents (entrypoint.ts)
// are the ones actually worth parsing, since those are hand-written JSON.
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
