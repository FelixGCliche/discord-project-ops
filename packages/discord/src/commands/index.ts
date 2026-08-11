import type { Command, CreateCommandBody } from './schema'

const BASE_URL = 'https://discord.com/api/v10'

export async function registerCommands(
  appId: string,
  botToken: string,
  commands: CreateCommandBody[],
  opts?: { fetch?: typeof globalThis.fetch }
): Promise<Command[]> {
  const f = opts?.fetch ?? globalThis.fetch
  const res = await f(`${BASE_URL}/applications/${appId}/commands`, {
    method: 'PUT',
    headers: {
      Authorization: `Bot ${botToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commands),
  })

  if (!res.ok) {
    throw new Error(`Failed to register commands: ${res.status} ${res.statusText}`)
  }

  return res.json() as Promise<Command[]>
}
