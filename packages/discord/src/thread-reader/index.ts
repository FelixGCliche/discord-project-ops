import type { Message } from './schema'

const BASE_URL = 'https://discord.com/api/v10'

export async function fetchThreadMessages(
  channelId: string,
  botToken: string,
  opts?: {
    limit?: number
    before?: string
    fetch?: typeof globalThis.fetch
  }
): Promise<Message[]> {
  const f = opts?.fetch ?? globalThis.fetch
  const url = new URL(`${BASE_URL}/channels/${channelId}/messages`)
  url.searchParams.set('limit', String(opts?.limit ?? 50))
  if (opts?.before) {
    url.searchParams.set('before', opts.before)
  }

  const res = await f(url.toString(), {
    headers: {
      Authorization: `Bot ${botToken}`,
      'Content-Type': 'application/json',
    },
  })

  if (!res.ok) {
    throw new Error(`Failed to fetch messages: ${res.status} ${res.statusText}`)
  }

  const messages = (await res.json()) as Message[]
  return messages.reverse()
}
