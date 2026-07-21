import type { LinearClient, Team } from '@linear/sdk'

export class LinearTeamNotFoundError extends Error {
  constructor(identifier: string) {
    super(`No Linear team found matching key or name "${identifier}"`)
    this.name = 'LinearTeamNotFoundError'
  }
}

export async function resolveLinearTeam(client: LinearClient, identifier: string): Promise<Team> {
  const needle = identifier.trim().toLowerCase()
  const teams = await client.teams()
  const match = teams.nodes.find((team) => team.key.toLowerCase() === needle || team.name.toLowerCase() === needle)
  if (!match) {
    throw new LinearTeamNotFoundError(identifier)
  }
  return match
}
