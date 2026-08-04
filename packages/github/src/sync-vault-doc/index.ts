import type { Octokit } from '@octokit/rest'
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

export class VaultDocSyncError extends Error {
  constructor(path: string, cause: unknown) {
    super(`Failed to sync vault doc "${path}": ${cause instanceof Error ? cause.message : String(cause)}`)
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

export async function syncVaultDoc(client: Octokit, params: SyncVaultDocParams): Promise<SyncedVaultDoc> {
  const { owner, repo, path, content, commitMessage, prTitle, prBody } = params

  try {
    const baseBranch = params.baseBranch ?? (await resolveDefaultBranch(client, { owner, repo }))
    const branchName = params.branchName ?? `vault/${slugifyPath(path)}-${Date.now()}`

    const { data: baseRef } = await client.rest.git.getRef({ owner, repo, ref: `heads/${baseBranch}` })
    await client.rest.git.createRef({ owner, repo, ref: `refs/heads/${branchName}`, sha: baseRef.object.sha })

    const { data: commit } = await client.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message: commitMessage,
      content: Buffer.from(content).toString('base64'),
      branch: branchName,
    })

    const { data: pr } = await client.rest.pulls.create({
      owner,
      repo,
      head: branchName,
      base: baseBranch,
      title: prTitle,
      body: prBody,
    })

    if (!commit.commit.sha) {
      throw new Error('GitHub did not return a commit sha for the created file')
    }

    return {
      branch: branchName,
      commitSha: commit.commit.sha,
      prNumber: pr.number,
      prUrl: pr.html_url,
    }
  } catch (cause) {
    throw new VaultDocSyncError(path, cause)
  }
}
