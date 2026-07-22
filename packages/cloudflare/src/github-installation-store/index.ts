import { DurableObject } from 'cloudflare:workers'

export type InstallationState = {
  installationId: string
  accountLogin: string
  installedAt: string
}

export type CachedInstallationToken = {
  token: string
  expiresAt: string
}

export class GithubInstallationStore extends DurableObject {
  async storeInstallation(installationId: string, accountLogin: string): Promise<void> {
    await this.ctx.storage.put<InstallationState>('installation', {
      installationId,
      accountLogin,
      installedAt: new Date().toISOString(),
    })
  }

  async getInstallation(): Promise<InstallationState | null> {
    const result = await this.ctx.storage.get<InstallationState>('installation')
    return result ?? null
  }

  async clearInstallation(): Promise<void> {
    await this.ctx.storage.delete('installation')
  }

  async cacheInstallationToken(token: string, expiresAt: string): Promise<void> {
    await this.ctx.storage.put<CachedInstallationToken>('installationToken', {
      token,
      expiresAt,
    })
  }

  async getCachedInstallationToken(): Promise<CachedInstallationToken | null> {
    const result = await this.ctx.storage.get<CachedInstallationToken>('installationToken')
    return result ?? null
  }

  async clearCachedInstallationToken(): Promise<void> {
    await this.ctx.storage.delete('installationToken')
  }
}
