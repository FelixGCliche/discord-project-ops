import { delimiter, join } from 'node:path'
import { createOpencodeClient, createOpencodeServer } from '@opencode-ai/sdk'
import { buildConfig } from '../build-config.ts'
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

function ensureOpencodeBinaryOnPath(): void {
  const binDir = join(import.meta.dir, '..', '..', '..', 'node_modules', '.bin')
  const path = process.env.PATH ?? ''
  if (!path.split(delimiter).includes(binDir)) {
    process.env.PATH = [binDir, path].filter(Boolean).join(delimiter)
  }
}

function authHeaders(): Record<string, string> | undefined {
  if (!testEnv.OPENCODE_SERVER_PASSWORD) return undefined
  const credentials = Buffer.from(`${testEnv.OPENCODE_SERVER_USERNAME}:${testEnv.OPENCODE_SERVER_PASSWORD}`).toString(
    'base64'
  )
  return { Authorization: `Basic ${credentials}` }
}

async function startEphemeralServer(): Promise<TestServer> {
  ensureOpencodeBinaryOnPath()

  const hostname = testEnv.OPENCODE_SERVER_HOSTNAME === '0.0.0.0' ? '127.0.0.1' : testEnv.OPENCODE_SERVER_HOSTNAME
  const server = await createOpencodeServer({
    hostname,
    port: testEnv.OPENCODE_SERVER_PORT,
    config: buildConfig(),
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
