import { IssueRelationType, type LinearClient } from '@linear/sdk'
import type { Issue, Issues } from 'core'
import { resolveLinearLabels, type LinearLabelCache } from './resolve-labels'
import { resolveLinearTeam, LinearTeamNotFoundError, type LinearTeamCache } from './resolve-team'

export { LinearTeamNotFoundError }

export type LinearIssueResolveCache = LinearTeamCache & LinearLabelCache

export class LinearIssueCreationError extends Error {
  constructor(title: string, cause: unknown) {
    super(`Failed to create Linear issue "${title}": ${cause instanceof Error ? cause.message : String(cause)}`)
    this.name = 'LinearIssueCreationError'
    this.cause = cause
  }
}

export type CreateLinearIssueParams = {
  issue: Issue
  teamIdentifier?: string
  knownIssueIds?: Record<string, string>
  cache?: LinearIssueResolveCache
}

export type CreatedLinearIssue = {
  title: string
  issueId: string
  identifier: string
  url: string
  unresolvedDependencies: string[]
}

export async function createLinearIssueRelation(
  client: LinearClient,
  blockingIssueId: string,
  blockedIssueId: string
): Promise<void> {
  await client.createIssueRelation({
    issueId: blockingIssueId,
    relatedIssueId: blockedIssueId,
    type: IssueRelationType.Blocks,
  })
}

export async function createLinearIssue(
  client: LinearClient,
  params: CreateLinearIssueParams
): Promise<CreatedLinearIssue> {
  const { issue, knownIssueIds = {}, cache } = params
  const teamIdentifier = params.teamIdentifier ?? issue.team
  if (!teamIdentifier) {
    throw new LinearIssueCreationError(issue.title, new Error('no team specified and no default team configured'))
  }

  const team = await resolveLinearTeam(client, teamIdentifier, cache)

  let issueId: string
  let identifier: string
  let url: string
  try {
    const labelIds = await resolveLinearLabels(client, team.id, issue.labels, cache)
    const payload = await client.createIssue({
      teamId: team.id,
      title: issue.title,
      description: issue.description,
      labelIds,
    })
    const created = await payload.issue
    if (!created) {
      throw new Error('Linear did not return the created issue')
    }
    issueId = created.id
    identifier = created.identifier
    url = created.url
  } catch (cause) {
    throw new LinearIssueCreationError(issue.title, cause)
  }

  const unresolvedDependencies: string[] = []
  for (const dependencyTitle of issue.depends_on) {
    const blockingIssueId = knownIssueIds[dependencyTitle]
    if (blockingIssueId) {
      await createLinearIssueRelation(client, blockingIssueId, issueId)
    } else {
      unresolvedDependencies.push(dependencyTitle)
    }
  }

  return { title: issue.title, issueId, identifier, url, unresolvedDependencies }
}

export async function createLinearIssueBatch(
  client: LinearClient,
  doc: Issues,
  options: { teamIdentifier?: string } = {}
): Promise<CreatedLinearIssue[]> {
  const knownIssueIds: Record<string, string> = {}
  const cache: LinearIssueResolveCache = {}
  const results: CreatedLinearIssue[] = []

  for (const issue of doc.issues) {
    const result = await createLinearIssue(client, {
      issue,
      teamIdentifier: options.teamIdentifier,
      knownIssueIds,
      cache,
    })
    knownIssueIds[result.title] = result.issueId
    results.push(result)
  }

  for (const result of results) {
    for (const dependencyTitle of result.unresolvedDependencies) {
      const blockingIssueId = knownIssueIds[dependencyTitle]
      if (blockingIssueId) {
        await createLinearIssueRelation(client, blockingIssueId, result.issueId)
      }
    }
    // Every depends_on title is guaranteed (by IssuesSchema validation) to belong to another
    // issue in this same doc, and pass 1 has now created all of them.
    result.unresolvedDependencies = []
  }

  return results
}
