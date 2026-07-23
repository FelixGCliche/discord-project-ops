import { importSPKI, jwtVerify } from 'jose'
import { describe, expect, test } from 'bun:test'
import { HttpError } from 'core'
import type { GithubEnv } from '../env'
import { TEST_GITHUB_APP_PRIVATE_KEY_BASE64, TEST_GITHUB_APP_PUBLIC_KEY_BASE64 } from './app-auth.fixtures'
import { createAppJwt, createInstallationAccessToken, listAppInstallations } from './index'

const ENV: GithubEnv = {
  GITHUB_OAUTH_CLIENT_ID: 'client-id',
  GITHUB_OAUTH_CLIENT_SECRET: 'client-secret',
  GITHUB_OAUTH_REDIRECT_URI: 'https://example.com/oauth/callback',
  GITHUB_OAUTH_STATE_SECRET: 'state-secret',
  GITHUB_APP_ID: 'test-app-id',
  GITHUB_APP_PRIVATE_KEY_BASE64: TEST_GITHUB_APP_PRIVATE_KEY_BASE64,
}

function decodeBase64Url(segment: string): unknown {
  const padded = segment.replace(/-/g, '+').replace(/_/g, '/')
  return JSON.parse(Buffer.from(padded, 'base64').toString('utf-8'))
}

describe('createAppJwt()', () => {
  test('builds a JWT with the expected header and payload', async () => {
    const fixedNow = () => Date.parse('2026-01-01T00:00:00.000Z')
    const token = await createAppJwt(ENV, fixedNow)

    const segments = token.split('.')
    expect(segments.length).toBe(3)

    const header = decodeBase64Url(segments[0] as string) as { alg: string; typ: string }
    const payload = decodeBase64Url(segments[1] as string) as { iss: string; iat: number; exp: number }

    expect(header.alg).toBe('RS256')
    expect(header.typ).toBe('JWT')
    expect(payload.iss).toBe(ENV.GITHUB_APP_ID)
    expect(payload.exp - payload.iat).toBe(660)
  })

  test('produces a signature that verifies against the matching public key', async () => {
    const fixedNow = () => Date.parse('2026-01-01T00:00:00.000Z')
    const token = await createAppJwt(ENV, fixedNow)

    const pem = Buffer.from(TEST_GITHUB_APP_PUBLIC_KEY_BASE64, 'base64').toString('utf-8')
    const publicKey = await importSPKI(pem, 'RS256')

    await expect(jwtVerify(token, publicKey, { currentDate: new Date(fixedNow()) })).resolves.toBeDefined()
  })
})

describe('createInstallationAccessToken()', () => {
  test('calls the installations endpoint with a bearer JWT and returns the parsed token', async () => {
    let capturedUrl: string | URL | undefined
    let capturedHeaders: Headers | undefined
    const stubFetch = async (url: string | URL, init?: RequestInit) => {
      capturedUrl = url
      capturedHeaders = new Headers(init?.headers)
      return Response.json({ token: 'installation-token', expires_at: '2026-01-01T01:00:00Z' })
    }

    const result = await createInstallationAccessToken(ENV, '12345', stubFetch)

    expect(capturedUrl).toBe('https://api.github.com/app/installations/12345/access_tokens')
    const authHeader = capturedHeaders?.get('Authorization') ?? ''
    expect(authHeader.startsWith('Bearer ')).toBe(true)
    expect(authHeader.replace('Bearer ', '').split('.').length).toBe(3)
    expect(capturedHeaders?.get('Accept')).toBe('application/vnd.github+json')
    expect(capturedHeaders?.get('User-Agent')).toBe('discord-project-ops')
    expect(result).toEqual({ token: 'installation-token', expires_at: '2026-01-01T01:00:00Z' })
  })

  test('throws when the response is not ok', async () => {
    const stubFetch = async () => new Response('error', { status: 404 })
    await expect(createInstallationAccessToken(ENV, '12345', stubFetch)).rejects.toThrow(
      'GitHub installation token exchange failed: 404'
    )
  })

  test('throws an HttpError with status 502 when the response is not ok', async () => {
    const stubFetch = async () => new Response('error', { status: 404 })
    expect.assertions(2)
    try {
      await createInstallationAccessToken(ENV, '12345', stubFetch)
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError)
      expect((error as HttpError).status).toBe(502)
    }
  })
})

describe('listAppInstallations()', () => {
  test('returns the parsed list of installations', async () => {
    const stubFetch = async () =>
      Response.json([
        { id: 1, account: { login: 'octocat' } },
        { id: 2, account: { login: 'other-org' } },
      ])
    const result = await listAppInstallations(ENV, stubFetch)
    expect(result).toEqual([
      { id: 1, account: { login: 'octocat' } },
      { id: 2, account: { login: 'other-org' } },
    ])
  })

  test('sends a bearer JWT and the expected headers', async () => {
    let capturedHeaders: Headers | undefined
    const stubFetch = async (_url: string | URL, init?: RequestInit) => {
      capturedHeaders = new Headers(init?.headers)
      return Response.json([])
    }

    await listAppInstallations(ENV, stubFetch)

    const authHeader = capturedHeaders?.get('Authorization') ?? ''
    expect(authHeader.startsWith('Bearer ')).toBe(true)
    expect(authHeader.replace('Bearer ', '').split('.').length).toBe(3)
    expect(capturedHeaders?.get('Accept')).toBe('application/vnd.github+json')
    expect(capturedHeaders?.get('User-Agent')).toBe('discord-project-ops')
  })

  test('throws when the response is not ok', async () => {
    const stubFetch = async () => new Response('error', { status: 401 })
    await expect(listAppInstallations(ENV, stubFetch)).rejects.toThrow('GitHub installation list failed: 401')
  })

  test('throws an HttpError with status 502 when the response is not ok', async () => {
    const stubFetch = async () => new Response('error', { status: 401 })
    expect.assertions(2)
    try {
      await listAppInstallations(ENV, stubFetch)
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError)
      expect((error as HttpError).status).toBe(502)
    }
  })
})
