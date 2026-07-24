import { createSignedState, parseEnv } from 'core'
import { githubEnvSchema } from 'github'
import { buildInstallUrl } from '../links'

export { buildInstallUrl }

async function main() {
  const appSlug = process.env.GITHUB_APP_SLUG ?? process.argv[2]
  if (!appSlug) {
    throw new Error('GITHUB_APP_SLUG env var or a CLI arg is required')
  }
  const env = parseEnv(githubEnvSchema, process.env)
  const token = await createSignedState(env.GITHUB_OAUTH_STATE_SECRET)
  console.log(buildInstallUrl(appSlug, token))
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
