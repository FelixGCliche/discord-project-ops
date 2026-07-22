import { beforeEach, describe, expect, mock, test } from 'bun:test'
import { createSignedState } from 'core'
import { TEST_GITHUB_APP_PRIVATE_KEY_BASE64 } from 'github/app-auth/app-auth.fixtures.ts'
import { buildGithubTokenResponse } from 'github/oauth/oauth.fixtures.ts'
import type { BotEnv } from '../env'
import { createGithubOAuthHandler } from './index'

const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token'
const GITHUB_USER_URL = 'https://api.github.com/user'
const GITHUB_INSTALLATIONS_URL = 'https://api.github.com/app/installations'

function createEnv(overrides: Partial<BotEnv> = {}) {
  const storeAuth = mock(async () => {})
  const tokenStub = { storeAuth }
  const tokenIdFromName = mock(() => 'fake-token-id')
  const tokenGet = mock(() => tokenStub)

  const storeInstallation = mock(async () => {})
  const installationStub = { storeInstallation }
  const installationIdFromName = mock(() => 'fake-installation-id')
  const installationGet = mock(() => installationStub)

  const env = {
    LINEAR_OAUTH_CLIENT_ID: 'client-id',
    LINEAR_OAUTH_CLIENT_SECRET: 'client-secret',
    LINEAR_OAUTH_REDIRECT_URI: 'https://example.com/oauth/callback',
    LINEAR_OAUTH_STATE_SECRET: 'state-secret',
    LINEAR_TOKEN_STORE: { idFromName: mock(() => 'fake-id'), get: mock(() => ({ storeAuth: mock(async () => {}) })) },
    GITHUB_OAUTH_CLIENT_ID: 'github-client-id',
    GITHUB_OAUTH_CLIENT_SECRET: 'github-client-secret',
    GITHUB_OAUTH_REDIRECT_URI: 'https://example.com/github/oauth/callback',
    GITHUB_OAUTH_STATE_SECRET: 'github-state-secret',
    GITHUB_APP_ID: 'github-app-id',
    GITHUB_APP_PRIVATE_KEY_BASE64: TEST_GITHUB_APP_PRIVATE_KEY_BASE64,
    GITHUB_TOKEN_STORE: { idFromName: tokenIdFromName, get: tokenGet },
    GITHUB_INSTALLATION_STORE: { idFromName: installationIdFromName, get: installationGet },
    ...overrides,
  } as BotEnv
  return {
    env,
    storeAuth,
    tokenIdFromName,
    tokenGet,
    storeInstallation,
    installationIdFromName,
    installationGet,
  }
}

let fetchMock: ReturnType<typeof mock<(url: string | URL, init?: RequestInit) => Promise<Response>>>
let authorizeHandler: NonNullable<ReturnType<typeof createGithubOAuthHandler>['/github/oauth/authorize']>
let callbackHandler: NonNullable<ReturnType<typeof createGithubOAuthHandler>['/github/oauth/callback']>
let installHandler: NonNullable<ReturnType<typeof createGithubOAuthHandler>['/github/install']>

beforeEach(() => {
  fetchMock = mock(async (input: string | URL) => {
    const url = input.toString()
    if (url === GITHUB_TOKEN_URL) {
      return Response.json(buildGithubTokenResponse())
    }
    if (url === GITHUB_USER_URL) {
      return Response.json({ login: 'octocat' })
    }
    if (url === GITHUB_INSTALLATIONS_URL) {
      return Response.json([{ id: 12345, account: { login: 'octo-org' } }])
    }
    throw new Error(`Unexpected fetch call: ${url}`)
  })
  const handlers = createGithubOAuthHandler(fetchMock)
  authorizeHandler = handlers['/github/oauth/authorize']!
  callbackHandler = handlers['/github/oauth/callback']!
  installHandler = handlers['/github/install']!
})

describe('/github/oauth/authorize', () => {
  test('returns 401 when the token query param is missing', async () => {
    const { env } = createEnv()
    const request = new Request('https://bot.example.com/github/oauth/authorize')
    const response = await authorizeHandler(request, env)
    expect(response.status).toBe(401)
  })

  test('returns 401 when the token query param is invalid or tampered', async () => {
    const { env } = createEnv()
    const request = new Request('https://bot.example.com/github/oauth/authorize?token=not-a-valid-token')
    const response = await authorizeHandler(request, env)
    expect(response.status).toBe(401)
  })

  test('returns 401 when the token was signed with a different secret', async () => {
    const { env } = createEnv()
    const token = await createSignedState('a-different-secret')
    const request = new Request(`https://bot.example.com/github/oauth/authorize?token=${encodeURIComponent(token)}`)
    const response = await authorizeHandler(request, env)
    expect(response.status).toBe(401)
  })

  test('redirects to the GitHub authorize URL when the token is valid', async () => {
    const { env } = createEnv()
    const token = await createSignedState(env.GITHUB_OAUTH_STATE_SECRET)
    const request = new Request(`https://bot.example.com/github/oauth/authorize?token=${encodeURIComponent(token)}`)
    const response = await authorizeHandler(request, env)
    expect(response.status).toBe(302)

    const location = new URL(response.headers.get('Location')!)
    expect(location.origin + location.pathname).toBe('https://github.com/login/oauth/authorize')
    expect(location.searchParams.get('client_id')).toBe(env.GITHUB_OAUTH_CLIENT_ID)
    expect(location.searchParams.get('redirect_uri')).toBe(env.GITHUB_OAUTH_REDIRECT_URI)
    expect(location.searchParams.get('state')).toBe(token)
  })

  test('rejects when the env is invalid', async () => {
    const { env } = createEnv({ GITHUB_OAUTH_STATE_SECRET: undefined as unknown as string })
    const request = new Request('https://bot.example.com/github/oauth/authorize?token=some-token')
    expect(authorizeHandler(request, env)).rejects.toThrow()
  })
})

describe('/github/oauth/callback', () => {
  test('returns 400 when the code query param is missing', async () => {
    const { env } = createEnv()
    const request = new Request('https://bot.example.com/github/oauth/callback?state=some-state')
    const response = await callbackHandler(request, env)
    expect(response.status).toBe(400)
  })

  test('returns 400 when the state query param is missing', async () => {
    const { env } = createEnv()
    const request = new Request('https://bot.example.com/github/oauth/callback?code=some-code')
    const response = await callbackHandler(request, env)
    expect(response.status).toBe(400)
  })

  test('returns 400 when the state is invalid or tampered', async () => {
    const { env } = createEnv()
    const request = new Request('https://bot.example.com/github/oauth/callback?code=some-code&state=not-a-valid-state')
    const response = await callbackHandler(request, env)
    expect(response.status).toBe(400)
  })

  test('exchanges the code, stores the auth, and returns 200 on a valid callback', async () => {
    const { env, storeAuth, tokenIdFromName, tokenGet } = createEnv()
    const state = await createSignedState(env.GITHUB_OAUTH_STATE_SECRET)
    const request = new Request(
      `https://bot.example.com/github/oauth/callback?code=some-code&state=${encodeURIComponent(state)}`
    )

    const response = await callbackHandler(request, env)

    expect(tokenIdFromName).toHaveBeenCalledWith('github-token-store')
    expect(tokenGet).toHaveBeenCalled()
    expect(storeAuth).toHaveBeenCalledWith('token-123', 'refresh-123', 28800, 15811200, 'octocat', [])
    expect(response.status).toBe(200)
    expect(await response.text()).toContain('GitHub connected successfully')
  })

  test('stores null expiry values when GitHub does not return expires_in / refresh_token_expires_in', async () => {
    const { env, storeAuth } = createEnv()
    fetchMock.mockImplementation(async (input: string | URL) => {
      const url = input.toString()
      if (url === GITHUB_TOKEN_URL) {
        return Response.json(buildGithubTokenResponse({ expires_in: undefined, refresh_token_expires_in: undefined }))
      }
      if (url === GITHUB_USER_URL) {
        return Response.json({ login: 'octocat' })
      }
      throw new Error(`Unexpected fetch call: ${url}`)
    })
    const state = await createSignedState(env.GITHUB_OAUTH_STATE_SECRET)
    const request = new Request(
      `https://bot.example.com/github/oauth/callback?code=some-code&state=${encodeURIComponent(state)}`
    )

    const response = await callbackHandler(request, env)

    expect(storeAuth).toHaveBeenCalledWith('token-123', 'refresh-123', null, null, 'octocat', [])
    expect(response.status).toBe(200)
  })

  test('rejects and never stores auth when the token exchange fails', async () => {
    const { env, storeAuth } = createEnv()
    fetchMock.mockImplementation(async () => new Response('error', { status: 401 }))
    const state = await createSignedState(env.GITHUB_OAUTH_STATE_SECRET)
    const request = new Request(
      `https://bot.example.com/github/oauth/callback?code=some-code&state=${encodeURIComponent(state)}`
    )

    expect(callbackHandler(request, env)).rejects.toThrow()
    expect(storeAuth).not.toHaveBeenCalled()
  })

  test('rejects when the env is invalid', async () => {
    const { env } = createEnv({ GITHUB_OAUTH_CLIENT_ID: undefined as unknown as string })
    const state = await createSignedState(env.GITHUB_OAUTH_STATE_SECRET)
    const request = new Request(
      `https://bot.example.com/github/oauth/callback?code=some-code&state=${encodeURIComponent(state)}`
    )
    expect(callbackHandler(request, env)).rejects.toThrow()
  })
})

describe('/github/install', () => {
  test('returns 400 when state is missing', async () => {
    const { env } = createEnv()
    const request = new Request('https://bot.example.com/github/install?installation_id=12345&setup_action=install')
    const response = await installHandler(request, env)
    expect(response.status).toBe(400)
  })

  test('returns 400 when state is invalid or tampered', async () => {
    const { env } = createEnv()
    const request = new Request(
      'https://bot.example.com/github/install?installation_id=12345&setup_action=install&state=not-a-valid-state'
    )
    const response = await installHandler(request, env)
    expect(response.status).toBe(400)
  })

  test('returns 400 when state was signed with a different secret', async () => {
    const { env } = createEnv()
    const state = await createSignedState('a-different-secret')
    const request = new Request(
      `https://bot.example.com/github/install?installation_id=12345&setup_action=install&state=${encodeURIComponent(state)}`
    )
    const response = await installHandler(request, env)
    expect(response.status).toBe(400)
  })

  test('returns 400 when installation_id is missing', async () => {
    const { env } = createEnv()
    const state = await createSignedState(env.GITHUB_OAUTH_STATE_SECRET)
    const request = new Request(
      `https://bot.example.com/github/install?setup_action=install&state=${encodeURIComponent(state)}`
    )
    const response = await installHandler(request, env)
    expect(response.status).toBe(400)
  })

  test('resolves the account login and stores the installation on a valid request', async () => {
    const { env, storeInstallation, installationIdFromName, installationGet } = createEnv()
    const state = await createSignedState(env.GITHUB_OAUTH_STATE_SECRET)
    const request = new Request(
      `https://bot.example.com/github/install?installation_id=12345&setup_action=install&state=${encodeURIComponent(state)}`
    )

    const response = await installHandler(request, env)

    expect(installationIdFromName).toHaveBeenCalledWith('github-installation-store')
    expect(installationGet).toHaveBeenCalled()
    expect(storeInstallation).toHaveBeenCalledWith('12345', 'octo-org')
    expect(response.status).toBe(200)
    expect(await response.text()).toContain('GitHub App installed successfully')
  })

  test('returns 404 and never stores the installation when no matching installation is found', async () => {
    const { env, storeInstallation } = createEnv()
    const state = await createSignedState(env.GITHUB_OAUTH_STATE_SECRET)
    const request = new Request(
      `https://bot.example.com/github/install?installation_id=99999&setup_action=install&state=${encodeURIComponent(state)}`
    )

    const response = await installHandler(request, env)

    expect(storeInstallation).not.toHaveBeenCalled()
    expect(response.status).toBe(404)
  })

  test('rejects when the env is invalid', async () => {
    const { env } = createEnv({ GITHUB_APP_ID: undefined as unknown as string })
    const state = await createSignedState(env.GITHUB_OAUTH_STATE_SECRET)
    const request = new Request(
      `https://bot.example.com/github/install?installation_id=12345&state=${encodeURIComponent(state)}`
    )
    expect(installHandler(request, env)).rejects.toThrow()
  })
})
