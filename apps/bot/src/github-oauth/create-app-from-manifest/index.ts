import { createPrivateKey } from 'node:crypto'
import { z } from 'zod'
import { getWorkerUrl, requireWorkersSubdomain } from 'cloudflare'

// One-time, local-only developer tool: drives GitHub's "App Manifest flow" so creating the
// shared GitHub App only requires one human click (the "Create GitHub App" confirmation on
// github.com), instead of hand-filling every field in the App settings UI. This file is never
// deployed to the Worker -- run it once via `bun run github:create-app`, then throw the output
// into `packages/github/.env` / Cloudflare secrets.

const DEFAULT_APP_NAME = 'Discord Project Ops'
const DEFAULT_LOCAL_PORT = 8842 // deliberately not 8787 (wrangler dev's default port)
const PRODUCTION_WORKER_NAME = 'discord-project-ops'
const STAGING_WORKER_NAME = 'discord-project-ops-staging'
// This project's repo, used as a fallback homepage URL for the manifest's `url` field.
const REPOSITORY_URL = 'https://github.com/FelixGCliche/discord-project-ops'

type GithubAppManifest = {
  name: string
  url: string
  redirect_url: string
  callback_urls: string[]
  setup_url: string
  setup_on_update: boolean
  public: boolean
  default_permissions: Record<string, string>
  default_events: string[]
  request_oauth_on_install: boolean
}

const manifestConversionResponseSchema = z.object({
  id: z.number(),
  client_id: z.string().min(1),
  client_secret: z.string().min(1),
  webhook_secret: z.string().nullable().optional(),
  pem: z.string().min(1),
  slug: z.string().min(1),
})

// `apps/bot/wrangler.jsonc` defines no custom `routes`/domain for either environment, so both
// Workers are only reachable at Cloudflare's default `workers.dev` subdomain -- which is
// account-specific and can't be derived from the repo alone. Set CLOUDFLARE_WORKERS_SUBDOMAIN
// in `packages/cloudflare/.env` (Cloudflare dashboard -> Workers & Pages -> your subdomain).
function getWorkerBaseUrl(workerName: string): string {
  return getWorkerUrl(workerName, requireWorkersSubdomain())
}

// GitHub App manifests accept an array of OAuth `callback_urls` -- one shared App, both
// environments' Workers each need to appear here so either can complete the OAuth exchange.
function buildCallbackUrls(): string[] {
  return [getWorkerBaseUrl(PRODUCTION_WORKER_NAME), getWorkerBaseUrl(STAGING_WORKER_NAME)].map(
    (baseUrl) => `${baseUrl}/github/oauth/callback`
  )
}

// Unlike `callback_urls`, GitHub's manifest schema takes a single `setup_url` string (see
// https://docs.github.com/en/apps/sharing-github-apps/registering-a-github-app-from-a-manifest).
// Since this is one shared App, point it at production; if you also need GitHub's
// post-install redirect to land on staging, edit the App's "Setup URL" by hand afterward under
// https://github.com/settings/apps/<slug> -- this function is the one place to fix if GitHub's
// actual manifest schema turns out to differ from this.
function buildSetupUrl(): string {
  return `${getWorkerBaseUrl(PRODUCTION_WORKER_NAME)}/github/install`
}

function buildManifest(localPort: number): GithubAppManifest {
  const name = process.env.GITHUB_APP_NAME ?? process.argv[2] ?? DEFAULT_APP_NAME
  return {
    name,
    url: REPOSITORY_URL,
    redirect_url: `http://localhost:${localPort}/callback`,
    callback_urls: buildCallbackUrls(),
    setup_url: buildSetupUrl(),
    setup_on_update: true,
    public: false,
    default_permissions: { contents: 'write', pull_requests: 'write', issues: 'write' },
    default_events: [],
    request_oauth_on_install: true,
    // Deliberately no `hook_attributes` -- no webhook consumer exists yet for this App.
  }
}

function escapeHtmlAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function renderManifestForm(manifest: GithubAppManifest, state: string): string {
  const manifestJson = escapeHtmlAttribute(JSON.stringify(manifest))
  const actionUrl = `https://github.com/settings/apps/new?state=${encodeURIComponent(state)}`
  return `<!doctype html>
<html>
  <head><meta charset="utf-8" /><title>Creating GitHub App...</title></head>
  <body>
    <p>Redirecting to GitHub to create the App...</p>
    <form action="${actionUrl}" method="post">
      <input type="hidden" name="manifest" value='${manifestJson}' />
    </form>
    <script>document.forms[0].submit()</script>
  </body>
</html>`
}

function renderDonePage(): string {
  return `<!doctype html>
<html>
  <head><meta charset="utf-8" /><title>Done</title></head>
  <body><p>Done -- check your terminal.</p></body>
</html>`
}

async function convertManifestCode(code: string) {
  const response = await fetch(`https://api.github.com/app-manifests/${code}/conversions`, {
    method: 'POST',
    headers: { Accept: 'application/vnd.github+json' },
  })

  if (!response.ok) {
    throw new Error(`GitHub manifest conversion failed: ${response.status} ${await response.text()}`)
  }

  return manifestConversionResponseSchema.parse(await response.json())
}

function convertPkcs1ToPkcs8Base64(pkcs1Pem: string): string {
  // GitHub hands back the App's private key as PKCS#1 (`-----BEGIN RSA PRIVATE KEY-----`).
  // node:crypto auto-detects the PEM format on import, so we just re-export as PKCS#8.
  const pkcs8Pem = createPrivateKey(pkcs1Pem).export({ type: 'pkcs8', format: 'pem' })
  return Buffer.from(pkcs8Pem.toString()).toString('base64')
}

async function handleCallback(url: URL, expectedState: string): Promise<Response> {
  const code = url.searchParams.get('code')
  const returnedState = url.searchParams.get('state')

  if (returnedState !== expectedState) {
    return new Response('Invalid or missing "state" parameter on GitHub redirect.', { status: 400 })
  }

  if (!code) {
    return new Response('Missing "code" query parameter on GitHub redirect.', { status: 400 })
  }

  const result = await convertManifestCode(code)
  const privateKeyBase64 = convertPkcs1ToPkcs8Base64(result.pem)

  console.log('\nGitHub App created. Paste these into packages/github/.env (or push as Cloudflare secrets):\n')
  console.log(`GITHUB_APP_ID=${result.id}`)
  console.log(`GITHUB_OAUTH_CLIENT_ID=${result.client_id}`)
  console.log(`GITHUB_OAUTH_CLIENT_SECRET=${result.client_secret}`)
  console.log(`GITHUB_APP_PRIVATE_KEY_BASE64=${privateKeyBase64}`)
  console.log('\nFor your own records (not part of the env schema):\n')
  console.log(`slug=${result.slug}`)
  console.log(`webhook_secret=${result.webhook_secret ?? '(none)'}`)
  console.log(
    `\nReminder: go to https://github.com/settings/apps/${result.slug} and manually enable "Expire user ` +
      "tokens\" under the App's General settings -- this isn't settable via the manifest JSON, and is " +
      'required for refresh tokens to ever be issued.\n'
  )

  return new Response(renderDonePage(), { headers: { 'content-type': 'text/html; charset=utf-8' } })
}

async function main() {
  const port = Number(process.env.GITHUB_APP_MANIFEST_PORT ?? DEFAULT_LOCAL_PORT)
  const state = crypto.randomUUID()
  const manifest = buildManifest(port)

  Bun.serve({
    port,
    async fetch(request) {
      const url = new URL(request.url)

      if (url.pathname === '/callback') {
        const response = await handleCallback(url, state)
        // Let the response flush to the browser before the process exits.
        setTimeout(() => process.exit(0), 250)
        return response
      }

      if (url.pathname === '/') {
        return new Response(renderManifestForm(manifest, state), {
          headers: { 'content-type': 'text/html; charset=utf-8' },
        })
      }

      return new Response('Not found', { status: 404 })
    },
  })

  console.log(`Open this URL in your browser to create the GitHub App:\n\n  http://localhost:${port}/\n`)
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
