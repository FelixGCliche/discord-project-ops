import { DurableObject } from 'cloudflare:workers'

export type AuthState = {
  accessToken: string
  refreshToken: string
  expiresAt: string
  workspaceName: string
  authorizedAt: string
  scopes: string[]
}

export class LinearTokenStore extends DurableObject {
  async storeAuth(
    accessToken: string,
    refreshToken: string,
    expiresIn: number,
    workspaceName: string,
    scopes: string[]
  ): Promise<void> {
    await this.ctx.storage.put<AuthState>('auth', {
      accessToken,
      refreshToken,
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      workspaceName,
      authorizedAt: new Date().toISOString(),
      scopes,
    })
  }

  async updateTokens(accessToken: string, refreshToken: string, expiresIn: number): Promise<void> {
    const existing = await this.ctx.storage.get<AuthState>('auth')
    if (!existing) {
      throw new Error('Cannot update tokens before the initial Linear authorization')
    }
    await this.ctx.storage.put<AuthState>('auth', {
      ...existing,
      accessToken,
      refreshToken,
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
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
