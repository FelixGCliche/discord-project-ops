import { afterEach, describe, expect, mock, test } from 'bun:test'
import { mockFetch } from 'core/test-utils.ts'
import { determineHasMigration } from './index'

const CREDS = { CLOUDFLARE_ACCOUNT_ID: 'acct', CLOUDFLARE_API_TOKEN: 'token' }
const SCRIPT = { name: 'my-worker', migrations: [{ tag: 'v1' }] }

afterEach(() => {
  mock.restore()
})

describe('determineHasMigration', () => {
  test('returns false without calling Cloudflare when there are no new tags', async () => {
    const fetchMock = mockFetch(async () => new Response())

    const result = await determineHasMigration([], SCRIPT, CREDS)

    expect(result).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('returns true when Cloudflare credentials are missing', async () => {
    const fetchMock = mockFetch(async () => new Response())

    const result = await determineHasMigration(['v1'], SCRIPT, {})

    expect(result).toBe(true)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('returns false when the live migration_tag already matches the newest local tag', async () => {
    mockFetch(async () => new Response(JSON.stringify({ result: [{ id: 'my-worker', migration_tag: 'v1' }] })))

    const result = await determineHasMigration(['v1'], SCRIPT, CREDS)

    expect(result).toBe(false)
  })

  test('returns true when the live migration_tag is behind the newest local tag', async () => {
    mockFetch(async () => new Response(JSON.stringify({ result: [{ id: 'my-worker', migration_tag: 'v1' }] })))

    const result = await determineHasMigration(
      ['v2'],
      { name: 'my-worker', migrations: [{ tag: 'v1' }, { tag: 'v2' }] },
      CREDS
    )

    expect(result).toBe(true)
  })

  test('returns true when the script has never been deployed (no matching entry)', async () => {
    mockFetch(async () => new Response(JSON.stringify({ result: [] })))

    const result = await determineHasMigration(['v1'], SCRIPT, CREDS)

    expect(result).toBe(true)
  })

  test('falls back to true when the Cloudflare API call fails', async () => {
    mockFetch(async () => {
      throw new Error('network error')
    })

    const result = await determineHasMigration(['v1'], SCRIPT, CREDS)

    expect(result).toBe(true)
  })

  test('falls back to true when the Cloudflare API returns a non-ok response', async () => {
    mockFetch(async () => new Response('nope', { status: 500 }))

    const result = await determineHasMigration(['v1'], SCRIPT, CREDS)

    expect(result).toBe(true)
  })
})
