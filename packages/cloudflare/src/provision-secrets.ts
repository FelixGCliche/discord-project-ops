import { fileURLToPath } from 'node:url'
import { parseEnv } from 'core'
// apps/bot isn't set up as an importable workspace package (no `exports` map), so this
// reaches in by relative path rather than via a package import like the rest of this file's deps.
import { botEnvSchema } from '../../../apps/bot/src/env.ts'

// Must match the `name` field in apps/bot/wrangler.jsonc
const WORKER_SCRIPT_NAME = 'discord-project-ops'

const BOT_DEV_VARS_PATH = new URL('../../../apps/bot/.dev.vars', import.meta.url)

export function serializeDotenv(values: Record<string, string>): string {
  return Object.entries(values)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')
}

async function putSecret(
  accountId: string,
  apiToken: string,
  name: string,
  text: string
): Promise<{ success: boolean; errorText?: string }> {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${WORKER_SCRIPT_NAME}/secrets`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, text, type: 'secret_text' }),
    }
  )
  if (response.ok) return { success: true }
  const errorText = await response.text()
  return { success: false, errorText }
}

async function main() {
  // Loaded via the --env-file flags on the secrets:push script in package.json:
  // packages/cloudflare/.env, apps/bot/.env, packages/linear/.env
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const apiToken = process.env.CLOUDFLARE_API_TOKEN
  if (!accountId || !apiToken) {
    console.error('CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN must be set in packages/cloudflare/.env')
    process.exit(1)
  }

  const secrets = parseEnv(botEnvSchema, process.env)

  await Bun.write(BOT_DEV_VARS_PATH, serializeDotenv(secrets))
  console.log(`Wrote ${fileURLToPath(BOT_DEV_VARS_PATH)}`)

  let failures = 0
  for (const [name, value] of Object.entries(secrets)) {
    const result = await putSecret(accountId, apiToken, name, value)
    if (result.success) {
      console.log(`✔ pushed ${name}`)
    } else {
      failures++
      console.error(`✘ failed to push ${name}: ${result.errorText}`)
    }
  }

  if (failures > 0) {
    console.error(`${failures} secret(s) failed to push`)
    process.exit(1)
  }
  console.log(`Pushed ${Object.keys(secrets).length} secret(s) to ${WORKER_SCRIPT_NAME}`)
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
