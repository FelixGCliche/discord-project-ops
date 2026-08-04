import { describe, expect, mock, test } from 'bun:test'
import { Octokit } from '@octokit/rest'
import { getRepoFile, listRepoTree, RepoFileNotFoundError } from './index'

type ReposGetContent = Octokit['rest']['repos']['getContent']
type GitGetTree = Octokit['rest']['git']['getTree']
type ReposGet = Octokit['rest']['repos']['get']

function buildClient() {
  return new Octokit({ auth: 'test' })
}

describe('getRepoFile()', () => {
  test('decodes the base64 content of a file response', async () => {
    const client = buildClient()
    client.rest.repos.getContent = mock(async () => ({
      data: {
        type: 'file',
        content: Buffer.from('hello world').toString('base64'),
        encoding: 'base64',
        sha: 'abc123',
        path: 'docs/readme.md',
      },
    })) as unknown as ReposGetContent

    const result = await getRepoFile(client, { owner: 'acme', repo: 'widgets', path: 'docs/readme.md' })

    expect(client.rest.repos.getContent).toHaveBeenCalledWith({
      owner: 'acme',
      repo: 'widgets',
      path: 'docs/readme.md',
      ref: undefined,
    })
    expect(result).toEqual({ path: 'docs/readme.md', content: 'hello world', sha: 'abc123' })
  })

  test('throws RepoFileNotFoundError when the path resolves to a directory', async () => {
    const client = buildClient()
    client.rest.repos.getContent = mock(async () => ({
      data: [{ type: 'file', name: 'a.md', path: 'docs/a.md', sha: 'a-sha' }],
    })) as unknown as ReposGetContent

    await expect(getRepoFile(client, { owner: 'acme', repo: 'widgets', path: 'docs' })).rejects.toThrow(
      RepoFileNotFoundError
    )
  })

  test('throws RepoFileNotFoundError on an actual 404', async () => {
    const client = buildClient()
    client.rest.repos.getContent = mock(async () => {
      throw { status: 404, message: 'Not Found' }
    }) as unknown as ReposGetContent

    await expect(getRepoFile(client, { owner: 'acme', repo: 'widgets', path: 'missing.md' })).rejects.toThrow(
      RepoFileNotFoundError
    )
  })

  test('propagates non-404 errors unwrapped', async () => {
    const client = buildClient()
    client.rest.repos.getContent = mock(async () => {
      throw { status: 500, message: 'Internal Server Error' }
    }) as unknown as ReposGetContent

    await expect(getRepoFile(client, { owner: 'acme', repo: 'widgets', path: 'docs/readme.md' })).rejects.not.toThrow(
      RepoFileNotFoundError
    )
  })
})

describe('listRepoTree()', () => {
  test('maps tree entries and filters out submodule (commit) entries for an explicit ref', async () => {
    const client = buildClient()
    client.rest.git.getTree = mock(async () => ({
      data: {
        sha: 'tree-sha',
        truncated: false,
        tree: [
          { path: 'src', mode: '040000', type: 'tree', sha: 'tree-1' },
          { path: 'src/index.ts', mode: '100644', type: 'blob', sha: 'blob-1', size: 42 },
          { path: 'vendor/lib', mode: '160000', type: 'commit', sha: 'commit-1' },
        ],
      },
    })) as unknown as GitGetTree

    const result = await listRepoTree(client, { owner: 'acme', repo: 'widgets', ref: 'main', recursive: true })

    expect(client.rest.git.getTree).toHaveBeenCalledWith({
      owner: 'acme',
      repo: 'widgets',
      tree_sha: 'main',
      recursive: '1',
    })
    expect(result).toEqual([
      { path: 'src', type: 'tree', sha: 'tree-1', size: undefined },
      { path: 'src/index.ts', type: 'blob', sha: 'blob-1', size: 42 },
    ])
  })

  test('resolves the default branch when ref is not given', async () => {
    const client = buildClient()
    client.rest.repos.get = mock(async () => ({ data: { default_branch: 'main' } })) as unknown as ReposGet
    client.rest.git.getTree = mock(async () => ({
      data: { sha: 'tree-sha', truncated: false, tree: [] },
    })) as unknown as GitGetTree

    await listRepoTree(client, { owner: 'acme', repo: 'widgets' })

    expect(client.rest.repos.get).toHaveBeenCalledWith({ owner: 'acme', repo: 'widgets' })
    expect(client.rest.git.getTree).toHaveBeenCalledWith({
      owner: 'acme',
      repo: 'widgets',
      tree_sha: 'main',
      recursive: undefined,
    })
  })
})
