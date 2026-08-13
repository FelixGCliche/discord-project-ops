import { HttpError } from 'core'
import { DISCORD_API_BASE_URL } from '../discord-api'
import type { CreateFollowupBody, EditFollowupBody } from './schema'

function webhookBase(appId: string, token: string): string {
  return `${DISCORD_API_BASE_URL}/webhooks/${appId}/${token}`
}

function messageUrl(appId: string, token: string, messageId: string): string {
  return `${webhookBase(appId, token)}/messages/${messageId}`
}

function ensureOk(res: Response, action: string): Response {
  if (!res.ok) {
    throw new HttpError(res.status, `Failed to ${action}: ${res.status} ${res.statusText}`)
  }
  return res
}

export async function sendFollowup(
  appId: string,
  token: string,
  body: CreateFollowupBody,
  opts?: { fetch?: typeof globalThis.fetch }
): Promise<Response> {
  const f = opts?.fetch ?? globalThis.fetch
  const res = await f(`${webhookBase(appId, token)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return ensureOk(res, 'send followup')
}

export async function editFollowup(
  appId: string,
  token: string,
  messageId: string,
  body: EditFollowupBody,
  opts?: { fetch?: typeof globalThis.fetch }
): Promise<Response> {
  const f = opts?.fetch ?? globalThis.fetch
  const res = await f(messageUrl(appId, token, messageId), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return ensureOk(res, 'edit followup')
}

export async function deleteFollowup(
  appId: string,
  token: string,
  messageId: string,
  opts?: { fetch?: typeof globalThis.fetch }
): Promise<Response> {
  const f = opts?.fetch ?? globalThis.fetch
  const res = await f(messageUrl(appId, token, messageId), { method: 'DELETE' })
  return ensureOk(res, 'delete followup')
}

export async function editOriginalResponse(
  appId: string,
  token: string,
  body: EditFollowupBody,
  opts?: { fetch?: typeof globalThis.fetch }
): Promise<Response> {
  const f = opts?.fetch ?? globalThis.fetch
  const res = await f(messageUrl(appId, token, '@original'), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return ensureOk(res, 'edit original response')
}

export function getFollowupUrl(appId: string, token: string): string {
  return webhookBase(appId, token)
}
