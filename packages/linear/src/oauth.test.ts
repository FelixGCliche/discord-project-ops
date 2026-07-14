import { describe, expect, test } from 'bun:test'
import type { LinearEnv } from './env'
import {
  createSignedState,
  exchangeCodeForToken,
  getAuthorizationUrl,
  refreshAccessToken,
  verifySignedState,
} from './oauth'

const ENV: LinearEnv = {
  LINEAR_OAUTH_CLIENT_ID: 'client-id',
  LINEAR_OAUTH_CLIENT_SECRET: 'client-secret',
  LINEAR_OAUTH_REDIRECT_URI: 'https://example.com/oauth/callback',
  LINEAR_OAUTH_STATE_SECRET: 'state-secret',
}

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
    const isValid = await verifySignedState(ENV.LINEAR_OAUTH_STATE_SECRET, state)
    expect(isValid).toBe(true)
  })
})

describe('createSignedState() / verifySignedState()', () => {
  test('accepts a state signed with the same secret', async () => {
    const state = await createSignedState(ENV.LINEAR_OAUTH_STATE_SECRET)
    const isValid = await verifySignedState(ENV.LINEAR_OAUTH_STATE_SECRET, state)
    expect(isValid).toBe(true)
  })

  test('rejects a state signed with a different secret', async () => {
    const state = await createSignedState('other-secret')
    const isValid = await verifySignedState(ENV.LINEAR_OAUTH_STATE_SECRET, state)
    expect(isValid).toBe(false)
  })

  test('rejects a tampered signature', async () => {
    const state = await createSignedState(ENV.LINEAR_OAUTH_STATE_SECRET)
    const [nonce, timestamp] = state.split('.')
    const tampered = `${nonce}.${timestamp}.not-the-real-signature`
    const isValid = await verifySignedState(ENV.LINEAR_OAUTH_STATE_SECRET, tampered)
    expect(isValid).toBe(false)
  })

  test('rejects a malformed state', async () => {
    const isValid = await verifySignedState(ENV.LINEAR_OAUTH_STATE_SECRET, 'not-a-valid-state')
    expect(isValid).toBe(false)
  })

  test('rejects an expired state', async () => {
    const state = await createSignedState(ENV.LINEAR_OAUTH_STATE_SECRET)
    const isValid = await verifySignedState(ENV.LINEAR_OAUTH_STATE_SECRET, state, -1)
    expect(isValid).toBe(false)
  })
})

describe('exchangeCodeForToken()', () => {
  test('throws when the token endpoint responds with an error status', async () => {
    const stubFetch = async () => new Response('error', { status: 401 })
    await expect(exchangeCodeForToken(ENV, 'some-code', stubFetch)).rejects.toThrow('Linear token exchange failed: 401')
  })

  test('parses and returns a valid token response', async () => {
    const payload = {
      access_token: 'token-123',
      token_type: 'Bearer',
      scope: 'read,issues:create',
      expires_in: 86399,
      refresh_token: 'refresh-123',
    }
    const stubFetch = async () => Response.json(payload)
    const result = await exchangeCodeForToken(ENV, 'some-code', stubFetch)
    expect(result).toEqual(payload)
  })

  test('throws when the token response is malformed', async () => {
    const stubFetch = async () => Response.json({ token_type: 'Bearer' })
    expect(exchangeCodeForToken(ENV, 'some-code', stubFetch)).rejects.toThrow()
  })
})

describe('refreshAccessToken()', () => {
  test('throws when the token endpoint responds with an error status', async () => {
    const stubFetch = async () => new Response('error', { status: 401 })
    expect(refreshAccessToken(ENV, 'refresh-123', stubFetch)).rejects.toThrow('Linear token refresh failed: 401')
  })

  test('parses and returns a valid token response', async () => {
    const payload = {
      access_token: 'token-456',
      token_type: 'Bearer',
      scope: 'read,issues:create',
      expires_in: 86399,
      refresh_token: 'refresh-456',
    }
    const stubFetch = async () => Response.json(payload)
    const result = await refreshAccessToken(ENV, 'refresh-123', stubFetch)
    expect(result).toEqual(payload)
  })

  test('throws when the token response is malformed', async () => {
    const stubFetch = async () => Response.json({ token_type: 'Bearer' })
    expect(refreshAccessToken(ENV, 'refresh-123', stubFetch)).rejects.toThrow()
  })

  test('sends the refresh token and grant_type in the request body', async () => {
    let capturedBody: string | undefined
    const stubFetch = async (_url: string | URL, init?: RequestInit) => {
      capturedBody = init?.body?.toString()
      return Response.json({
        access_token: 'token-456',
        token_type: 'Bearer',
        scope: 'read,issues:create',
        expires_in: 86399,
        refresh_token: 'refresh-456',
      })
    }
    await refreshAccessToken(ENV, 'refresh-123', stubFetch)
    const params = new URLSearchParams(capturedBody)
    expect(params.get('grant_type')).toBe('refresh_token')
    expect(params.get('refresh_token')).toBe('refresh-123')
    expect(params.get('client_id')).toBe(ENV.LINEAR_OAUTH_CLIENT_ID)
    expect(params.get('client_secret')).toBe(ENV.LINEAR_OAUTH_CLIENT_SECRET)
  })
})
