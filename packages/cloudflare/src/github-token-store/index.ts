import { DurableObject } from 'cloudflare:workers'

export type AuthState = {
  accessToken: string
  refreshToken: string
  expiresAt: string | null
  refreshTokenExpiresAt: string | null
  login: string
  authorizedAt: string
  scopes: string[]
}

export class GithubTokenStore extends DurableObject {
  async storeAuth(
    accessToken: string,
    refreshToken: string,
    expiresIn: number | null,
    refreshTokenExpiresIn: number | null,
    login: string,
    scopes: string[]
  ): Promise<void> {
    await this.ctx.storage.put<AuthState>('auth', {
      accessToken,
      refreshToken,
      expiresAt: expiresIn == null ? null : new Date(Date.now() + expiresIn * 1000).toISOString(),
      refreshTokenExpiresAt:
        refreshTokenExpiresIn == null ? null : new Date(Date.now() + refreshTokenExpiresIn * 1000).toISOString(),
      login,
      authorizedAt: new Date().toISOString(),
      scopes,
    })
  }

  async updateTokens(
    accessToken: string,
    refreshToken: string,
    expiresIn: number | null,
    refreshTokenExpiresIn: number | null
  ): Promise<void> {
    const existing = await this.ctx.storage.get<AuthState>('auth')
    if (!existing) {
      throw new Error('Cannot update tokens before the initial GitHub authorization')
    }
    await this.ctx.storage.put<AuthState>('auth', {
      ...existing,
      accessToken,
      refreshToken,
      expiresAt: expiresIn == null ? null : new Date(Date.now() + expiresIn * 1000).toISOString(),
      refreshTokenExpiresAt:
        refreshTokenExpiresIn == null ? null : new Date(Date.now() + refreshTokenExpiresIn * 1000).toISOString(),
    })
  }

  async getAuth(): Promise<AuthState | null> {
    const result = await this.ctx.storage.get<AuthState>('auth')
    return result ?? null
  }

  async clearAuth(): Promise<void> {
    await this.ctx.storage.delete('auth')
  }
}
