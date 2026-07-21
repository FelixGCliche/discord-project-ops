import type { LinearClient } from '@linear/sdk'

export async function resolveLinearLabels(client: LinearClient, teamId: string, names: string[]): Promise<string[]> {
  if (names.length === 0) {
    return []
  }

  const existing = await client.issueLabels()
  const byName = new Map(
    existing.nodes
      .filter((label) => label.teamId === teamId || label.teamId === undefined)
      .map((label) => [label.name.toLowerCase(), label.id])
  )

  const labelIds: string[] = []
  for (const name of names) {
    const existingId = byName.get(name.toLowerCase())
    if (existingId) {
      labelIds.push(existingId)
      continue
    }
    const payload = await client.createIssueLabel({ name, teamId })
    if (!payload.issueLabelId) {
      throw new Error(`Failed to create Linear label "${name}"`)
    }
    labelIds.push(payload.issueLabelId)
    byName.set(name.toLowerCase(), payload.issueLabelId)
  }

  return labelIds
}
