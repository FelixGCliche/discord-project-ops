import { describe, expect, test } from 'bun:test'
import { z } from 'zod'
import { HttpError } from '../http-error'
import { createOAuthClient, type FetchImpl } from './index'

const linearTokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
})

function buildLinearClient() {
  return createOAuthClient({
    provider: 'Linear',
    tokenUrl: 'https://linear.app/oauth/token',
    tokenResponseSchema: linearTokenResponseSchema,
  })
}

const githubTokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
})

const githubErrorBodySchema = z.object({
  error: z.string(),
  error_description: z.string().optional(),
})

function buildGithubClient() {
  return createOAuthClient({
    provider: 'GitHub',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    tokenResponseSchema: githubTokenResponseSchema,
    errorBodySchema: githubErrorBodySchema,
  })
}

describe('createOAuthClient() without errorBodySchema (Linear-shaped)', () => {
  const client = buildLinearClient()

  test('throws when the token endpoint responds with an error status', async () => {
    const stubFetch: FetchImpl = async () => new Response('error', { status: 401 })
    await expect(client.exchangeCodeForToken({ code: 'some-code' }, stubFetch)).rejects.toThrow(
      'Linear token exchange failed: 401'
    )
  })

  test('throws an HttpError with status 502 when the token endpoint responds with an error status', async () => {
    const stubFetch: FetchImpl = async () => new Response('error', { status: 401 })
    expect.assertions(2)
    try {
      await client.exchangeCodeForToken({ code: 'some-code' }, stubFetch)
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError)
      expect((error as HttpError).status).toBe(502)
    }
  })

  test('parses and returns a valid token response', async () => {
    const payload = { access_token: 'token-123', token_type: 'Bearer' }
    const stubFetch: FetchImpl = async () => Response.json(payload)
    const result = await client.exchangeCodeForToken({ code: 'some-code' }, stubFetch)
    expect(result).toEqual(payload)
  })

  test('throws when the token response fails schema validation', async () => {
    const stubFetch: FetchImpl = async () => Response.json({ token_type: 'Bearer' })
    await expect(client.exchangeCodeForToken({ code: 'some-code' }, stubFetch)).rejects.toThrow()
  })
})

describe('createOAuthClient() with errorBodySchema (GitHub-shaped)', () => {
  const client = buildGithubClient()

  test('throws when the token endpoint responds with an error status', async () => {
    const stubFetch: FetchImpl = async () => new Response('error', { status: 401 })
    await expect(client.exchangeCodeForToken({ code: 'some-code' }, stubFetch)).rejects.toThrow(
      'GitHub token exchange failed: 401'
    )
  })

  test('throws an HttpError with status 502 when the token endpoint responds with an error status', async () => {
    const stubFetch: FetchImpl = async () => new Response('error', { status: 401 })
    expect.assertions(2)
    try {
      await client.exchangeCodeForToken({ code: 'some-code' }, stubFetch)
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError)
      expect((error as HttpError).status).toBe(502)
    }
  })

  test('throws with just the error when the body matches the error schema without error_description', async () => {
    const stubFetch: FetchImpl = async () => Response.json({ error: 'bad_verification_code' })
    await expect(client.exchangeCodeForToken({ code: 'some-code' }, stubFetch)).rejects.toThrow(
      'GitHub token exchange failed: bad_verification_code'
    )
  })

  test('throws an HttpError with status 400 when the body matches the error schema', async () => {
    const stubFetch: FetchImpl = async () => Response.json({ error: 'bad_verification_code' })
    expect.assertions(2)
    try {
      await client.exchangeCodeForToken({ code: 'some-code' }, stubFetch)
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError)
      expect((error as HttpError).status).toBe(400)
    }
  })

  test('throws with the error and description when the body matches the error schema with error_description', async () => {
    const stubFetch: FetchImpl = async () =>
      Response.json({ error: 'bad_verification_code', error_description: 'The code passed is incorrect or expired.' })
    await expect(client.exchangeCodeForToken({ code: 'some-code' }, stubFetch)).rejects.toThrow(
      'GitHub token exchange failed: bad_verification_code - The code passed is incorrect or expired.'
    )
  })

  test('parses and returns a valid token response that does not match the error schema', async () => {
    const payload = { access_token: 'token-123', token_type: 'Bearer' }
    const stubFetch: FetchImpl = async () => Response.json(payload)
    const result = await client.exchangeCodeForToken({ code: 'some-code' }, stubFetch)
    expect(result).toEqual(payload)
  })
})

describe('exchangeCodeForToken() request body', () => {
  test('sends grant_type=authorization_code plus the caller-supplied params', async () => {
    const client = buildLinearClient()
    let capturedBody: string | undefined
    const stubFetch: FetchImpl = async (_url, init) => {
      capturedBody = init?.body?.toString()
      return Response.json({ access_token: 'token-123', token_type: 'Bearer' })
    }
    await client.exchangeCodeForToken(
      { client_id: 'client-id', client_secret: 'client-secret', code: 'some-code' },
      stubFetch
    )
    const params = new URLSearchParams(capturedBody)
    expect(params.get('grant_type')).toBe('authorization_code')
    expect(params.get('client_id')).toBe('client-id')
    expect(params.get('client_secret')).toBe('client-secret')
    expect(params.get('code')).toBe('some-code')
  })
})

describe('refreshAccessToken() request body', () => {
  test('sends grant_type=refresh_token plus the caller-supplied params', async () => {
    const client = buildLinearClient()
    let capturedBody: string | undefined
    const stubFetch: FetchImpl = async (_url, init) => {
      capturedBody = init?.body?.toString()
      return Response.json({ access_token: 'token-123', token_type: 'Bearer' })
    }
    await client.refreshAccessToken(
      { client_id: 'client-id', client_secret: 'client-secret', refresh_token: 'refresh-123' },
      stubFetch
    )
    const params = new URLSearchParams(capturedBody)
    expect(params.get('grant_type')).toBe('refresh_token')
    expect(params.get('client_id')).toBe('client-id')
    expect(params.get('client_secret')).toBe('client-secret')
    expect(params.get('refresh_token')).toBe('refresh-123')
  })

  test('throws when the token endpoint responds with an error status', async () => {
    const client = buildLinearClient()
    const stubFetch: FetchImpl = async () => new Response('error', { status: 401 })
    await expect(client.refreshAccessToken({ refresh_token: 'refresh-123' }, stubFetch)).rejects.toThrow(
      'Linear token refresh failed: 401'
    )
  })
})
