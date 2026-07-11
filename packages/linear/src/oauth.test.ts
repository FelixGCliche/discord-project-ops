import { afterEach, describe, expect, test } from 'bun:test'
import type { LinearEnv } from './env'
import { createSignedState, exchangeCodeForToken, getAuthorizationUrl, verifySignedState } from './oauth'

const ENV: LinearEnv = {
  LINEAR_OAUTH_CLIENT_ID: 'client-id',
  LINEAR_OAUTH_CLIENT_SECRET: 'client-secret',
  LINEAR_OAUTH_REDIRECT_URI: 'https://example.com/oauth/callback',
}

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('getAuthorizationUrl()', () => {
  test('builds the Linear authorize URL with the expected params', async () => {
    const url = new URL(await getAuthorizationUrl(ENV))
    expect(url.origin + url.pathname).toBe('https://linear.app/oauth/authorize')
    expect(url.searchParams.get('client_id')).toBe(ENV.LINEAR_OAUTH_CLIENT_ID)
    expect(url.searchParams.get('redirect_uri')).toBe(ENV.LINEAR_OAUTH_REDIRECT_URI)
    expect(url.searchParams.get('response_type')).toBe('code')
    expect(url.searchParams.get('scope')).toBe('read,issues:create')
    expect(url.searchParams.get('state')).toBeTruthy()
  })

  test('generates a state that verifies successfully', async () => {
    const url = new URL(await getAuthorizationUrl(ENV))
    const state = url.searchParams.get('state')!
    const isValid = await verifySignedState(ENV.LINEAR_OAUTH_CLIENT_SECRET, state)
    expect(isValid).toBe(true)
  })
})

describe('createSignedState() / verifySignedState()', () => {
  test('accepts a state signed with the same secret', async () => {
    const state = await createSignedState(ENV.LINEAR_OAUTH_CLIENT_SECRET)
    const isValid = await verifySignedState(ENV.LINEAR_OAUTH_CLIENT_SECRET, state)
    expect(isValid).toBe(true)
  })

  test('rejects a state signed with a different secret', async () => {
    const state = await createSignedState('other-secret')
    const isValid = await verifySignedState(ENV.LINEAR_OAUTH_CLIENT_SECRET, state)
    expect(isValid).toBe(false)
  })

  test('rejects a tampered signature', async () => {
    const state = await createSignedState(ENV.LINEAR_OAUTH_CLIENT_SECRET)
    const [nonce, timestamp] = state.split('.')
    const tampered = `${nonce}.${timestamp}.not-the-real-signature`
    const isValid = await verifySignedState(ENV.LINEAR_OAUTH_CLIENT_SECRET, tampered)
    expect(isValid).toBe(false)
  })

  test('rejects a malformed state', async () => {
    const isValid = await verifySignedState(ENV.LINEAR_OAUTH_CLIENT_SECRET, 'not-a-valid-state')
    expect(isValid).toBe(false)
  })

  test('rejects an expired state', async () => {
    const state = await createSignedState(ENV.LINEAR_OAUTH_CLIENT_SECRET)
    const isValid = await verifySignedState(ENV.LINEAR_OAUTH_CLIENT_SECRET, state, -1)
    expect(isValid).toBe(false)
  })
})

describe('exchangeCodeForToken()', () => {
  test('throws when the token endpoint responds with an error status', async () => {
    globalThis.fetch = (async () => new Response('error', { status: 401 })) as unknown as typeof fetch
    await expect(exchangeCodeForToken(ENV, 'some-code')).rejects.toThrow('Linear token exchange failed: 401')
  })

  test('parses and returns a valid token response', async () => {
    const payload = { access_token: 'token-123', token_type: 'Bearer', scope: 'read,issues:create' }
    globalThis.fetch = (async () => Response.json(payload)) as unknown as typeof fetch
    const result = await exchangeCodeForToken(ENV, 'some-code')
    expect(result).toEqual(payload)
  })

  test('throws when the token response is malformed', async () => {
    globalThis.fetch = (async () => Response.json({ token_type: 'Bearer' })) as unknown as typeof fetch
    await expect(exchangeCodeForToken(ENV, 'some-code')).rejects.toThrow()
  })
})
