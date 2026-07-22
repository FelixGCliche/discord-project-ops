import { z } from 'zod'
import type { GithubEnv } from '../env'

const GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize'
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token'
const GITHUB_USER_URL = 'https://api.github.com/user'

const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.string().min(1),
  scope: z.string(),
  expires_in: z.number().optional(),
  refresh_token: z.string().optional(),
  refresh_token_expires_in: z.number().optional(),
})

export type GithubTokenResponse = z.infer<typeof tokenResponseSchema>

const tokenErrorSchema = z.object({
  error: z.string(),
  error_description: z.string().optional(),
})

const userResponseSchema = z.object({
  login: z.string().min(1),
})

// GitHub Apps get their permissions from the App's own configuration, not from an OAuth
// scope grant, so unlike Linear there is no `scope` param here.
export function getAuthorizationUrl(env: GithubEnv, state: string): string {
  const params = new URLSearchParams({
    client_id: env.GITHUB_OAUTH_CLIENT_ID,
    redirect_uri: env.GITHUB_OAUTH_REDIRECT_URI,
    state,
  })
  return `${GITHUB_AUTHORIZE_URL}?${params.toString()}`
}

export type FetchImpl = (input: string | URL, init?: RequestInit) => Promise<Response>

async function requestToken(action: string, body: URLSearchParams, fetchImpl: FetchImpl): Promise<GithubTokenResponse> {
  const response = await fetchImpl(GITHUB_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body,
  })
  if (!response.ok) {
    throw new Error(`GitHub token ${action} failed: ${response.status}`)
  }
  const json = await response.json()
  // GitHub's token endpoint returns HTTP 200 even on failure, with `{ error,
  // error_description }` in the body, so this must be checked before schema validation.
  const errorParse = tokenErrorSchema.safeParse(json)
  if (errorParse.success) {
    const { error, error_description } = errorParse.data
    throw new Error(`GitHub token ${action} failed: ${error}${error_description ? ' - ' + error_description : ''}`)
  }
  return tokenResponseSchema.parse(json)
}

export async function exchangeCodeForToken(
  env: GithubEnv,
  code: string,
  fetchImpl: FetchImpl = fetch
): Promise<GithubTokenResponse> {
  return requestToken(
    'exchange',
    new URLSearchParams({
      client_id: env.GITHUB_OAUTH_CLIENT_ID,
      client_secret: env.GITHUB_OAUTH_CLIENT_SECRET,
      redirect_uri: env.GITHUB_OAUTH_REDIRECT_URI,
      code,
      grant_type: 'authorization_code',
    }),
    fetchImpl
  )
}

export async function refreshAccessToken(
  env: GithubEnv,
  refreshToken: string,
  fetchImpl: FetchImpl = fetch
): Promise<GithubTokenResponse> {
  return requestToken(
    'refresh',
    new URLSearchParams({
      client_id: env.GITHUB_OAUTH_CLIENT_ID,
      client_secret: env.GITHUB_OAUTH_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
    fetchImpl
  )
}

export async function fetchAuthenticatedLogin(accessToken: string, fetchImpl: FetchImpl = fetch): Promise<string> {
  const response = await fetchImpl(GITHUB_USER_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
    },
  })
  if (!response.ok) {
    throw new Error(`GitHub user lookup failed: ${response.status}`)
  }
  const parsed = userResponseSchema.parse(await response.json())
  return parsed.login
}
