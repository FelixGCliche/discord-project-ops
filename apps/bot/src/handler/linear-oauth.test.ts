import { beforeEach, describe, expect, mock, test } from 'bun:test'
import * as linearReal from 'linear'
import { createSignedState } from 'core'
import type { BotEnv } from '../env'

const exchangeCodeForTokenMock = mock(async () => ({
  access_token: 'token-123',
  token_type: 'Bearer',
  scope: 'read,issues:create',
  expires_in: 86399,
  refresh_token: 'refresh-123',
}))

let organizationValue: { name: string } = { name: 'Acme Inc' }

class FakeLinearClient {
  constructor(public options: { accessToken: string }) {}
  get organization() {
    return Promise.resolve(organizationValue)
  }
}

mock.module('linear', () => ({
  ...linearReal,
  exchangeCodeForToken: exchangeCodeForTokenMock,
  LinearClient: FakeLinearClient,
}))

const { linearOAuthHandler } = await import('./linear-oauth')
const authorizeHandler = linearOAuthHandler['/oauth/authorize']!
const callbackHandler = linearOAuthHandler['/oauth/callback']!

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

beforeEach(() => {
  exchangeCodeForTokenMock.mockClear()
  exchangeCodeForTokenMock.mockImplementation(async () => ({
    access_token: 'token-123',
    token_type: 'Bearer',
    scope: 'read,issues:create',
    expires_in: 86399,
    refresh_token: 'refresh-123',
  }))
  organizationValue = { name: 'Acme Inc' }
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

    expect(exchangeCodeForTokenMock).toHaveBeenCalledWith(env, 'some-code')
    expect(idFromName).toHaveBeenCalledWith('linear-token-store')
    expect(get).toHaveBeenCalled()
    expect(storeAuth).toHaveBeenCalledWith('token-123', 'refresh-123', 86399, 'Acme Inc', ['read', 'issues:create'])
    expect(response.status).toBe(200)
    expect(await response.text()).toContain('Linear connected successfully')
  })

  test('rejects and never stores auth when the token exchange fails', async () => {
    const { env, storeAuth } = createEnv()
    exchangeCodeForTokenMock.mockImplementation(async () => {
      throw new Error('Linear token exchange failed: 401')
    })
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
