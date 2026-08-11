import type { CreateFollowupBody, EditFollowupBody } from './schema'

const BASE_URL = 'https://discord.com/api/v10'

function webhookBase(appId: string, token: string): string {
  return `${BASE_URL}/webhooks/${appId}/${token}`
}

function messageUrl(appId: string, token: string, messageId: string): string {
  return `${webhookBase(appId, token)}/messages/${messageId}`
}

export async function sendFollowup(
  appId: string,
  token: string,
  body: CreateFollowupBody,
  opts?: { fetch?: typeof globalThis.fetch }
): Promise<Response> {
  const f = opts?.fetch ?? globalThis.fetch
  return f(`${webhookBase(appId, token)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export async function editFollowup(
  appId: string,
  token: string,
  messageId: string,
  body: EditFollowupBody,
  opts?: { fetch?: typeof globalThis.fetch }
): Promise<Response> {
  const f = opts?.fetch ?? globalThis.fetch
  return f(messageUrl(appId, token, messageId), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export async function deleteFollowup(
  appId: string,
  token: string,
  messageId: string,
  opts?: { fetch?: typeof globalThis.fetch }
): Promise<Response> {
  const f = opts?.fetch ?? globalThis.fetch
  return f(messageUrl(appId, token, messageId), { method: 'DELETE' })
}

export async function editOriginalResponse(
  appId: string,
  token: string,
  body: EditFollowupBody,
  opts?: { fetch?: typeof globalThis.fetch }
): Promise<Response> {
  const f = opts?.fetch ?? globalThis.fetch
  return f(messageUrl(appId, token, '@original'), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export function getFollowupUrl(appId: string, token: string): string {
  return webhookBase(appId, token)
}
