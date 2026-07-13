import { z } from 'zod'
import type { LinearEnv } from './env'

const LINEAR_AUTHORIZE_URL = 'https://linear.app/oauth/authorize'
const LINEAR_TOKEN_URL = 'https://api.linear.app/oauth/token'
const DEFAULT_SCOPES = 'read,issues:create'
const STATE_MAX_AGE_MS = 10 * 60 * 1000

const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.string().min(1),
  scope: z.string().min(1),
})

export type LinearTokenResponse = z.infer<typeof tokenResponseSchema>

function toBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

async function hmacSign(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return toBase64Url(signature)
}

export async function createSignedState(secret: string): Promise<string> {
  const nonce = crypto.randomUUID()
  const timestamp = Date.now().toString()
  const signature = await hmacSign(secret, `${nonce}.${timestamp}`)
  return `${nonce}.${timestamp}.${signature}`
}

export async function verifySignedState(secret: string, state: string, maxAgeMs = STATE_MAX_AGE_MS): Promise<boolean> {
  const parts = state.split('.')
  if (parts.length !== 3) return false
  const [nonce, timestamp, signature] = parts as [string, string, string]
  const expectedSignature = await hmacSign(secret, `${nonce}.${timestamp}`)
  if (!timingSafeEqual(signature, expectedSignature)) return false
  const age = Date.now() - Number(timestamp)
  return Number.isFinite(age) && age >= 0 && age <= maxAgeMs
}

export async function getAuthorizationUrl(env: LinearEnv): Promise<string> {
  const state = await createSignedState(env.LINEAR_OAUTH_STATE_SECRET)
  const params = new URLSearchParams({
    client_id: env.LINEAR_OAUTH_CLIENT_ID,
    redirect_uri: env.LINEAR_OAUTH_REDIRECT_URI,
    response_type: 'code',
    scope: DEFAULT_SCOPES,
    state,
  })
  return `${LINEAR_AUTHORIZE_URL}?${params.toString()}`
}

type FetchImpl = (input: string | URL, init?: RequestInit) => Promise<Response>

export async function exchangeCodeForToken(
  env: LinearEnv,
  code: string,
  fetchImpl: FetchImpl = fetch
): Promise<LinearTokenResponse> {
  const response = await fetchImpl(LINEAR_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.LINEAR_OAUTH_CLIENT_ID,
      client_secret: env.LINEAR_OAUTH_CLIENT_SECRET,
      redirect_uri: env.LINEAR_OAUTH_REDIRECT_URI,
      code,
      grant_type: 'authorization_code',
    }),
  })
  if (!response.ok) {
    throw new Error(`Linear token exchange failed: ${response.status}`)
  }
  return tokenResponseSchema.parse(await response.json())
}
