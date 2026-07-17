import { createWorkerFetch } from 'cloudflare'
import { LinearTokenStore } from 'cloudflare/linear-token-store'
import { type BotEnv } from './env'
import { linearOAuthHandler } from './linear-oauth'

export { LinearTokenStore }

const fetchHandler = createWorkerFetch<BotEnv>({
  ...linearOAuthHandler,
})

export default {
  fetch: fetchHandler,
}
