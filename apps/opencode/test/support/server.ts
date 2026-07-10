import { delimiter, join } from 'node:path'
import { createOpencodeClient, createOpencodeServer } from '@opencode-ai/sdk'
import { buildConfig } from '../../build-agents.ts'
import { testEnv } from './env.ts'

export type TestServer = {
  url: string
  client: ReturnType<typeof createOpencodeClient>
  close: () => void
}

export function resolveServerUrl(): string {
  if (testEnv.OPENCODE_LIVE_SERVER_URL) return testEnv.OPENCODE_LIVE_SERVER_URL

  const connectHost = testEnv.OPENCODE_SERVER_HOSTNAME === '0.0.0.0' ? 'localhost' : testEnv.OPENCODE_SERVER_HOSTNAME
  return `http://${connectHost}:${testEnv.OPENCODE_SERVER_PORT}`
}

// createOpencodeServer spawns the `opencode` binary via PATH lookup. CI (and
// a plain `bun test` outside a package.json script) doesn't put this
// package's node_modules/.bin on PATH the way `bun run` does, so the
// opencode-ai devDependency installed there would otherwise go unfound.
function ensureOpencodeBinaryOnPath(): void {
  const binDir = join(import.meta.dir, '..', '..', 'node_modules', '.bin')
  const path = process.env.PATH ?? ''
  if (!path.split(delimiter).includes(binDir)) {
    process.env.PATH = [binDir, path].filter(Boolean).join(delimiter)
  }
}

// No live server URL means there's nothing already listening to test
// against, so spin up an ephemeral one from the same config entrypoint.ts
// builds in production. Config wiring can be asserted this way with no real
// OPENCODE_API_KEY -- the pipeline agents' prompt/permission/tools are baked
// into the config passed to the server, not fetched from a live provider.
async function startEphemeralServer(): Promise<TestServer> {
  ensureOpencodeBinaryOnPath()

  const hostname = testEnv.OPENCODE_SERVER_HOSTNAME === '0.0.0.0' ? '127.0.0.1' : testEnv.OPENCODE_SERVER_HOSTNAME
  const server = await createOpencodeServer({
    hostname,
    port: testEnv.OPENCODE_SERVER_PORT,
    config: buildConfig(),
  })

  return { url: server.url, client: createOpencodeClient({ baseUrl: server.url }), close: server.close }
}

export function connectTestServer(): Promise<TestServer> {
  if (testEnv.OPENCODE_LIVE_SERVER_URL) {
    const url = testEnv.OPENCODE_LIVE_SERVER_URL
    return Promise.resolve({ url, client: createOpencodeClient({ baseUrl: url }), close: () => {} })
  }

  return startEphemeralServer()
}
