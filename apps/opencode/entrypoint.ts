// apps/opencode/entrypoint.ts
//
// Replaces a shell entrypoint. Starts the opencode server in-process via the
// SDK instead of shelling out to `opencode serve` from bash: createOpencodeServer
// still spawns the `opencode` binary under the hood, but it hands the full
// config through as JSON over an env var, so there's no shell scripting or
// intermediate config file needed to wire the pipeline agents in.

import { createOpencodeServer } from '@opencode-ai/sdk'
import { parseEnv } from 'core/src/env.ts'
import { opencodeEnvSchema } from './env.ts'
import { buildConfig } from './build-agents.ts'

const env = parseEnv(opencodeEnvSchema, process.env)

const server = await createOpencodeServer({
  hostname: env.OPENCODE_SERVER_HOSTNAME,
  port: env.OPENCODE_SERVER_PORT,
  config: buildConfig(),
})

console.log(`opencode server listening on ${server.url}`)

const shutdown = (signal: string) => {
  console.log(`received ${signal}, shutting down`)
  server.close()
  process.exit(0)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
