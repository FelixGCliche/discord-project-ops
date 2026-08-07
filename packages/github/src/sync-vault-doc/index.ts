import type { Octokit } from '@octokit/rest'
import { HttpError } from 'core'
import { getOctokitErrorStatus } from '../octokit-error'
import { getRepoFile, RepoFileNotFoundError } from '../read-repo-context'
import { resolveDefaultBranch } from '../repo-ref'

export type SyncVaultDocParams = {
  owner: string
  repo: string
  path: string // e.g. "summary/<thread_id>.md"
  content: string // markdown body
  commitMessage: string
  prTitle: string
  prBody?: string
  baseBranch?: string // defaults to the repo's default branch
  branchName?: string // defaults to a generated `vault/<path-slug>-<timestamp>`
}

export type SyncedVaultDoc = {
  branch: string
  commitSha: string
  prNumber: number
  prUrl: string
}

export class VaultDocSyncError extends HttpError {
  constructor(path: string, cause: unknown) {
    super(
      getOctokitErrorStatus(cause) ?? 500,
      `Failed to sync vault doc "${path}": ${cause instanceof Error ? cause.message : String(cause)}`
    )
    this.name = 'VaultDocSyncError'
    this.cause = cause
  }
}

function slugifyPath(path: string): string {
  return path
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// The sync branch is forked from the base branch, so `path` may already exist there (e.g. a
// previous sync that got merged). GitHub's contents API requires the current `sha` to update an
// existing file — omitting it 422s. Absence of the file (RepoFileNotFoundError) just means this
// is a first-time create, which needs no `sha`.
async function resolveExistingFileSha(
  client: Octokit,
  params: { owner: string; repo: string; path: string; branch: string }
): Promise<string | undefined> {
  try {
    const existing = await getRepoFile(client, {
      owner: params.owner,
      repo: params.repo,
      path: params.path,
      ref: params.branch,
    })
    return existing.sha
  } catch (cause) {
    if (cause instanceof RepoFileNotFoundError) {
      return undefined
    }
    throw cause
  }
}

export async function syncVaultDoc(client: Octokit, params: SyncVaultDocParams): Promise<SyncedVaultDoc> {
  const { owner, repo, path, content, commitMessage, prTitle, prBody } = params

  try {
    const baseBranch = params.baseBranch ?? (await resolveDefaultBranch(client, { owner, repo }))
    const branchName = params.branchName ?? `vault/${slugifyPath(path)}-${Date.now()}`

    const { data: baseRef } = await client.rest.git.getRef({ owner, repo, ref: `heads/${baseBranch}` })
    await client.rest.git.createRef({ owner, repo, ref: `refs/heads/${branchName}`, sha: baseRef.object.sha })

    try {
      const existingSha = await resolveExistingFileSha(client, { owner, repo, path, branch: branchName })

      const { data: commit } = await client.rest.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        message: commitMessage,
        content: Buffer.from(content).toString('base64'),
        branch: branchName,
        sha: existingSha,
      })

      if (!commit.commit.sha) {
        throw new Error('GitHub did not return a commit sha for the created file')
      }

      const { data: pr } = await client.rest.pulls.create({
        owner,
        repo,
        head: branchName,
        base: baseBranch,
        title: prTitle,
        body: prBody,
      })

      return {
        branch: branchName,
        commitSha: commit.commit.sha,
        prNumber: pr.number,
        prUrl: pr.html_url,
      }
    } catch (cause) {
      // Best-effort cleanup: the branch was created above but the sync didn't complete, so
      // delete it rather than leave an orphan. A failure here shouldn't mask the original cause.
      await client.rest.git.deleteRef({ owner, repo, ref: `heads/${branchName}` }).catch(() => {})
      throw cause
    }
  } catch (cause) {
    throw new VaultDocSyncError(path, cause)
  }
}
