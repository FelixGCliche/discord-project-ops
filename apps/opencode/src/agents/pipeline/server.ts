import { delimiter, join } from 'node:path'
import { createOpencodeClient, createOpencodeServer } from '@opencode-ai/sdk'
import { buildConfig } from '../build-config.ts'
import { testEnv } from './env.ts'

export type TestServer = {
  url: string
  client: ReturnType<typeof createOpencodeClient>
  close: () => void
}

export function ensureOpencodeBinaryOnPath(): void {
  const binDir = join(import.meta.dir, '..', '..', '..', 'node_modules', '.bin')
  const path = process.env.PATH ?? ''
  if (!path.split(delimiter).includes(binDir)) {
    process.env.PATH = [binDir, path].filter(Boolean).join(delimiter)
  }
}

export function buildAuthHeaders(username: string, password: string | undefined): Record<string, string> | undefined {
  if (!password) return undefined
  const credentials = Buffer.from(`${username}:${password}`).toString('base64')
  return { Authorization: `Basic ${credentials}` }
}

function authHeaders(): Record<string, string> | undefined {
  return buildAuthHeaders(testEnv.OPENCODE_SERVER_USERNAME, testEnv.OPENCODE_SERVER_PASSWORD)
}

async function startEphemeralServer(): Promise<TestServer> {
  ensureOpencodeBinaryOnPath()

  const hostname = testEnv.OPENCODE_SERVER_HOSTNAME === '0.0.0.0' ? '127.0.0.1' : testEnv.OPENCODE_SERVER_HOSTNAME
  const server = await createOpencodeServer({
    hostname,
    // 0 asks the OS for a free port. Ephemeral test servers never need a fixed
    // port -- callers always discover the real one from the returned url -- and
    // a fixed port (e.g. inherited from apps/opencode/.env's OPENCODE_SERVER_PORT,
    // which Bun auto-loads into every test run) would collide with a real
    // opencode instance already listening on it (docker compose, `opencode serve`).
    port: 0,
    config: buildConfig(),
  }).catch((cause) => {
    throw new Error(
      'Failed to start the ephemeral opencode test server. If this is not a port conflict, check that the opencode binary is installed and OPENCODE_API_KEY is set.',
      { cause }
    )
  })

  return {
    url: server.url,
    client: createOpencodeClient({ baseUrl: server.url, headers: authHeaders() }),
    close: server.close,
  }
}

export function connectTestServer(): Promise<TestServer> {
  if (testEnv.OPENCODE_LIVE_SERVER_URL) {
    const url = testEnv.OPENCODE_LIVE_SERVER_URL
    return Promise.resolve({
      url,
      client: createOpencodeClient({ baseUrl: url, headers: authHeaders() }),
      close: () => {},
    })
  }

  return startEphemeralServer()
}
