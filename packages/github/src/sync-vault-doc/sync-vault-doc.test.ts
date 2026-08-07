import { describe, expect, mock, test } from 'bun:test'
import { Octokit } from '@octokit/rest'
import { syncVaultDoc, VaultDocSyncError } from './index'

type ReposGet = Octokit['rest']['repos']['get']
type GitGetRef = Octokit['rest']['git']['getRef']
type GitCreateRef = Octokit['rest']['git']['createRef']
type GitDeleteRef = Octokit['rest']['git']['deleteRef']
type ReposGetContent = Octokit['rest']['repos']['getContent']
type ReposCreateOrUpdateFileContents = Octokit['rest']['repos']['createOrUpdateFileContents']
type PullsCreate = Octokit['rest']['pulls']['create']

function buildClient() {
  const client = new Octokit({ auth: 'test' })

  client.rest.repos.get = mock(async () => ({ data: { default_branch: 'main' } })) as unknown as ReposGet
  client.rest.git.getRef = mock(async () => ({ data: { object: { sha: 'base-sha' } } })) as unknown as GitGetRef
  client.rest.git.createRef = mock(async () => ({ data: { ref: 'refs/heads/vault/x' } })) as unknown as GitCreateRef
  client.rest.git.deleteRef = mock(async () => ({ data: undefined })) as unknown as GitDeleteRef
  // No file at this path yet by default — a fresh sync creates rather than updates.
  client.rest.repos.getContent = mock(async () => {
    throw { status: 404, message: 'Not Found' }
  }) as unknown as ReposGetContent
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
        sha: undefined,
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

  test('passes the existing file sha when the path already exists on the base branch', async () => {
    const client = buildClient()
    client.rest.repos.getContent = mock(async () => ({
      data: { type: 'file', content: 'old', encoding: 'base64', sha: 'existing-sha', path: 'summary/thread-123.md' },
    })) as unknown as ReposGetContent

    await syncVaultDoc(client, buildParams({ baseBranch: 'main', branchName: 'vault/thread-123-1' }))

    expect(client.rest.repos.createOrUpdateFileContents).toHaveBeenCalledWith(
      expect.objectContaining({ sha: 'existing-sha' })
    )
  })

  test('wraps a failed branch creation in VaultDocSyncError and does not attempt cleanup', async () => {
    const client = buildClient()
    client.rest.git.createRef = mock(async () => {
      throw new Error('reference already exists')
    }) as unknown as GitCreateRef

    const error = await syncVaultDoc(client, buildParams({ baseBranch: 'main' })).catch((cause) => cause)

    expect(error).toBeInstanceOf(VaultDocSyncError)
    expect((error as VaultDocSyncError).cause).toBeInstanceOf(Error)
    expect((error as Error).message).toContain('reference already exists')
    expect(client.rest.git.deleteRef).not.toHaveBeenCalled()
  })

  test('wraps a failed PR creation in VaultDocSyncError and deletes the orphaned branch', async () => {
    const client = buildClient()
    client.rest.pulls.create = mock(async () => {
      throw new Error('validation failed')
    }) as unknown as PullsCreate

    const error = await syncVaultDoc(
      client,
      buildParams({ baseBranch: 'main', branchName: 'vault/thread-123-1' })
    ).catch((cause) => cause)

    expect(error).toBeInstanceOf(VaultDocSyncError)
    expect(client.rest.git.deleteRef).toHaveBeenCalledWith({
      owner: 'acme',
      repo: 'widgets',
      ref: 'heads/vault/thread-123-1',
    })
  })

  test('throws before opening a PR when GitHub omits the commit sha', async () => {
    const client = buildClient()
    client.rest.repos.createOrUpdateFileContents = mock(async () => ({
      data: { commit: {}, content: {} },
    })) as unknown as ReposCreateOrUpdateFileContents

    const error = await syncVaultDoc(client, buildParams({ baseBranch: 'main' })).catch((cause) => cause)

    expect(error).toBeInstanceOf(VaultDocSyncError)
    expect(client.rest.pulls.create).not.toHaveBeenCalled()
    expect(client.rest.git.deleteRef).toHaveBeenCalled()
  })

  test('carries the upstream status code on VaultDocSyncError, defaulting to 500', async () => {
    const client = buildClient()
    client.rest.pulls.create = mock(async () => {
      throw { status: 422, message: 'Validation Failed' }
    }) as unknown as PullsCreate

    const error = await syncVaultDoc(client, buildParams({ baseBranch: 'main' })).catch((cause) => cause)
    expect((error as VaultDocSyncError).status).toBe(422)

    const clientForInternalError = buildClient()
    clientForInternalError.rest.repos.createOrUpdateFileContents = mock(async () => ({
      data: { commit: {}, content: {} },
    })) as unknown as ReposCreateOrUpdateFileContents
    const internalError = await syncVaultDoc(clientForInternalError, buildParams({ baseBranch: 'main' })).catch(
      (cause) => cause
    )
    expect((internalError as VaultDocSyncError).status).toBe(500)
  })
})
