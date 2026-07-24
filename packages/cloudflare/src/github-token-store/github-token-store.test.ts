import { describe, expect, mock, test } from 'bun:test'
import type { AuthState } from './index'

// `GithubTokenStore` extends `DurableObject` from the `cloudflare:workers` runtime module,
// which only exists inside an actual Cloudflare Workers runtime. Bun's test runner has no
// such module available, so we shim it with a minimal stand-in before importing the store.
// This must be a dynamic import: a static `import './index'` would be hoisted and resolved
// before `mock.module` runs, and would fail with "Cannot find package 'cloudflare:workers'".
mock.module('cloudflare:workers', () => ({
  DurableObject: class DurableObject {
    ctx: unknown
    env: unknown
    constructor(ctx: unknown, env: unknown) {
      this.ctx = ctx
      this.env = env
    }
  },
}))

const { GithubTokenStore } = await import('./index')

// Minimal in-memory stand-in for `DurableObjectStorage`, covering only the
// get/put/delete methods `GithubTokenStore` actually uses.
class FakeStorage {
  private map = new Map<string, unknown>()

  async get<T>(key: string): Promise<T | undefined> {
    return this.map.get(key) as T | undefined
  }

  async put<T>(key: string, value: T): Promise<void> {
    this.map.set(key, value)
  }

  async delete(key: string): Promise<boolean> {
    return this.map.delete(key)
  }
}

function createStore() {
  const storage = new FakeStorage()
  const ctx = { storage } as unknown as DurableObjectState
  const env = {} as unknown as Record<string, unknown>
  return new GithubTokenStore(ctx, env) as unknown as {
    storeAuth(
      accessToken: string,
      refreshToken: string,
      expiresIn: number | null,
      refreshTokenExpiresIn: number | null,
      login: string,
      scopes: string[]
    ): Promise<void>
    updateTokens(
      accessToken: string,
      refreshToken: string,
      expiresIn: number | null,
      refreshTokenExpiresIn: number | null
    ): Promise<void>
    getAuth(): Promise<AuthState | null>
    clearAuth(): Promise<void>
  }
}

describe('GithubTokenStore', () => {
  test('getAuth returns null before anything is stored', async () => {
    const store = createStore()

    expect(await store.getAuth()).toBeNull()
  })

  test('storeAuth with numeric expiresIn/refreshTokenExpiresIn computes timestamps roughly Date.now() + n * 1000', async () => {
    const store = createStore()
    const expiresIn = 3600
    const refreshTokenExpiresIn = 7200
    const tolerance = 2000

    const before = Date.now()
    await store.storeAuth('access-token', 'refresh-token', expiresIn, refreshTokenExpiresIn, 'octocat', ['repo'])
    const after = Date.now()

    const auth = await store.getAuth()
    expect(auth).not.toBeNull()
    expect(auth?.expiresAt).not.toBeNull()
    expect(auth?.refreshTokenExpiresAt).not.toBeNull()

    const expiresAtMs = new Date(auth?.expiresAt as string).getTime()
    const refreshTokenExpiresAtMs = new Date(auth?.refreshTokenExpiresAt as string).getTime()

    expect(expiresAtMs).toBeGreaterThanOrEqual(before + expiresIn * 1000 - tolerance)
    expect(expiresAtMs).toBeLessThanOrEqual(after + expiresIn * 1000 + tolerance)
    expect(refreshTokenExpiresAtMs).toBeGreaterThanOrEqual(before + refreshTokenExpiresIn * 1000 - tolerance)
    expect(refreshTokenExpiresAtMs).toBeLessThanOrEqual(after + refreshTokenExpiresIn * 1000 + tolerance)
  })

  test('storeAuth with null expiresIn/refreshTokenExpiresIn stores null timestamps (non-expiring token)', async () => {
    const store = createStore()

    await store.storeAuth('access-token', 'refresh-token', null, null, 'octocat', ['repo'])

    const auth = await store.getAuth()
    expect(auth).not.toBeNull()
    expect(auth?.expiresAt).toBeNull()
    expect(auth?.refreshTokenExpiresAt).toBeNull()
  })

  test('clearAuth then getAuth returns null again', async () => {
    const store = createStore()
    await store.storeAuth('access-token', 'refresh-token', 3600, 7200, 'octocat', ['repo'])
    expect(await store.getAuth()).not.toBeNull()

    await store.clearAuth()

    expect(await store.getAuth()).toBeNull()
  })
})
