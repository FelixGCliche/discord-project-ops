import { describe, expect, test } from 'bun:test'
import { HttpError } from 'core'
import type { GithubEnv } from '../env'
import { exchangeCodeForToken, fetchAuthenticatedLogin, getAuthorizationUrl, refreshAccessToken } from './index'
import { buildGithubTokenResponse } from './oauth.fixtures'

const ENV: GithubEnv = {
  GITHUB_OAUTH_CLIENT_ID: 'client-id',
  GITHUB_OAUTH_CLIENT_SECRET: 'client-secret',
  GITHUB_OAUTH_REDIRECT_URI: 'https://example.com/oauth/callback',
  GITHUB_OAUTH_STATE_SECRET: 'state-secret',
  GITHUB_APP_ID: 'app-id',
  GITHUB_APP_PRIVATE_KEY_BASE64: 'private-key-base64',
}

describe('getAuthorizationUrl()', () => {
  test('builds the GitHub authorize URL with the expected params', () => {
    const url = new URL(getAuthorizationUrl(ENV, 'some-state'))
    expect(url.origin + url.pathname).toBe('https://github.com/login/oauth/authorize')
    expect(url.searchParams.get('client_id')).toBe(ENV.GITHUB_OAUTH_CLIENT_ID)
    expect(url.searchParams.get('redirect_uri')).toBe(ENV.GITHUB_OAUTH_REDIRECT_URI)
    expect(url.searchParams.get('state')).toBe('some-state')
    expect(url.searchParams.has('scope')).toBe(false)
  })
})

describe('exchangeCodeForToken()', () => {
  test('throws when the token endpoint responds with an error status', async () => {
    const stubFetch = async () => new Response('error', { status: 401 })
    await expect(exchangeCodeForToken(ENV, 'some-code', stubFetch)).rejects.toThrow('GitHub token exchange failed: 401')
  })

  test('parses and returns a valid token response', async () => {
    const payload = buildGithubTokenResponse()
    const stubFetch = async () => Response.json(payload)
    const result = await exchangeCodeForToken(ENV, 'some-code', stubFetch)
    expect(result).toEqual(payload)
  })

  test('throws when the token response is malformed', async () => {
    const stubFetch = async () => Response.json({ token_type: 'bearer' })
    expect(exchangeCodeForToken(ENV, 'some-code', stubFetch)).rejects.toThrow()
  })

  test('throws when the token endpoint responds 200 with an error body', async () => {
    const stubFetch = async () =>
      Response.json({ error: 'bad_verification_code', error_description: 'The code passed is incorrect or expired.' })
    await expect(exchangeCodeForToken(ENV, 'some-code', stubFetch)).rejects.toThrow(
      'GitHub token exchange failed: bad_verification_code - The code passed is incorrect or expired.'
    )
  })

  test('throws with just the error code when error_description is absent', async () => {
    const stubFetch = async () => Response.json({ error: 'bad_verification_code' })
    await expect(exchangeCodeForToken(ENV, 'some-code', stubFetch)).rejects.toThrow(
      'GitHub token exchange failed: bad_verification_code'
    )
  })
})

describe('refreshAccessToken()', () => {
  test('throws when the token endpoint responds with an error status', async () => {
    const stubFetch = async () => new Response('error', { status: 401 })
    expect(refreshAccessToken(ENV, 'refresh-123', stubFetch)).rejects.toThrow('GitHub token refresh failed: 401')
  })

  test('parses and returns a valid token response', async () => {
    const payload = buildGithubTokenResponse({ access_token: 'token-456', refresh_token: 'refresh-456' })
    const stubFetch = async () => Response.json(payload)
    const result = await refreshAccessToken(ENV, 'refresh-123', stubFetch)
    expect(result).toEqual(payload)
  })

  test('throws when the token response is malformed', async () => {
    const stubFetch = async () => Response.json({ token_type: 'bearer' })
    expect(refreshAccessToken(ENV, 'refresh-123', stubFetch)).rejects.toThrow()
  })

  test('throws when the token endpoint responds 200 with an error body', async () => {
    const stubFetch = async () => Response.json({ error: 'bad_refresh_token' })
    await expect(refreshAccessToken(ENV, 'refresh-123', stubFetch)).rejects.toThrow(
      'GitHub token refresh failed: bad_refresh_token'
    )
  })

  test('sends the refresh token and grant_type in the request body', async () => {
    let capturedBody: string | undefined
    const stubFetch = async (_url: string | URL, init?: RequestInit) => {
      capturedBody = init?.body?.toString()
      return Response.json(buildGithubTokenResponse({ access_token: 'token-456', refresh_token: 'refresh-456' }))
    }
    await refreshAccessToken(ENV, 'refresh-123', stubFetch)
    const params = new URLSearchParams(capturedBody)
    expect(params.get('grant_type')).toBe('refresh_token')
    expect(params.get('refresh_token')).toBe('refresh-123')
    expect(params.get('client_id')).toBe(ENV.GITHUB_OAUTH_CLIENT_ID)
    expect(params.get('client_secret')).toBe(ENV.GITHUB_OAUTH_CLIENT_SECRET)
  })
})

describe('fetchAuthenticatedLogin()', () => {
  test('returns the login on success', async () => {
    const stubFetch = async () => Response.json({ login: 'octocat' })
    const login = await fetchAuthenticatedLogin('access-token', stubFetch)
    expect(login).toBe('octocat')
  })

  test('sends the bearer token and accept header', async () => {
    let capturedHeaders: Headers | undefined
    const stubFetch = async (_url: string | URL, init?: RequestInit) => {
      capturedHeaders = new Headers(init?.headers)
      return Response.json({ login: 'octocat' })
    }
    await fetchAuthenticatedLogin('access-token', stubFetch)
    expect(capturedHeaders?.get('Authorization')).toBe('Bearer access-token')
    expect(capturedHeaders?.get('Accept')).toBe('application/vnd.github+json')
    expect(capturedHeaders?.get('User-Agent')).toBe('discord-project-ops')
  })

  test('throws when the response is not ok', async () => {
    const stubFetch = async () => new Response('error', { status: 401 })
    await expect(fetchAuthenticatedLogin('access-token', stubFetch)).rejects.toThrow('GitHub user lookup failed: 401')
  })

  test('throws an HttpError with status 502 when the response is not ok', async () => {
    const stubFetch = async () => new Response('error', { status: 401 })
    expect.assertions(2)
    try {
      await fetchAuthenticatedLogin('access-token', stubFetch)
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError)
      expect((error as HttpError).status).toBe(502)
    }
  })
})
