import { createWorkerFetch, LinearTokenStore } from 'cloudflare'
import { type BotEnv } from './env'
import { linearOAuthHandler } from './handler/linear-oauth'

export { LinearTokenStore }

const fetchHandler = createWorkerFetch<BotEnv>({
  ...linearOAuthHandler,
})

export default {
  fetch: fetchHandler,
}
