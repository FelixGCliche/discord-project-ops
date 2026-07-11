import { LinearClient, exchangeCodeForToken, getAuthorizationUrl, verifySignedState } from 'linear/src/index'
import { createWorkerFetch, LinearTokenStore } from 'cloudflare/src/index'
import type { BotEnv } from './env'

export { LinearTokenStore }

type Env = BotEnv & { LINEAR_TOKEN_STORE: DurableObjectNamespace<LinearTokenStore> }

const fetchHandler = createWorkerFetch<Env>({
  '/oauth/authorize': async (_request, env) => {
    const url = await getAuthorizationUrl(env)
    return Response.redirect(url, 302)
  },
  '/oauth/callback': async (request, env) => {
    const url = new URL(request.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    if (!code || !state) {
      return new Response('Missing code or state', { status: 400 })
    }

    const isValid = await verifySignedState(env.LINEAR_OAUTH_CLIENT_SECRET, state)
    if (!isValid) {
      return new Response('Invalid or expired state', { status: 400 })
    }

    const token = await exchangeCodeForToken(env, code)
    const client = new LinearClient({ accessToken: token.access_token })
    const organization = await client.organization

    const id = env.LINEAR_TOKEN_STORE.idFromName('linear-token-store')
    const stub = env.LINEAR_TOKEN_STORE.get(id)
    await stub.storeAuth(token.access_token, organization.name, token.scope.split(','))

    return new Response('Linear connected successfully. You can close this tab.')
  },
})

export default {
  fetch: fetchHandler,
}
