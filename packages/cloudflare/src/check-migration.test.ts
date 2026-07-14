import { afterEach, describe, expect, mock, test } from 'bun:test'
import { determineHasMigration } from './check-migration'

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('determineHasMigration', () => {
  test('returns false without calling Cloudflare when there are no new tags', async () => {
    const fetchMock = mock(async () => new Response())
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const result = await determineHasMigration(
      [],
      { name: 'my-worker', migrations: [{ tag: 'v1' }] },
      {
        CLOUDFLARE_ACCOUNT_ID: 'acct',
        CLOUDFLARE_API_TOKEN: 'token',
      }
    )

    expect(result).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('returns true when Cloudflare credentials are missing', async () => {
    const fetchMock = mock(async () => new Response())
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const result = await determineHasMigration(['v1'], { name: 'my-worker', migrations: [{ tag: 'v1' }] }, {})

    expect(result).toBe(true)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('returns false when the live migration_tag already matches the newest local tag', async () => {
    globalThis.fetch = mock(
      async () => new Response(JSON.stringify({ result: [{ id: 'my-worker', migration_tag: 'v1' }] }))
    ) as unknown as typeof fetch

    const result = await determineHasMigration(
      ['v1'],
      { name: 'my-worker', migrations: [{ tag: 'v1' }] },
      {
        CLOUDFLARE_ACCOUNT_ID: 'acct',
        CLOUDFLARE_API_TOKEN: 'token',
      }
    )

    expect(result).toBe(false)
  })

  test('returns true when the live migration_tag is behind the newest local tag', async () => {
    globalThis.fetch = mock(
      async () => new Response(JSON.stringify({ result: [{ id: 'my-worker', migration_tag: 'v1' }] }))
    ) as unknown as typeof fetch

    const result = await determineHasMigration(
      ['v2'],
      { name: 'my-worker', migrations: [{ tag: 'v1' }, { tag: 'v2' }] },
      {
        CLOUDFLARE_ACCOUNT_ID: 'acct',
        CLOUDFLARE_API_TOKEN: 'token',
      }
    )

    expect(result).toBe(true)
  })

  test('returns true when the script has never been deployed (no matching entry)', async () => {
    globalThis.fetch = mock(async () => new Response(JSON.stringify({ result: [] }))) as unknown as typeof fetch

    const result = await determineHasMigration(
      ['v1'],
      { name: 'my-worker', migrations: [{ tag: 'v1' }] },
      {
        CLOUDFLARE_ACCOUNT_ID: 'acct',
        CLOUDFLARE_API_TOKEN: 'token',
      }
    )

    expect(result).toBe(true)
  })

  test('falls back to true when the Cloudflare API call fails', async () => {
    globalThis.fetch = mock(async () => {
      throw new Error('network error')
    }) as unknown as typeof fetch

    const result = await determineHasMigration(
      ['v1'],
      { name: 'my-worker', migrations: [{ tag: 'v1' }] },
      {
        CLOUDFLARE_ACCOUNT_ID: 'acct',
        CLOUDFLARE_API_TOKEN: 'token',
      }
    )

    expect(result).toBe(true)
  })

  test('falls back to true when the Cloudflare API returns a non-ok response', async () => {
    globalThis.fetch = mock(async () => new Response('nope', { status: 500 })) as unknown as typeof fetch

    const result = await determineHasMigration(
      ['v1'],
      { name: 'my-worker', migrations: [{ tag: 'v1' }] },
      {
        CLOUDFLARE_ACCOUNT_ID: 'acct',
        CLOUDFLARE_API_TOKEN: 'token',
      }
    )

    expect(result).toBe(true)
  })
})
