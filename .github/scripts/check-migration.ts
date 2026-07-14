import { execFileSync } from 'node:child_process'
import { appendFileSync } from 'node:fs'
import { parse } from 'jsonc-parser'

const WRANGLER_CONFIG_PATH = 'apps/bot/wrangler.jsonc'

interface WranglerMigration {
  tag: string
}

interface WranglerConfig {
  migrations?: WranglerMigration[]
}

function readMigrationTags(ref: string | undefined): Set<string> {
  if (!ref || /^0+$/.test(ref)) return new Set()

  let contents: string
  try {
    contents = execFileSync('git', ['show', `${ref}:${WRANGLER_CONFIG_PATH}`], {
      encoding: 'utf-8',
    })
  } catch {
    // File didn't exist at this ref yet.
    return new Set()
  }

  const config = parse(contents) as WranglerConfig | undefined
  return new Set((config?.migrations ?? []).map((m) => m.tag))
}

const baseSha = process.env.BASE_SHA
const baseTags = readMigrationTags(baseSha)
const headConfig = parse(execFileSync('git', ['show', `HEAD:${WRANGLER_CONFIG_PATH}`], { encoding: 'utf-8' })) as
  | WranglerConfig
  | undefined
const headTags = new Set((headConfig?.migrations ?? []).map((m) => m.tag))

const newTags = [...headTags].filter((tag) => !baseTags.has(tag))
const hasMigration = newTags.length > 0

console.log(`Base ref: ${baseSha ?? '(none)'}`)
console.log(`Base migration tags: ${[...baseTags].join(', ') || '(none)'}`)
console.log(`Head migration tags: ${[...headTags].join(', ') || '(none)'}`)
console.log(
  hasMigration
    ? `New migration tag(s) detected: ${newTags.join(', ')} — will run wrangler deploy.`
    : 'No new migration tags — leaving deploy to the Cloudflare Git integration.'
)

const githubOutput = process.env.GITHUB_OUTPUT
if (githubOutput) {
  appendFileSync(githubOutput, `has-migration=${hasMigration}\n`)
}
