import { createWorkerFetch } from 'cloudflare'
import { LinearTokenStore } from 'cloudflare/linear-token-store'
import { GithubTokenStore } from 'cloudflare/github-token-store'
import { type BotEnv } from './env'
import { linearOAuthHandler } from './linear-oauth'

export { LinearTokenStore, GithubTokenStore }

const fetchHandler = createWorkerFetch<BotEnv>({
  ...linearOAuthHandler,
})

export default {
  fetch: fetchHandler,
}
