import type { LinearClient, Team } from '@linear/sdk'

export class LinearTeamNotFoundError extends Error {
  constructor(identifier: string) {
    super(`No Linear team found matching key or name "${identifier}"`)
    this.name = 'LinearTeamNotFoundError'
  }
}

export type LinearTeamCache = { teams?: Team[] }

export async function resolveLinearTeam(
  client: LinearClient,
  identifier: string,
  cache?: LinearTeamCache
): Promise<Team> {
  const needle = identifier.trim().toLowerCase()
  let teams = cache?.teams
  if (!teams) {
    teams = (await client.teams()).nodes
    if (cache) {
      cache.teams = teams
    }
  }
  const match = teams.find((team) => team.key.toLowerCase() === needle || team.name.toLowerCase() === needle)
  if (!match) {
    throw new LinearTeamNotFoundError(identifier)
  }
  return match
}
