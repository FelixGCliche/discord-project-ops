import { createWorkerFetch } from 'cloudflare'
import { LinearTokenStore } from 'cloudflare/linear-token-store'
import { GithubTokenStore } from 'cloudflare/github-token-store'
import { GithubInstallationStore } from 'cloudflare/github-installation-store'
import { type BotEnv } from './env'
import { linearOAuthHandler } from './linear-oauth'
import { githubOAuthHandler } from './github-oauth'

export { LinearTokenStore, GithubTokenStore, GithubInstallationStore }

const fetchHandler = createWorkerFetch<BotEnv>({
  ...linearOAuthHandler,
  ...githubOAuthHandler,
})

export default {
  fetch: fetchHandler,
}
