import { HttpError } from 'core'
import { DISCORD_API_BASE_URL } from '../discord-api'
import type { Command, CreateCommandBody } from './schema'

export async function registerCommands(
  appId: string,
  botToken: string,
  commands: CreateCommandBody[],
  opts?: { fetch?: typeof globalThis.fetch }
): Promise<Command[]> {
  const f = opts?.fetch ?? globalThis.fetch
  const res = await f(`${DISCORD_API_BASE_URL}/applications/${appId}/commands`, {
    method: 'PUT',
    headers: {
      Authorization: `Bot ${botToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commands),
  })

  if (!res.ok) {
    throw new HttpError(res.status, `Failed to register commands: ${res.status} ${res.statusText}`)
  }

  return res.json() as Promise<Command[]>
}
