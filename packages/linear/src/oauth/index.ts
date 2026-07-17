import { z } from 'zod'
import type { LinearEnv } from '../env'

const LINEAR_AUTHORIZE_URL = 'https://linear.app/oauth/authorize'
const LINEAR_TOKEN_URL = 'https://api.linear.app/oauth/token'
const DEFAULT_SCOPES = 'read,issues:create'

const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.string().min(1),
  scope: z.string().min(1),
  expires_in: z.number(),
  refresh_token: z.string().min(1),
})

export type LinearTokenResponse = z.infer<typeof tokenResponseSchema>

export function getAuthorizationUrl(env: LinearEnv, state: string): string {
  const params = new URLSearchParams({
    client_id: env.LINEAR_OAUTH_CLIENT_ID,
    redirect_uri: env.LINEAR_OAUTH_REDIRECT_URI,
    response_type: 'code',
    scope: DEFAULT_SCOPES,
    actor: 'app',
    state,
  })
  return `${LINEAR_AUTHORIZE_URL}?${params.toString()}`
}

export type FetchImpl = (input: string | URL, init?: RequestInit) => Promise<Response>

async function requestToken(action: string, body: URLSearchParams, fetchImpl: FetchImpl): Promise<LinearTokenResponse> {
  const response = await fetchImpl(LINEAR_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!response.ok) {
    throw new Error(`Linear token ${action} failed: ${response.status}`)
  }
  return tokenResponseSchema.parse(await response.json())
}

export async function exchangeCodeForToken(
  env: LinearEnv,
  code: string,
  fetchImpl: FetchImpl = fetch
): Promise<LinearTokenResponse> {
  return requestToken(
    'exchange',
    new URLSearchParams({
      client_id: env.LINEAR_OAUTH_CLIENT_ID,
      client_secret: env.LINEAR_OAUTH_CLIENT_SECRET,
      redirect_uri: env.LINEAR_OAUTH_REDIRECT_URI,
      code,
      grant_type: 'authorization_code',
    }),
    fetchImpl
  )
}

export async function refreshAccessToken(
  env: LinearEnv,
  refreshToken: string,
  fetchImpl: FetchImpl = fetch
): Promise<LinearTokenResponse> {
  return requestToken(
    'refresh',
    new URLSearchParams({
      client_id: env.LINEAR_OAUTH_CLIENT_ID,
      client_secret: env.LINEAR_OAUTH_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
    fetchImpl
  )
}
