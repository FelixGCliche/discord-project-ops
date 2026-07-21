import { $ } from 'bun'
import { parse } from 'jsonc-parser'

const WRANGLER_CONFIG_PATH = 'apps/bot/wrangler.jsonc'
const ALLOWED_PREFIXES = ['packages/cloudflare/src/']

// A migration is inert unless the Worker entrypoint re-exports the class and the package
// exposes it, so these two files are part of the migration rather than unrelated changes.
const ALLOWED_FILES = new Set([WRANGLER_CONFIG_PATH, 'apps/bot/src/index.ts', 'packages/cloudflare/package.json'])

interface WranglerMigration {
  tag: string
}

interface WranglerConfig {
  migrations?: WranglerMigration[]
}

export async function readMigrationTags(ref: string): Promise<Set<string>> {
  const result = await $`git show ${ref}:${WRANGLER_CONFIG_PATH}`.nothrow().quiet()
  if (result.exitCode !== 0) return new Set()

  const config = parse(result.stdout.toString()) as WranglerConfig | undefined
  return new Set((config?.migrations ?? []).map((m) => m.tag))
}

export function findDisallowedFiles(changedFiles: string[]): string[] {
  return changedFiles.filter(
    (file) => !ALLOWED_FILES.has(file) && !ALLOWED_PREFIXES.some((prefix) => file.startsWith(prefix))
  )
}

async function main() {
  const baseSha = process.env.BASE_SHA
  if (!baseSha) throw new Error('BASE_SHA must be set')

  const baseTags = await readMigrationTags(baseSha)
  const headTags = await readMigrationTags('HEAD')
  const newTags = [...headTags].filter((tag) => !baseTags.has(tag))

  if (newTags.length === 0) {
    console.log('No new migration tags in this PR — skipping isolation check.')
    return
  }

  const diffResult = await $`git diff --name-only ${baseSha} HEAD`.quiet()
  const changedFiles = diffResult.stdout.toString().trim().split('\n').filter(Boolean)

  const disallowed = findDisallowedFiles(changedFiles)
  if (disallowed.length > 0) {
    console.error(
      [
        `New migration tag(s) detected (${newTags.join(', ')}), but this PR also touches files outside`,
        `${[...ALLOWED_FILES].join(', ')} and packages/cloudflare/src/**:`,
        ...disallowed.map((file) => `  - ${file}`),
        '',
        'Durable Object lifecycle changes are atomic and irreversible, so Cloudflare recommends deploying',
        'them independently of other code changes:',
        'https://developers.cloudflare.com/workers/versions-and-deployments/gradual-deployments/with-durable-objects/#durable-object-class-lifecycle-changes',
        '',
        'Split this PR so the migration lands on its own, containing only the wrangler.jsonc change, the new',
        'Durable Object class source, and the entrypoint/package export wiring it needs.',
      ].join('\n')
    )
    process.exit(1)
  }

  console.log(`New migration tag(s) detected (${newTags.join(', ')}) — PR is isolated to the migration. OK.`)
}

if (import.meta.main) {
  await main()
}
