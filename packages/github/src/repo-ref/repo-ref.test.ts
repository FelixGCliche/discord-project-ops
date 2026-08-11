import { describe, expect, mock, test } from 'bun:test'
import { Octokit } from '@octokit/rest'
import { resolveDefaultBranch } from './index'

type ReposGet = Octokit['rest']['repos']['get']

function buildClient() {
  return new Octokit({ auth: 'test' })
}

describe('resolveDefaultBranch()', () => {
  test('returns the default branch from the repo lookup', async () => {
    const client = buildClient()
    client.rest.repos.get = mock(async () => ({ data: { default_branch: 'main' } })) as unknown as ReposGet

    const result = await resolveDefaultBranch(client, { owner: 'acme', repo: 'widgets' })

    expect(client.rest.repos.get).toHaveBeenCalledWith({ owner: 'acme', repo: 'widgets' })
    expect(result).toBe('main')
  })

  test('reflects a non-default default branch', async () => {
    const client = buildClient()
    client.rest.repos.get = mock(async () => ({ data: { default_branch: 'trunk' } })) as unknown as ReposGet

    const result = await resolveDefaultBranch(client, { owner: 'acme', repo: 'widgets' })

    expect(result).toBe('trunk')
  })

  test('caches repeated calls for the same client and owner/repo', async () => {
    const client = buildClient()
    client.rest.repos.get = mock(async () => ({ data: { default_branch: 'main' } })) as unknown as ReposGet

    const first = await resolveDefaultBranch(client, { owner: 'acme', repo: 'widgets' })
    const second = await resolveDefaultBranch(client, { owner: 'acme', repo: 'widgets' })

    expect(first).toBe('main')
    expect(second).toBe('main')
    expect(client.rest.repos.get).toHaveBeenCalledTimes(1)
  })

  test('does not share the cache across different client instances', async () => {
    const clientA = buildClient()
    clientA.rest.repos.get = mock(async () => ({ data: { default_branch: 'main' } })) as unknown as ReposGet

    const clientB = buildClient()
    clientB.rest.repos.get = mock(async () => ({ data: { default_branch: 'main' } })) as unknown as ReposGet

    await resolveDefaultBranch(clientA, { owner: 'acme', repo: 'widgets' })
    await resolveDefaultBranch(clientB, { owner: 'acme', repo: 'widgets' })

    expect(clientA.rest.repos.get).toHaveBeenCalledTimes(1)
    expect(clientB.rest.repos.get).toHaveBeenCalledTimes(1)
  })

  test('dedupes concurrent calls for the same client and owner/repo', async () => {
    const client = buildClient()
    let callCount = 0
    client.rest.repos.get = mock(async () => {
      callCount++
      return { data: { default_branch: 'main' } }
    }) as unknown as ReposGet

    const [first, second] = await Promise.all([
      resolveDefaultBranch(client, { owner: 'acme', repo: 'widgets' }),
      resolveDefaultBranch(client, { owner: 'acme', repo: 'widgets' }),
    ])

    expect(first).toBe('main')
    expect(second).toBe('main')
    expect(callCount).toBe(1)
  })
})
