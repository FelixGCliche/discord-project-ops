import { createWorkerFetch, LinearTokenStore } from 'cloudflare'
import { type BotEnv } from './env'
import { linearOAuthHandler } from './linearOAuthHandler'

export { LinearTokenStore }

const fetchHandler = createWorkerFetch<BotEnv>({
  ...linearOAuthHandler,
})

export default {
  fetch: fetchHandler,
}
