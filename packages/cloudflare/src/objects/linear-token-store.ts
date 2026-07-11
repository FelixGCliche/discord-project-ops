import { DurableObject } from 'cloudflare:workers'

export type AuthState = {
  accessToken: string
  workspaceName: string
  authorizedAt: string
  scopes: string[]
}

export class LinearTokenStore extends DurableObject {
  async storeAuth(token: string, workspaceName: string, scopes: string[]): Promise<void> {
    await this.ctx.storage.put<AuthState>('auth', {
      accessToken: token,
      workspaceName,
      authorizedAt: new Date().toISOString(),
      scopes,
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
