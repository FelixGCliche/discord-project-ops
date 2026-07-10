import { PROMPTS } from 'core/src/prompts.ts'
import { PERMISSION, TOOLS, type Agents } from './agent-config-schema.ts'

export const MODEL = 'opencode-go/deepseek-v4-pro'
const TEMPERATURE = 0
export const STAGE_AGENTS: Record<string, { description: string; prompt: string }> = {
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
