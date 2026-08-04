import { generateKeyPairSync } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import { mockFetch } from 'core/test-utils.ts'
import { buildCallbackUrls, buildManifest, buildSetupUrl, convertManifestCode, handleCallback } from './index'

describe('buildCallbackUrls', () => {
  const originalSubdomain = process.env.CLOUDFLARE_WORKERS_SUBDOMAIN

  beforeEach(() => {
    process.env.CLOUDFLARE_WORKERS_SUBDOMAIN = 'example-subdomain'
  })

  afterEach(() => {
    if (originalSubdomain === undefined) {
      delete process.env.CLOUDFLARE_WORKERS_SUBDOMAIN
    } else {
      process.env.CLOUDFLARE_WORKERS_SUBDOMAIN = originalSubdomain
    }
  })

  test('returns the callback URL for both the production and staging Workers', () => {
    expect(buildCallbackUrls()).toEqual([
      'https://discord-project-ops.example-subdomain.workers.dev/github/oauth/callback',
      'https://discord-project-ops-staging.example-subdomain.workers.dev/github/oauth/callback',
    ])
  })
})

describe('buildSetupUrl', () => {
  const originalSubdomain = process.env.CLOUDFLARE_WORKERS_SUBDOMAIN

  beforeEach(() => {
    process.env.CLOUDFLARE_WORKERS_SUBDOMAIN = 'example-subdomain'
  })

  afterEach(() => {
    if (originalSubdomain === undefined) {
      delete process.env.CLOUDFLARE_WORKERS_SUBDOMAIN
    } else {
      process.env.CLOUDFLARE_WORKERS_SUBDOMAIN = originalSubdomain
    }
  })

  test('returns the production Worker install URL', () => {
    expect(buildSetupUrl()).toBe('https://discord-project-ops.example-subdomain.workers.dev/github/install')
  })
})

describe('buildManifest', () => {
  const originalSubdomain = process.env.CLOUDFLARE_WORKERS_SUBDOMAIN
  const originalAppName = process.env.GITHUB_APP_NAME
  const originalArgv = process.argv

  beforeEach(() => {
    process.env.CLOUDFLARE_WORKERS_SUBDOMAIN = 'example-subdomain'
    delete process.env.GITHUB_APP_NAME
    process.argv = originalArgv.slice(0, 2)
  })

  afterEach(() => {
    if (originalSubdomain === undefined) {
      delete process.env.CLOUDFLARE_WORKERS_SUBDOMAIN
    } else {
      process.env.CLOUDFLARE_WORKERS_SUBDOMAIN = originalSubdomain
    }
    if (originalAppName === undefined) {
      delete process.env.GITHUB_APP_NAME
    } else {
      process.env.GITHUB_APP_NAME = originalAppName
    }
    process.argv = originalArgv
  })

  test('defaults the name to "Discord Project Ops" when neither GITHUB_APP_NAME nor argv[2] is set', () => {
    expect(buildManifest(8842).name).toBe('Discord Project Ops')
  })

  test('GITHUB_APP_NAME overrides the default name', () => {
    process.env.GITHUB_APP_NAME = 'Custom App Name'
    expect(buildManifest(8842).name).toBe('Custom App Name')
  })

  test('sets the expected static manifest fields', () => {
    const manifest = buildManifest(8842)

    expect(manifest.public).toBe(false)
    expect(manifest.request_oauth_on_install).toBe(true)
    expect(manifest.setup_on_update).toBe(true)
    expect(manifest.default_permissions).toEqual({ contents: 'write', pull_requests: 'write', issues: 'write' })
    expect(manifest.default_events).toEqual([])
  })

  test('redirect_url contains the given port', () => {
    expect(buildManifest(9999).redirect_url).toBe('http://localhost:9999/callback')
  })
})

describe('convertManifestCode', () => {
  afterEach(() => {
    mock.restore()
  })

  test('parses a successful response matching the schema', async () => {
    const body = {
      id: 1,
      client_id: 'client-id',
      client_secret: 'client-secret',
      webhook_secret: null,
      pem: '-----BEGIN RSA PRIVATE KEY-----\nabc\n-----END RSA PRIVATE KEY-----',
      slug: 'my-app',
    }
    mockFetch(async () => new Response(JSON.stringify(body), { status: 200 }))

    const result = await convertManifestCode('some-code')

    expect(result).toEqual(body)
  })

  test('throws an Error starting with "GitHub manifest conversion failed: " on a non-ok response', async () => {
    mockFetch(async () => new Response('boom', { status: 500 }))

    await expect(convertManifestCode('some-code')).rejects.toThrow(/^GitHub manifest conversion failed: /)
  })
})

describe('handleCallback', () => {
  // `console.log` is replaced by a bare assignment below, which `mock.restore()` does not undo.
  const originalLog = console.log

  afterEach(() => {
    mock.restore()
    console.log = originalLog
  })

  test('returns 400 when the state does not match', async () => {
    const url = new URL('http://localhost:8842/callback?code=abc&state=wrong')

    const response = await handleCallback(url, 'right')

    expect(response.status).toBe(400)
  })

  test('returns 400 when the code query parameter is missing', async () => {
    const url = new URL('http://localhost:8842/callback?state=right')

    const response = await handleCallback(url, 'right')

    expect(response.status).toBe(400)
  })

  test('on success, converts the manifest code, logs the env vars, and returns a 200 done page', async () => {
    const { privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
      publicKeyEncoding: { type: 'spki', format: 'pem' },
    })

    const body = {
      id: 42,
      client_id: 'client-id',
      client_secret: 'client-secret',
      webhook_secret: null,
      pem: privateKey,
      slug: 'my-app',
    }
    mockFetch(async () => new Response(JSON.stringify(body), { status: 200 }))

    const logSpy = mock(() => {})
    console.log = logSpy

    const url = new URL('http://localhost:8842/callback?code=abc&state=right')
    const response = await handleCallback(url, 'right')

    expect(response.status).toBe(200)
    const text = await response.text()
    expect(text).toContain('Done')

    const loggedStrings = logSpy.mock.calls.map((call) => call.map(String).join(' '))
    expect(loggedStrings.some((line) => line.includes('GITHUB_APP_ID='))).toBe(true)
    expect(loggedStrings.some((line) => line.includes('GITHUB_OAUTH_CLIENT_ID='))).toBe(true)
    expect(loggedStrings.some((line) => line.includes('GITHUB_OAUTH_CLIENT_SECRET='))).toBe(true)
    expect(loggedStrings.some((line) => line.includes('GITHUB_APP_PRIVATE_KEY_BASE64='))).toBe(true)
  })
})
