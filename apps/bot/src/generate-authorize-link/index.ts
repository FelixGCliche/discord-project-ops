import { createSignedState, parseEnv } from 'core'
import { botEnvSchema } from '../env'

export function buildAuthorizeUrl(redirectUri: string, token: string): string {
  const url = new URL('/oauth/authorize', redirectUri)
  url.searchParams.set('token', token)
  return url.toString()
}

async function main() {
  const env = parseEnv(botEnvSchema, process.env)
  const token = await createSignedState(env.LINEAR_OAUTH_STATE_SECRET)
  console.log(buildAuthorizeUrl(env.LINEAR_OAUTH_REDIRECT_URI, token))
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
