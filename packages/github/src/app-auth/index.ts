import { importPKCS8, SignJWT } from 'jose'
import { z } from 'zod'
import { HttpError } from 'core'
import type { GithubEnv } from '../env'

export type FetchImpl = (input: string | URL, init?: RequestInit) => Promise<Response>

const CLOCK_SKEW_BUFFER_SECONDS = 60
const JWT_LIFETIME_SECONDS = 10 * 60

// By the time this runs, GITHUB_APP_PRIVATE_KEY_BASE64 has already been converted to PKCS#8
// PEM by a separate one-time script — decoding PKCS#1 keys is not handled here.
export async function createAppJwt(env: GithubEnv, now: () => number = Date.now): Promise<string> {
  const pem = Buffer.from(env.GITHUB_APP_PRIVATE_KEY_BASE64, 'base64').toString('utf-8')
  const privateKey = await importPKCS8(pem, 'RS256')

  const iat = Math.floor(now() / 1000) - CLOCK_SKEW_BUFFER_SECONDS
  const exp = iat + CLOCK_SKEW_BUFFER_SECONDS + JWT_LIFETIME_SECONDS

  return new SignJWT({ iss: env.GITHUB_APP_ID })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuedAt(iat)
    .setExpirationTime(exp)
    .sign(privateKey)
}

const installationTokenResponseSchema = z.object({
  token: z.string().min(1),
  expires_at: z.string(),
  permissions: z.record(z.string(), z.string()).optional(),
})

export type InstallationTokenResponse = z.infer<typeof installationTokenResponseSchema>

export async function createInstallationAccessToken(
  env: GithubEnv,
  installationId: string,
  fetchImpl: FetchImpl = fetch
): Promise<InstallationTokenResponse> {
  const jwt = await createAppJwt(env)
  const response = await fetchImpl(`https://api.github.com/app/installations/${installationId}/access_tokens`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwt}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'discord-project-ops',
    },
  })
  if (!response.ok) {
    throw new HttpError(502, `GitHub installation token exchange failed: ${response.status}`)
  }
  return installationTokenResponseSchema.parse(await response.json())
}

const installationSchema = z.object({
  id: z.number(),
  account: z.object({ login: z.string() }).passthrough(),
})

export async function listAppInstallations(
  env: GithubEnv,
  fetchImpl: FetchImpl = fetch
): Promise<Array<{ id: number; account: { login: string } }>> {
  const jwt = await createAppJwt(env)
  const response = await fetchImpl('https://api.github.com/app/installations', {
    headers: {
      Authorization: `Bearer ${jwt}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'discord-project-ops',
    },
  })
  if (!response.ok) {
    throw new HttpError(502, `GitHub installation list failed: ${response.status}`)
  }
  return z.array(installationSchema).parse(await response.json())
}
