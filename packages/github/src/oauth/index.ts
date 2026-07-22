import { z } from 'zod'
import { createOAuthClient, type FetchImpl } from 'core'
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

export type { FetchImpl } from 'core'

const client = createOAuthClient<GithubTokenResponse>({
  provider: 'GitHub',
  tokenUrl: GITHUB_TOKEN_URL,
  tokenResponseSchema,
  errorBodySchema: tokenErrorSchema,
})

export async function exchangeCodeForToken(
  env: GithubEnv,
  code: string,
  fetchImpl: FetchImpl = fetch
): Promise<GithubTokenResponse> {
  return client.exchangeCodeForToken(
    {
      client_id: env.GITHUB_OAUTH_CLIENT_ID,
      client_secret: env.GITHUB_OAUTH_CLIENT_SECRET,
      redirect_uri: env.GITHUB_OAUTH_REDIRECT_URI,
      code,
    },
    fetchImpl
  )
}

export async function refreshAccessToken(
  env: GithubEnv,
  refreshToken: string,
  fetchImpl: FetchImpl = fetch
): Promise<GithubTokenResponse> {
  return client.refreshAccessToken(
    {
      client_id: env.GITHUB_OAUTH_CLIENT_ID,
      client_secret: env.GITHUB_OAUTH_CLIENT_SECRET,
      refresh_token: refreshToken,
    },
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
