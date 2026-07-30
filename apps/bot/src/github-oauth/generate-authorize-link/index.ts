import { createSignedState, parseEnv } from 'core'
import { githubEnvSchema } from 'github'
import { buildAuthorizeUrl, GITHUB_OAUTH_STATE_PURPOSE } from '../links'

export { buildAuthorizeUrl }

async function main() {
  const env = parseEnv(githubEnvSchema, process.env)
  const token = await createSignedState(env.GITHUB_OAUTH_STATE_SECRET, GITHUB_OAUTH_STATE_PURPOSE)
  console.log(buildAuthorizeUrl(env.GITHUB_OAUTH_REDIRECT_URI, token))
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
