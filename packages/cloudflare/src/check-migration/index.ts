import { $ } from 'bun'
import { parse } from 'jsonc-parser'

const WRANGLER_CONFIG_PATH = 'apps/bot/wrangler.jsonc'

interface WranglerMigration {
  tag: string
}

interface WranglerConfig {
  name?: string
  migrations?: WranglerMigration[]
}

interface CloudflareWorkerScript {
  id: string
  migration_tag?: string
}

export async function readMigrationTags(ref: string | undefined): Promise<Set<string>> {
  if (!ref || /^0+$/.test(ref)) return new Set()

  // `git show <ref>:<path>` reports a missing path the same way whether the
  // ref itself is bogus or just predates the file, so the ref has to be
  // confirmed to actually resolve to an object before that ambiguity can be
  // trusted to mean "file didn't exist yet". `git rev-parse --verify` isn't
  // enough here: it accepts any well-formed 40-char hex string as-is without
  // checking the object database, so `cat-file -e` is used instead.
  const refCheck = await $`git cat-file -e ${ref}`.nothrow().quiet()
  if (refCheck.exitCode !== 0) {
    throw new Error(`BASE_SHA "${ref}" does not resolve to an object in this repository.`)
  }

  const result = await $`git show ${ref}:${WRANGLER_CONFIG_PATH}`.nothrow().quiet()
  if (result.exitCode !== 0) {
    // Ref is valid; the path just didn't exist at this ref yet.
    return new Set()
  }

  const config = parse(result.stdout.toString()) as WranglerConfig | undefined
  return new Set((config?.migrations ?? []).map((m) => m.tag))
}

export async function fetchLiveMigrationTag(
  accountId: string,
  apiToken: string,
  scriptName: string
): Promise<string | undefined> {
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts`, {
    headers: { Authorization: `Bearer ${apiToken}` },
  })
  if (!response.ok) {
    throw new Error(`Cloudflare API returned ${response.status} ${response.statusText}`)
  }
  const body = (await response.json()) as { result?: CloudflareWorkerScript[] }
  return body.result?.find((script) => script.id === scriptName)?.migration_tag
}

export async function determineHasMigration(
  newTags: string[],
  headConfig: WranglerConfig | undefined,
  env: Record<string, string | undefined>
): Promise<boolean> {
  if (newTags.length === 0) return false

  const latestTag = headConfig?.migrations?.at(-1)?.tag
  const { CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN } = env

  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN || !headConfig?.name || !latestTag) {
    console.log('Missing Cloudflare credentials or script name — skipping live migration_tag check.')
    return true
  }

  try {
    const liveMigrationTag = await fetchLiveMigrationTag(CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, headConfig.name)
    if (liveMigrationTag === latestTag) {
      console.log(
        `Migration tag "${latestTag}" already applied live (migration_tag from Cloudflare) — skipping redundant deploy.`
      )
      return false
    }
    return true
  } catch (err) {
    console.warn(`Failed to check live migration_tag from Cloudflare, falling back to git diff result: ${err}`)
    return true
  }
}

async function main() {
  const baseSha = process.env.BASE_SHA
  const baseTags = await readMigrationTags(baseSha)

  const headResult = await $`git show HEAD:${WRANGLER_CONFIG_PATH}`.quiet()
  const headConfig = parse(headResult.stdout.toString()) as WranglerConfig | undefined
  const headTags = new Set((headConfig?.migrations ?? []).map((m) => m.tag))

  const newTags = [...headTags].filter((tag) => !baseTags.has(tag))

  console.log(`Base ref: ${baseSha ?? '(none)'}`)
  console.log(`Base migration tags: ${[...baseTags].join(', ') || '(none)'}`)
  console.log(`Head migration tags: ${[...headTags].join(', ') || '(none)'}`)

  const hasMigration = await determineHasMigration(newTags, headConfig, process.env)

  console.log(
    hasMigration
      ? `New migration tag(s) detected: ${newTags.join(', ')} — will run wrangler deploy.`
      : 'No new migration tags (or already applied live) — leaving deploy to the Cloudflare Git integration.'
  )

  const githubOutput = process.env.GITHUB_OUTPUT
  if (githubOutput) {
    await $`echo has-migration=${String(hasMigration)} >> ${githubOutput}`.quiet()
  }
}

if (import.meta.main) {
  await main()
}
