import { describe, expect, test } from 'bun:test'
import { mockFetch, restoreMocksAfterEachTest } from 'core/test-utils.ts'
import type { LinearEnv } from '../env'
import { exchangeCodeForToken, getAuthorizationUrl, refreshAccessToken } from './index'
import { buildLinearTokenResponse } from './oauth.fixtures'

const ENV: LinearEnv = {
  LINEAR_OAUTH_CLIENT_ID: 'client-id',
  LINEAR_OAUTH_CLIENT_SECRET: 'client-secret',
  LINEAR_OAUTH_REDIRECT_URI: 'https://example.com/oauth/callback',
  LINEAR_OAUTH_STATE_SECRET: 'state-secret',
}

restoreMocksAfterEachTest()

describe('getAuthorizationUrl()', () => {
  test('builds the Linear authorize URL with the expected params', () => {
    const url = new URL(getAuthorizationUrl(ENV, 'some-state'))
    expect(url.origin + url.pathname).toBe('https://linear.app/oauth/authorize')
    expect(url.searchParams.get('client_id')).toBe(ENV.LINEAR_OAUTH_CLIENT_ID)
    expect(url.searchParams.get('redirect_uri')).toBe(ENV.LINEAR_OAUTH_REDIRECT_URI)
    expect(url.searchParams.get('response_type')).toBe('code')
    expect(url.searchParams.get('scope')).toBe('read,write')
    expect(url.searchParams.get('state')).toBe('some-state')
  })
})

describe('exchangeCodeForToken()', () => {
  test('throws when the token endpoint responds with an error status', async () => {
    mockFetch(async () => new Response('error', { status: 401 }))
    await expect(exchangeCodeForToken(ENV, 'some-code')).rejects.toThrow('Linear token exchange failed: 401')
  })

  test('parses and returns a valid token response', async () => {
    const payload = buildLinearTokenResponse()
    mockFetch(async () => Response.json(payload))
    const result = await exchangeCodeForToken(ENV, 'some-code')
    expect(result).toEqual(payload)
  })

  test('throws when the token response is malformed', async () => {
    mockFetch(async () => Response.json({ token_type: 'Bearer' }))
    expect(exchangeCodeForToken(ENV, 'some-code')).rejects.toThrow()
  })
})

describe('refreshAccessToken()', () => {
  test('throws when the token endpoint responds with an error status', async () => {
    mockFetch(async () => new Response('error', { status: 401 }))
    expect(refreshAccessToken(ENV, 'refresh-123')).rejects.toThrow('Linear token refresh failed: 401')
  })

  test('parses and returns a valid token response', async () => {
    const payload = buildLinearTokenResponse({ access_token: 'token-456', refresh_token: 'refresh-456' })
    mockFetch(async () => Response.json(payload))
    const result = await refreshAccessToken(ENV, 'refresh-123')
    expect(result).toEqual(payload)
  })

  test('throws when the token response is malformed', async () => {
    mockFetch(async () => Response.json({ token_type: 'Bearer' }))
    expect(refreshAccessToken(ENV, 'refresh-123')).rejects.toThrow()
  })

  test('sends the refresh token and grant_type in the request body', async () => {
    let capturedBody: string | undefined
    mockFetch(async (_url: string | URL | Request, init?: RequestInit) => {
      capturedBody = init?.body?.toString()
      return Response.json(buildLinearTokenResponse({ access_token: 'token-456', refresh_token: 'refresh-456' }))
    })
    await refreshAccessToken(ENV, 'refresh-123')
    const params = new URLSearchParams(capturedBody)
    expect(params.get('grant_type')).toBe('refresh_token')
    expect(params.get('refresh_token')).toBe('refresh-123')
    expect(params.get('client_id')).toBe(ENV.LINEAR_OAUTH_CLIENT_ID)
    expect(params.get('client_secret')).toBe(ENV.LINEAR_OAUTH_CLIENT_SECRET)
  })
})
