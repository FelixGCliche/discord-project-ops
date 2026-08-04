import { describe, expect, mock, test } from 'bun:test'
import { Octokit } from '@octokit/rest'
import { syncVaultDoc, VaultDocSyncError } from './index'

type ReposGet = Octokit['rest']['repos']['get']
type GitGetRef = Octokit['rest']['git']['getRef']
type GitCreateRef = Octokit['rest']['git']['createRef']
type ReposCreateOrUpdateFileContents = Octokit['rest']['repos']['createOrUpdateFileContents']
type PullsCreate = Octokit['rest']['pulls']['create']

function buildClient() {
  const client = new Octokit({ auth: 'test' })

  client.rest.repos.get = mock(async () => ({ data: { default_branch: 'main' } })) as unknown as ReposGet
  client.rest.git.getRef = mock(async () => ({ data: { object: { sha: 'base-sha' } } })) as unknown as GitGetRef
  client.rest.git.createRef = mock(async () => ({ data: { ref: 'refs/heads/vault/x' } })) as unknown as GitCreateRef
  client.rest.repos.createOrUpdateFileContents = mock(async () => ({
    data: { commit: { sha: 'commit-sha' }, content: {} },
  })) as unknown as ReposCreateOrUpdateFileContents
  client.rest.pulls.create = mock(async () => ({
    data: { number: 42, html_url: 'https://github.com/acme/widgets/pull/42' },
  })) as unknown as PullsCreate

  return client
}

function buildParams(overrides: Partial<Parameters<typeof syncVaultDoc>[1]> = {}) {
  return {
    owner: 'acme',
    repo: 'widgets',
    path: 'summary/thread-123.md',
    content: '# Summary\n\nSomething happened.',
    commitMessage: 'sync vault doc',
    prTitle: 'Add summary/thread-123.md',
    ...overrides,
  }
}

describe('syncVaultDoc()', () => {
  test('creates a branch, commits the file, and opens a PR (happy path)', async () => {
    const client = buildClient()

    const result = await syncVaultDoc(client, buildParams({ baseBranch: 'main', branchName: 'vault/thread-123-1' }))

    expect(client.rest.git.getRef).toHaveBeenCalledWith({ owner: 'acme', repo: 'widgets', ref: 'heads/main' })
    expect(client.rest.git.createRef).toHaveBeenCalledWith({
      owner: 'acme',
      repo: 'widgets',
      ref: 'refs/heads/vault/thread-123-1',
      sha: 'base-sha',
    })
    expect(client.rest.repos.createOrUpdateFileContents).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: 'acme',
        repo: 'widgets',
        path: 'summary/thread-123.md',
        message: 'sync vault doc',
        content: Buffer.from('# Summary\n\nSomething happened.').toString('base64'),
        branch: 'vault/thread-123-1',
      })
    )
    expect(client.rest.pulls.create).toHaveBeenCalledWith({
      owner: 'acme',
      repo: 'widgets',
      head: 'vault/thread-123-1',
      base: 'main',
      title: 'Add summary/thread-123.md',
      body: undefined,
    })
    expect(result).toEqual({
      branch: 'vault/thread-123-1',
      commitSha: 'commit-sha',
      prNumber: 42,
      prUrl: 'https://github.com/acme/widgets/pull/42',
    })
  })

  test('resolves baseBranch from the repo default branch when not given', async () => {
    const client = buildClient()

    await syncVaultDoc(client, buildParams())

    expect(client.rest.repos.get).toHaveBeenCalledWith({ owner: 'acme', repo: 'widgets' })
    expect(client.rest.git.getRef).toHaveBeenCalledWith({ owner: 'acme', repo: 'widgets', ref: 'heads/main' })
    expect(client.rest.pulls.create).toHaveBeenCalledWith(expect.objectContaining({ base: 'main' }))
  })

  test('generates a default branch name including the path slug and a timestamp', async () => {
    const client = buildClient()
    let requestedRef = ''
    client.rest.git.createRef = mock(async (params: { ref: string }) => {
      requestedRef = params.ref
      return { data: { ref: params.ref } }
    }) as unknown as GitCreateRef

    await syncVaultDoc(client, buildParams({ baseBranch: 'main' }))

    expect(requestedRef).toMatch(/^refs\/heads\/vault\/summary-thread-123-md-\d+$/)
  })

  test('wraps a failed branch creation in VaultDocSyncError', async () => {
    const client = buildClient()
    client.rest.git.createRef = mock(async () => {
      throw new Error('reference already exists')
    }) as unknown as GitCreateRef

    const error = await syncVaultDoc(client, buildParams({ baseBranch: 'main' })).catch((cause) => cause)

    expect(error).toBeInstanceOf(VaultDocSyncError)
    expect((error as VaultDocSyncError).cause).toBeInstanceOf(Error)
    expect((error as Error).message).toContain('reference already exists')
  })

  test('wraps a failed PR creation in VaultDocSyncError', async () => {
    const client = buildClient()
    client.rest.pulls.create = mock(async () => {
      throw new Error('validation failed')
    }) as unknown as PullsCreate

    await expect(syncVaultDoc(client, buildParams({ baseBranch: 'main' }))).rejects.toThrow(VaultDocSyncError)
  })
})
