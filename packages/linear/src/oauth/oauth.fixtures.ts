import type { LinearTokenResponse } from './index'

export function buildLinearTokenResponse(overrides: Partial<LinearTokenResponse> = {}): LinearTokenResponse {
  return {
    access_token: 'token-123',
    token_type: 'Bearer',
    scope: 'read,issues:create',
    expires_in: 86399,
    refresh_token: 'refresh-123',
    ...overrides,
  }
}
