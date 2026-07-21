import type { LinearClient } from '@linear/sdk'

export type LinearLabelCacheEntry = { id: string; name: string; teamId?: string }
export type LinearLabelCache = { entries?: LinearLabelCacheEntry[] }

export async function resolveLinearLabels(
  client: LinearClient,
  teamId: string,
  names: string[],
  cache?: LinearLabelCache
): Promise<string[]> {
  if (names.length === 0) {
    return []
  }

  let entries = cache?.entries
  if (!entries) {
    const existing = await client.issueLabels()
    entries = existing.nodes.map((label) => ({ id: label.id, name: label.name, teamId: label.teamId ?? undefined }))
    if (cache) {
      cache.entries = entries
    }
  }

  const byName = new Map(
    entries
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
    entries.push({ id: payload.issueLabelId, name, teamId })
  }

  return labelIds
}
