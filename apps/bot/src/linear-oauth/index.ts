import { LinearClient, exchangeCodeForToken, getAuthorizationUrl, type FetchImpl } from 'linear'
import { type RouteHandlers } from 'cloudflare'
import { parseEnv, timingSafeEqual, verifySignedState } from 'core'
import { botEnvSchema, type BotEnv } from '../env'

export function createLinearOAuthHandler(fetchImpl: FetchImpl = fetch): RouteHandlers<BotEnv> {
  return {
    // BOT_ADMIN_TOKEN travels as a query param here so this link can be shared/clicked directly;
    // treat it like a bearer secret (it can end up in browser history or access logs).
    '/oauth/authorize': async (request, env) => {
      parseEnv(botEnvSchema, env)
      const url = new URL(request.url)
      if (!timingSafeEqual(url.searchParams.get('token') ?? '', env.BOT_ADMIN_TOKEN)) {
        return new Response('Unauthorized', { status: 401 })
      }
      const authUrl = await getAuthorizationUrl(env)
      return Response.redirect(authUrl, 302)
    },
    '/oauth/callback': async (request, env) => {
      parseEnv(botEnvSchema, env)
      const url = new URL(request.url)
      const code = url.searchParams.get('code')
      const state = url.searchParams.get('state')
      if (!code || !state) {
        return new Response('Missing code or state', { status: 400 })
      }

      const isValid = await verifySignedState(env.LINEAR_OAUTH_STATE_SECRET, state)
      if (!isValid) {
        return new Response('Invalid or expired state', { status: 400 })
      }

      const token = await exchangeCodeForToken(env, code, fetchImpl)
      const client = new LinearClient({ accessToken: token.access_token })
      const organization = await client.organization

      const id = env.LINEAR_TOKEN_STORE.idFromName('linear-token-store')
      const stub = env.LINEAR_TOKEN_STORE.get(id)
      await stub.storeAuth(
        token.access_token,
        token.refresh_token,
        token.expires_in,
        organization.name,
        token.scope.split(',')
      )

      return new Response('Linear connected successfully. You can close this tab.')
    },
  }
}

export const linearOAuthHandler: RouteHandlers<BotEnv> = createLinearOAuthHandler()
