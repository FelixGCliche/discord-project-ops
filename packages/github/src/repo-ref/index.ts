import type { Octokit } from '@octokit/rest'

const defaultBranchCache = new WeakMap<Octokit, Map<string, Promise<string>>>()

export async function resolveDefaultBranch(client: Octokit, params: { owner: string; repo: string }): Promise<string> {
  const key = `${params.owner}/${params.repo}`

  let clientCache = defaultBranchCache.get(client)
  if (!clientCache) {
    clientCache = new Map<string, Promise<string>>()
    defaultBranchCache.set(client, clientCache)
  }

  let pending = clientCache.get(key)
  if (!pending) {
    pending = client.rest.repos.get({ owner: params.owner, repo: params.repo }).then(({ data }) => data.default_branch)
    clientCache.set(key, pending)
  }

  return pending
}
