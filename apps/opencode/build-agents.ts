import { z } from 'zod'
import { PROMPTS } from 'core/src/prompts.ts'

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

export const agentsSchema = z.record(z.string(), agentConfigSchema)

export type Agents = z.infer<typeof agentsSchema>

const PERMISSION: NonNullable<AgentConfig['permission']> = {
  edit: 'deny',
  bash: 'deny',
  webfetch: 'deny',
  external_directory: 'deny',
  doom_loop: 'deny',
}

const TOOLS: NonNullable<AgentConfig['tools']> = {
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

const stageAgentSchema = z.object({
  description: z.string().min(1),
  prompt: z.string().min(1),
})

const stageAgentsSchema = z.record(z.string(), stageAgentSchema)
const STAGE_AGENTS = stageAgentsSchema.parse({
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
})

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

  return agentsSchema.parse(agents)
}
