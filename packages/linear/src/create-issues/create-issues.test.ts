import { describe, expect, mock, test } from 'bun:test'
import { LinearClient } from '@linear/sdk'
import type {
  Issue as LinearIssue,
  IssueLabel,
  IssueLabelConnection,
  IssueLabelPayload,
  IssuePayload,
  IssueRelationPayload,
  Team,
  TeamConnection,
} from '@linear/sdk'
import type { Issue, Issues } from 'core'
import { createLinearIssue, createLinearIssueBatch, LinearIssueCreationError } from './index'
import { LinearTeamNotFoundError } from './resolve-team'

// @linear/sdk doesn't publicly export its generated `*CreateInput` types, so derive them
// from the client methods that already need to accept them.
type IssueCreateInput = Parameters<LinearClient['createIssue']>[0]
type IssueLabelCreateInput = Parameters<LinearClient['createIssueLabel']>[0]

function buildIssue(overrides: Partial<Issue> = {}): Issue {
  return {
    title: 'Add weight column',
    description: 'Add a weight column to the item table.',
    labels: [],
    depends_on: [],
    team: 'ENG',
    ...overrides,
  }
}

function buildTeam(overrides: Partial<Team> = {}): Team {
  return { id: 'team-eng', key: 'ENG', name: 'Engineering', ...overrides } as Team
}

function buildClient(options: { teams?: Team[]; labels?: Partial<IssueLabel>[] } = {}) {
  const teams = options.teams ?? [buildTeam()]
  const labels = options.labels ?? []
  const client = new LinearClient({ accessToken: 'test' })

  let nextIssueId = 1
  let nextLabelId = 1

  client.teams = mock(async () => ({ nodes: teams }) as unknown as TeamConnection)
  client.issueLabels = mock(async () => ({ nodes: labels }) as unknown as IssueLabelConnection)
  client.createIssueLabel = mock(async (input: IssueLabelCreateInput) => {
    const id = `label-${nextLabelId++}`
    labels.push({ id, name: input.name, teamId: input.teamId ?? undefined })
    return { issueLabelId: id } as unknown as IssueLabelPayload
  })
  client.createIssue = mock(async (input: IssueCreateInput) => {
    const id = `issue-${nextIssueId++}`
    const created = {
      id,
      identifier: `ENG-${nextIssueId}`,
      url: `https://linear.app/issue/${id}`,
      ...input,
    } as unknown as LinearIssue
    return { issueId: id, issue: Promise.resolve(created) } as unknown as IssuePayload
  })
  client.createIssueRelation = mock(async () => ({}) as unknown as IssueRelationPayload)

  return client
}

describe('createLinearIssue()', () => {
  test('resolves the team by key, creates the issue, and returns no unresolved dependencies', async () => {
    const client = buildClient()
    const issue = buildIssue({ team: 'eng' })

    const result = await createLinearIssue(client, { issue })

    expect(client.createIssue).toHaveBeenCalledWith(
      expect.objectContaining({ teamId: 'team-eng', title: issue.title, description: issue.description, labelIds: [] })
    )
    expect(result.title).toBe(issue.title)
    expect(result.unresolvedDependencies).toEqual([])
  })

  test('resolves the team by name, case-insensitively', async () => {
    const client = buildClient()
    const issue = buildIssue({ team: 'engineering' })

    await createLinearIssue(client, { issue })

    expect(client.createIssue).toHaveBeenCalledWith(expect.objectContaining({ teamId: 'team-eng' }))
  })

  test('throws LinearTeamNotFoundError when no team matches and none is configured', async () => {
    const client = buildClient()
    const issue = buildIssue({ team: 'ghost-team' })

    await expect(createLinearIssue(client, { issue })).rejects.toThrow(LinearTeamNotFoundError)
  })

  test('reuses an existing label case-insensitively and creates the missing one', async () => {
    const client = buildClient({ labels: [{ id: 'label-design', name: 'Design', teamId: 'team-eng' }] })
    const issue = buildIssue({ labels: ['design', 'new-label'] })

    await createLinearIssue(client, { issue })

    expect(client.createIssueLabel).toHaveBeenCalledTimes(1)
    expect(client.createIssueLabel).toHaveBeenCalledWith({ name: 'new-label', teamId: 'team-eng' })
    expect(client.createIssue).toHaveBeenCalledWith(expect.objectContaining({ labelIds: ['label-design', 'label-1'] }))
  })

  test('links depends_on titles already known and leaves the rest unresolved', async () => {
    const client = buildClient()
    const issue = buildIssue({ depends_on: ['Dep A', 'Dep B'] })

    const result = await createLinearIssue(client, { issue, knownIssueIds: { 'Dep A': 'issue-dep-a' } })

    expect(client.createIssueRelation).toHaveBeenCalledTimes(1)
    expect(client.createIssueRelation).toHaveBeenCalledWith({
      issueId: 'issue-dep-a',
      relatedIssueId: result.issueId,
      type: 'blocks',
    })
    expect(result.unresolvedDependencies).toEqual(['Dep B'])
  })

  test('wraps a failed Linear mutation in LinearIssueCreationError', async () => {
    const client = buildClient()
    client.createIssue = mock(async () => {
      throw new Error('network down')
    })
    const issue = buildIssue()

    await expect(createLinearIssue(client, { issue })).rejects.toThrow(LinearIssueCreationError)
  })
})

describe('createLinearIssueBatch()', () => {
  test('links a multi-level dependency chain across two passes', async () => {
    const client = buildClient()
    const doc: Issues = {
      post_id: 'post_123',
      plan_ref: 'plans/post_123.md',
      issues: [
        buildIssue({ title: 'Add weight column', depends_on: [] }),
        buildIssue({ title: 'Backfill weights', depends_on: ['Add weight column'] }),
        buildIssue({ title: 'Derive carryCapacity', depends_on: ['Backfill weights'] }),
      ],
    }

    const results = await createLinearIssueBatch(client, doc)

    expect(results).toHaveLength(3)
    expect(results.every((result) => result.unresolvedDependencies.length === 0)).toBe(true)
    expect(client.createIssueRelation).toHaveBeenCalledTimes(2)
  })
})
