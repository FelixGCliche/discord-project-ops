import type { Octokit } from '@octokit/rest'
import { HttpError } from 'core'
import { getOctokitErrorStatus } from '../octokit-error'
import { resolveDefaultBranch } from '../repo-ref'

export type RepoFile = { path: string; content: string; sha: string }

export class RepoFileNotFoundError extends HttpError {
  constructor(path: string) {
    super(404, `Repo file not found: ${path}`)
    this.name = 'RepoFileNotFoundError'
  }
}

export class RepoPathNotFileError extends Error {
  constructor(path: string) {
    super(`Repo path is not a file: ${path}`)
    this.name = 'RepoPathNotFileError'
  }
}

export async function getRepoFile(
  client: Octokit,
  params: { owner: string; repo: string; path: string; ref?: string }
): Promise<RepoFile> {
  const { owner, repo, path, ref } = params

  let data: Awaited<ReturnType<Octokit['rest']['repos']['getContent']>>['data']
  try {
    const response = await client.rest.repos.getContent({ owner, repo, path, ref })
    data = response.data
  } catch (cause) {
    if (getOctokitErrorStatus(cause) === 404) {
      throw new RepoFileNotFoundError(path)
    }
    throw cause
  }

  // getContent's response is a union: a single file, a directory (array of entries), or a
  // symlink/submodule — only the file variant has a `content` field to decode. A directory or
  // symlink is a real, existing path, so it gets its own error type rather than being reported
  // as not-found.
  if (Array.isArray(data) || data.type !== 'file') {
    throw new RepoPathNotFileError(path)
  }

  return {
    path: data.path,
    content: Buffer.from(data.content, 'base64').toString('utf-8'),
    sha: data.sha,
  }
}

export type RepoTreeEntry = { path: string; type: 'blob' | 'tree'; sha: string; size?: number }

type GitTreeEntry = Awaited<ReturnType<Octokit['rest']['git']['getTree']>>['data']['tree'][number]

function isFileOrDirEntry(entry: GitTreeEntry): entry is GitTreeEntry & { type: 'blob' | 'tree' } {
  // Submodule references show up as type "commit" — filter them out since they're neither
  // files nor directories our callers care about.
  return entry.type === 'blob' || entry.type === 'tree'
}

export async function listRepoTree(
  client: Octokit,
  params: { owner: string; repo: string; ref?: string; recursive?: boolean }
): Promise<RepoTreeEntry[]> {
  const { owner, repo, recursive } = params
  const ref = params.ref ?? (await resolveDefaultBranch(client, { owner, repo }))

  try {
    const { data } = await client.rest.git.getTree({
      owner,
      repo,
      tree_sha: ref,
      recursive: recursive ? '1' : undefined,
    })

    return data.tree.filter(isFileOrDirEntry).map((entry) => ({
      path: entry.path,
      type: entry.type,
      sha: entry.sha,
      size: entry.size,
    }))
  } catch (cause) {
    const status = getOctokitErrorStatus(cause)
    if (status !== undefined) {
      throw new HttpError(status, `GitHub tree lookup failed: ${status}`)
    }
    throw cause
  }
}
