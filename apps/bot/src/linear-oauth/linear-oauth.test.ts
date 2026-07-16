import { beforeEach, describe, expect, mock, test } from 'bun:test'
import { createSignedState } from 'core'
import { buildLinearTokenResponse } from 'linear/oauth/oauth.fixtures.ts'
import type { BotEnv } from '../env'
import { createLinearOAuthHandler } from './index'
import { linearSdkMock } from './linear-sdk-mock.preload'

const LINEAR_TOKEN_URL = 'https://api.linear.app/oauth/token'

function createEnv(overrides: Partial<BotEnv> = {}) {
  const storeAuth = mock(async () => {})
  const stub = { storeAuth }
  const idFromName = mock(() => 'fake-id')
  const get = mock(() => stub)
  const env = {
    BOT_ADMIN_TOKEN: 'admin-token',
    LINEAR_OAUTH_CLIENT_ID: 'client-id',
    LINEAR_OAUTH_CLIENT_SECRET: 'client-secret',
    LINEAR_OAUTH_REDIRECT_URI: 'https://example.com/oauth/callback',
    LINEAR_OAUTH_STATE_SECRET: 'state-secret',
    LINEAR_TOKEN_STORE: { idFromName, get },
    ...overrides,
  } as BotEnv
  return { env, storeAuth, idFromName, get }
}

let tokenFetchMock: ReturnType<typeof mock<(url: string | URL, init?: RequestInit) => Promise<Response>>>
let authorizeHandler: NonNullable<ReturnType<typeof createLinearOAuthHandler>['/oauth/authorize']>
let callbackHandler: NonNullable<ReturnType<typeof createLinearOAuthHandler>['/oauth/callback']>

beforeEach(() => {
  tokenFetchMock = mock(async () => Response.json(buildLinearTokenResponse()))
  const handlers = createLinearOAuthHandler(tokenFetchMock)
  authorizeHandler = handlers['/oauth/authorize']!
  callbackHandler = handlers['/oauth/callback']!
  linearSdkMock.organization = { name: 'Acme Inc' }
})

describe('/oauth/authorize', () => {
  test('returns 401 when the token query param is missing', async () => {
    const { env } = createEnv()
    const request = new Request('https://bot.example.com/oauth/authorize')
    const response = await authorizeHandler(request, env)
    expect(response.status).toBe(401)
  })

  test('returns 401 when the token query param does not match BOT_ADMIN_TOKEN', async () => {
    const { env } = createEnv()
    const request = new Request('https://bot.example.com/oauth/authorize?token=wrong-token')
    const response = await authorizeHandler(request, env)
    expect(response.status).toBe(401)
  })

  test('redirects to the Linear authorize URL when the token matches', async () => {
    const { env } = createEnv()
    const request = new Request('https://bot.example.com/oauth/authorize?token=admin-token')
    const response = await authorizeHandler(request, env)
    expect(response.status).toBe(302)

    const location = new URL(response.headers.get('Location')!)
    expect(location.origin + location.pathname).toBe('https://linear.app/oauth/authorize')
    expect(location.searchParams.get('client_id')).toBe(env.LINEAR_OAUTH_CLIENT_ID)
    expect(location.searchParams.get('redirect_uri')).toBe(env.LINEAR_OAUTH_REDIRECT_URI)
    expect(location.searchParams.get('response_type')).toBe('code')
    expect(location.searchParams.get('state')).toBeTruthy()
  })

  test('rejects when the env is invalid', async () => {
    const { env } = createEnv({ BOT_ADMIN_TOKEN: undefined as unknown as string })
    const request = new Request('https://bot.example.com/oauth/authorize?token=admin-token')
    expect(authorizeHandler(request, env)).rejects.toThrow()
  })
})

describe('/oauth/callback', () => {
  test('returns 400 when the code query param is missing', async () => {
    const { env } = createEnv()
    const request = new Request('https://bot.example.com/oauth/callback?state=some-state')
    const response = await callbackHandler(request, env)
    expect(response.status).toBe(400)
  })

  test('returns 400 when the state query param is missing', async () => {
    const { env } = createEnv()
    const request = new Request('https://bot.example.com/oauth/callback?code=some-code')
    const response = await callbackHandler(request, env)
    expect(response.status).toBe(400)
  })

  test('returns 400 when the state is invalid or tampered', async () => {
    const { env } = createEnv()
    const request = new Request('https://bot.example.com/oauth/callback?code=some-code&state=not-a-valid-state')
    const response = await callbackHandler(request, env)
    expect(response.status).toBe(400)
  })

  test('exchanges the code, stores the auth, and returns 200 on a valid callback', async () => {
    const { env, storeAuth, idFromName, get } = createEnv()
    const state = await createSignedState(env.LINEAR_OAUTH_STATE_SECRET)
    const request = new Request(
      `https://bot.example.com/oauth/callback?code=some-code&state=${encodeURIComponent(state)}`
    )

    const response = await callbackHandler(request, env)

    expect(tokenFetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = tokenFetchMock.mock.calls[0]!
    expect(url).toBe(LINEAR_TOKEN_URL)
    const body = new URLSearchParams(init?.body as string)
    expect(body.get('code')).toBe('some-code')
    expect(body.get('grant_type')).toBe('authorization_code')
    expect(idFromName).toHaveBeenCalledWith('linear-token-store')
    expect(get).toHaveBeenCalled()
    expect(storeAuth).toHaveBeenCalledWith('token-123', 'refresh-123', 86399, 'Acme Inc', ['read', 'issues:create'])
    expect(response.status).toBe(200)
    expect(await response.text()).toContain('Linear connected successfully')
  })

  test('rejects and never stores auth when the token exchange fails', async () => {
    const { env, storeAuth } = createEnv()
    tokenFetchMock.mockImplementation(async () => new Response('error', { status: 401 }))
    const state = await createSignedState(env.LINEAR_OAUTH_STATE_SECRET)
    const request = new Request(
      `https://bot.example.com/oauth/callback?code=some-code&state=${encodeURIComponent(state)}`
    )

    expect(callbackHandler(request, env)).rejects.toThrow('Linear token exchange failed: 401')
    expect(storeAuth).not.toHaveBeenCalled()
  })

  test('rejects when the env is invalid', async () => {
    const { env } = createEnv({ BOT_ADMIN_TOKEN: undefined as unknown as string })
    const state = await createSignedState(env.LINEAR_OAUTH_STATE_SECRET)
    const request = new Request(
      `https://bot.example.com/oauth/callback?code=some-code&state=${encodeURIComponent(state)}`
    )
    expect(callbackHandler(request, env)).rejects.toThrow()
  })
})
