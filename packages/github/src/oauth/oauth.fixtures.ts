import type { GithubTokenResponse } from './index'

export function buildGithubTokenResponse(overrides: Partial<GithubTokenResponse> = {}): GithubTokenResponse {
  return {
    access_token: 'token-123',
    token_type: 'bearer',
    scope: '',
    expires_in: 28800,
    refresh_token: 'refresh-123',
    refresh_token_expires_in: 15811200,
    ...overrides,
  }
}
