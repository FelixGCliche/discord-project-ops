import type { Octokit } from '@octokit/rest'

export async function resolveDefaultBranch(client: Octokit, params: { owner: string; repo: string }): Promise<string> {
  const { data } = await client.rest.repos.get({ owner: params.owner, repo: params.repo })
  return data.default_branch
}
