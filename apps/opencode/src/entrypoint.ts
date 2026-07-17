import { createOpencodeServer } from '@opencode-ai/sdk'
import { parseEnv } from 'core'
import { opencodeEnvSchema } from './env.ts'
import { buildConfig } from './agents/build-config.ts'

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
