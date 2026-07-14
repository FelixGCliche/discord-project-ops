import { fileURLToPath } from 'node:url'
import { parseEnv } from 'core'
import { botEnvSchema } from '../../../apps/bot/src/env.ts'

// Must match the `name` field in apps/bot/wrangler.jsonc
const WORKER_SCRIPT_NAME = 'discord-project-ops'

const CLOUDFLARE_ENV_PATH = new URL('../.env', import.meta.url)
const BOT_ENV_PATH = new URL('../../../apps/bot/.env', import.meta.url)
const BOT_DEV_VARS_PATH = new URL('../../../apps/bot/.dev.vars', import.meta.url)

// Packages whose .env holds values for keys composed into botEnvSchema.
// Add to this list when another package's schema gets composed into workerEnvSchema.
const ENV_SOURCE_PACKAGES = ['linear']

function parseDotenv(text: string): Record<string, string> {
  const values: Record<string, string> = {}
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim()
    values[key] = value
  }
  return values
}

function serializeDotenv(values: Record<string, string>): string {
  return Object.entries(values)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')
}

async function readDotenv(path: URL): Promise<Record<string, string>> {
  const file = Bun.file(path)
  if (!(await file.exists())) {
    throw new Error(`Missing env file: ${fileURLToPath(path)}`)
  }
  return parseDotenv(await file.text())
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
      method: 'POST',
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
  const cloudflareEnv = await readDotenv(CLOUDFLARE_ENV_PATH)
  const accountId = cloudflareEnv.CLOUDFLARE_ACCOUNT_ID
  const apiToken = cloudflareEnv.CLOUDFLARE_API_TOKEN
  if (!accountId || !apiToken) {
    console.error(`CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN must be set in ${fileURLToPath(CLOUDFLARE_ENV_PATH)}`)
    process.exit(1)
  }

  // apps/bot/.env holds keys botEnvSchema adds on top of the composed package schemas.
  const sourceValues: Record<string, string> = await readDotenv(BOT_ENV_PATH)
  for (const packageName of ENV_SOURCE_PACKAGES) {
    const packageEnvPath = new URL(`../../${packageName}/.env`, import.meta.url)
    Object.assign(sourceValues, await readDotenv(packageEnvPath))
  }
  const secrets = parseEnv(botEnvSchema, sourceValues)

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

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
