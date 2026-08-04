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
})
