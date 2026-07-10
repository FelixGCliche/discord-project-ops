import { z } from 'zod'
import type { AgentConfig as SdkAgentConfig } from '@opencode-ai/sdk'

const permissionValueSchema = z.enum(['ask', 'allow', 'deny'])

export const agentConfigSchema: z.ZodType<SdkAgentConfig> = z.object({
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
