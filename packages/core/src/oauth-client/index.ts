import type { z } from 'zod'

export type FetchImpl = (input: string | URL, init?: RequestInit) => Promise<Response>

export type OAuthClientConfig<TTokenResponse> = {
  /** Human-readable provider name used in thrown error messages, e.g. "GitHub", "Linear". */
  provider: string
  tokenUrl: string
  tokenResponseSchema: z.ZodType<TTokenResponse>
  /**
   * Some providers (e.g. GitHub's classic OAuth token endpoint) return HTTP 200 even when the
   * exchange/refresh fails, with `{ error, error_description }` in the body instead of a non-2xx
   * status. Pass a schema for that shape to opt into checking for it before parsing the success
   * schema. Omit it for providers that use real HTTP status codes for errors (e.g. Linear) — for
   * those, a non-2xx status alone is sufficient and this check is skipped entirely.
   */
  errorBodySchema?: z.ZodType<{ error: string; error_description?: string }>
}

export type OAuthClient<TTokenResponse> = {
  exchangeCodeForToken(params: Record<string, string>, fetchImpl?: FetchImpl): Promise<TTokenResponse>
  refreshAccessToken(params: Record<string, string>, fetchImpl?: FetchImpl): Promise<TTokenResponse>
}

export function createOAuthClient<TTokenResponse>(
  config: OAuthClientConfig<TTokenResponse>
): OAuthClient<TTokenResponse> {
  async function requestToken(action: string, body: URLSearchParams, fetchImpl: FetchImpl): Promise<TTokenResponse> {
    const response = await fetchImpl(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body,
    })
    if (!response.ok) {
      throw new Error(`${config.provider} token ${action} failed: ${response.status}`)
    }
    const json = await response.json()
    if (config.errorBodySchema) {
      const errorParse = config.errorBodySchema.safeParse(json)
      if (errorParse.success) {
        const { error, error_description } = errorParse.data
        throw new Error(
          `${config.provider} token ${action} failed: ${error}${error_description ? ' - ' + error_description : ''}`
        )
      }
    }
    return config.tokenResponseSchema.parse(json)
  }

  return {
    exchangeCodeForToken(params: Record<string, string>, fetchImpl: FetchImpl = fetch): Promise<TTokenResponse> {
      return requestToken('exchange', new URLSearchParams({ ...params, grant_type: 'authorization_code' }), fetchImpl)
    },
    refreshAccessToken(params: Record<string, string>, fetchImpl: FetchImpl = fetch): Promise<TTokenResponse> {
      return requestToken('refresh', new URLSearchParams({ ...params, grant_type: 'refresh_token' }), fetchImpl)
    },
  }
}
