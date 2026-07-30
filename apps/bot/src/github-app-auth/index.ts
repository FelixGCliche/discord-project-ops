import { createInstallationAccessToken, type FetchImpl } from 'github'
import type { BotEnv } from '../env'

const EXPIRY_SAFETY_MARGIN_MS = 2 * 60 * 1000

export async function getInstallationAccessToken(env: BotEnv, fetchImpl: FetchImpl = fetch): Promise<string> {
  const installationStub = env.GITHUB_INSTALLATION_STORE.get(
    env.GITHUB_INSTALLATION_STORE.idFromName('github-installation-store')
  )
  const installation = await installationStub.getInstallation()
  if (!installation) {
    throw new Error(
      'GitHub App is not installed yet — no installation found. Install the App first (see /github/install).'
    )
  }

  const cached = await installationStub.getCachedInstallationToken()
  if (cached && new Date(cached.expiresAt).getTime() - Date.now() > EXPIRY_SAFETY_MARGIN_MS) {
    return cached.token
  }

  const fresh = await createInstallationAccessToken(env, installation.installationId, fetchImpl)
  await installationStub.cacheInstallationToken(fresh.token, fresh.expires_at)
  return fresh.token
}
