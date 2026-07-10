import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { createOpencodeClient, createOpencodeServer } from '@opencode-ai/sdk'
import { buildConfig } from '../build-config.ts'
import { buildAuthHeaders, ensureOpencodeBinaryOnPath } from './server.ts'

describe('buildAuthHeaders', () => {
  test('returns undefined when no password is given', () => {
    expect(buildAuthHeaders('opencode', undefined)).toBeUndefined()
  })

  test('returns undefined when the password is an empty string', () => {
    expect(buildAuthHeaders('opencode', '')).toBeUndefined()
  })

  test('returns a Basic auth Authorization header built from username and password', () => {
    const headers = buildAuthHeaders('opencode', 'secret')
    expect(headers).toEqual({ Authorization: `Basic ${Buffer.from('opencode:secret').toString('base64')}` })
  })
})

describe('opencode server: password enforcement (integration)', () => {
  const TEST_PORT = 4199
  const TEST_PASSWORD = 'integration-test-password'
  const originalPassword = process.env.OPENCODE_SERVER_PASSWORD

  let url: string
  let close: () => void

  beforeAll(async () => {
    ensureOpencodeBinaryOnPath()
    process.env.OPENCODE_SERVER_PASSWORD = TEST_PASSWORD

    const server = await createOpencodeServer({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      config: buildConfig(),
    })
    url = server.url
    close = server.close
  })

  afterAll(() => {
    close()
    process.env.OPENCODE_SERVER_PASSWORD = originalPassword
  })

  test('rejects requests with no credentials', async () => {
    const client = createOpencodeClient({ baseUrl: url })
    const result = await client.config.get()
    expect(result.data).toBeUndefined()
  })

  test('rejects requests with the wrong password', async () => {
    const client = createOpencodeClient({ baseUrl: url, headers: buildAuthHeaders('opencode', 'wrong-password') })
    const result = await client.config.get()
    expect(result.data).toBeUndefined()
  })

  test('accepts requests with the correct Basic auth credentials', async () => {
    const client = createOpencodeClient({ baseUrl: url, headers: buildAuthHeaders('opencode', TEST_PASSWORD) })
    const result = await client.config.get()
    expect(result.data?.agent).toBeDefined()
  })
})
