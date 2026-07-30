import { beforeEach, describe, expect, mock, test } from 'bun:test'
import { TEST_GITHUB_APP_PRIVATE_KEY_BASE64 } from 'github/app-auth/app-auth.fixtures.ts'
import type { BotEnv } from '../env'
import { getInstallationAccessToken } from './index'

const INSTALLATION_TOKEN_URL = 'https://api.github.com/app/installations/installation-1/access_tokens'

function createEnv(overrides: Partial<BotEnv> = {}) {
  const getInstallation = mock(
    async (): Promise<{ installationId: string; accountLogin: string; installedAt: string } | null> => ({
      installationId: 'installation-1',
      accountLogin: 'octo-org',
      installedAt: '2026-01-01T00:00:00.000Z',
    })
  )
  const getCachedInstallationToken = mock(async (): Promise<{ token: string; expiresAt: string } | null> => null)
  const cacheInstallationToken = mock(async () => {})
  const stub = { getInstallation, getCachedInstallationToken, cacheInstallationToken }
  const idFromName = mock(() => 'fake-installation-id')
  const get = mock(() => stub)

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
    GITHUB_APP_ID: 'test-app-id',
    GITHUB_APP_PRIVATE_KEY_BASE64: TEST_GITHUB_APP_PRIVATE_KEY_BASE64,
    GITHUB_TOKEN_STORE: {
      idFromName: mock(() => 'fake-token-id'),
      get: mock(() => ({ storeAuth: mock(async () => {}) })),
    },
    GITHUB_INSTALLATION_STORE: { idFromName, get },
    ...overrides,
  } as BotEnv

  return { env, getInstallation, getCachedInstallationToken, cacheInstallationToken, idFromName, get }
}

let fetchMock: ReturnType<typeof mock<(url: string | URL, init?: RequestInit) => Promise<Response>>>

beforeEach(() => {
  fetchMock = mock(async () =>
    Response.json({ token: 'fresh-installation-token', expires_at: '2026-01-01T01:00:00.000Z' })
  )
})

describe('getInstallationAccessToken', () => {
  test('throws when the App has not been installed', async () => {
    const { env, getInstallation } = createEnv()
    getInstallation.mockImplementation(async () => null)

    expect(getInstallationAccessToken(env, fetchMock)).rejects.toThrow('GitHub App is not installed yet')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('returns the cached token without minting a new one when it is well within expiry', async () => {
    const { env, getCachedInstallationToken, cacheInstallationToken } = createEnv()
    getCachedInstallationToken.mockImplementation(async () => ({
      token: 'cached-token',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    }))

    const token = await getInstallationAccessToken(env, fetchMock)

    expect(token).toBe('cached-token')
    expect(fetchMock).not.toHaveBeenCalled()
    expect(cacheInstallationToken).not.toHaveBeenCalled()
  })

  test('mints and caches a fresh token when there is no cached token', async () => {
    const { env, cacheInstallationToken } = createEnv()

    const token = await getInstallationAccessToken(env, fetchMock)

    expect(token).toBe('fresh-installation-token')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url] = fetchMock.mock.calls[0]!
    expect(url).toBe(INSTALLATION_TOKEN_URL)
    expect(cacheInstallationToken).toHaveBeenCalledWith('fresh-installation-token', '2026-01-01T01:00:00.000Z')
  })

  test('mints and caches a fresh token when the cached token is near/past expiry', async () => {
    const { env, getCachedInstallationToken, cacheInstallationToken } = createEnv()
    getCachedInstallationToken.mockImplementation(async () => ({
      token: 'stale-token',
      expiresAt: new Date(Date.now() + 30 * 1000).toISOString(),
    }))

    const token = await getInstallationAccessToken(env, fetchMock)

    expect(token).toBe('fresh-installation-token')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(cacheInstallationToken).toHaveBeenCalledWith('fresh-installation-token', '2026-01-01T01:00:00.000Z')
  })
})
