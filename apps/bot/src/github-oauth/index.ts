import {
  getAuthorizationUrl,
  exchangeCodeForToken,
  fetchAuthenticatedLogin,
  listAppInstallations,
  type FetchImpl,
} from 'github'
import { type RouteHandlers } from 'cloudflare'
import { parseEnv, verifySignedState } from 'core'
import { botEnvSchema, type BotEnv } from '../env'

export function createGithubOAuthHandler(fetchImpl: FetchImpl = fetch): RouteHandlers<BotEnv> {
  return {
    // The token travels as a query param here so this link can be shared/clicked directly;
    // treat it like a bearer secret (it can end up in browser history or access logs). It's a
    // short-lived signed-state token minted out-of-band via `bun run oauth:github`,
    // not a static secret.
    '/github/oauth/authorize': async (request, env) => {
      parseEnv(botEnvSchema, env)
      const url = new URL(request.url)
      const token = url.searchParams.get('token') ?? ''
      if (!(await verifySignedState(env.GITHUB_OAUTH_STATE_SECRET, token))) {
        return new Response('Unauthorized', { status: 401 })
      }
      const authUrl = getAuthorizationUrl(env, token)
      return Response.redirect(authUrl, 302)
    },
    '/github/oauth/callback': async (request, env) => {
      parseEnv(botEnvSchema, env)
      const url = new URL(request.url)
      const code = url.searchParams.get('code')
      const state = url.searchParams.get('state')
      if (!code || !state) {
        return new Response('Missing code or state', { status: 400 })
      }

      const isValid = await verifySignedState(env.GITHUB_OAUTH_STATE_SECRET, state)
      if (!isValid) {
        return new Response('Invalid or expired state', { status: 400 })
      }

      const token = await exchangeCodeForToken(env, code, fetchImpl)
      const login = await fetchAuthenticatedLogin(token.access_token, fetchImpl)

      const id = env.GITHUB_TOKEN_STORE.idFromName('github-token-store')
      const stub = env.GITHUB_TOKEN_STORE.get(id)
      await stub.storeAuth(
        token.access_token,
        token.refresh_token ?? '',
        token.expires_in ?? 0,
        token.refresh_token_expires_in ?? 0,
        login,
        token.scope.split(',').filter(Boolean)
      )

      return new Response('GitHub connected successfully. You can close this tab.')
    },
    // GitHub redirects here after a human installs (or updates) the App on an org/repo, with
    // ?installation_id=X&setup_action=install|update. Both actions are handled identically —
    // they simply (re)store the current installation. Since this App's manifest sets
    // `public: false`, listAppInstallations() can only ever return the App owner's own
    // installations, so requiring installation_id to appear in that list is both a
    // correctness check and closes the hole where an unauthenticated caller could otherwise
    // overwrite the single global GithubInstallationStore with an arbitrary/unverified id.
    '/github/install': async (request, env) => {
      parseEnv(botEnvSchema, env)
      const url = new URL(request.url)
      const installationId = url.searchParams.get('installation_id')
      if (!installationId) {
        return new Response('Missing installation_id', { status: 400 })
      }

      const installations = await listAppInstallations(env, fetchImpl)
      const installation = installations.find((entry) => entry.id === Number(installationId))
      if (!installation) {
        return new Response('Unknown installation_id', { status: 404 })
      }

      const id = env.GITHUB_INSTALLATION_STORE.idFromName('github-installation-store')
      const stub = env.GITHUB_INSTALLATION_STORE.get(id)
      await stub.storeInstallation(installationId, installation.account.login)

      return new Response('GitHub App installed successfully. You can close this tab.')
    },
  }
}

export const githubOAuthHandler: RouteHandlers<BotEnv> = createGithubOAuthHandler()
