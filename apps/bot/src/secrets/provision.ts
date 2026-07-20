import { join } from 'node:path'
import { parseEnv } from 'core'
import { envFilePaths, putSecret, requireCloudflareCredentials } from 'cloudflare'
import { botEnvSchema } from '../env'
import { loadEnvFiles } from './load-env-files'
import { parseTargetEnv, ENV_TO_SCRIPT_NAME } from './target-env'

const BOT_DEV_VARS_PATH = join(import.meta.dir, '../../.dev.vars')

export function serializeDotenv(values: Record<string, string>): string {
  return Object.entries(values)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')
}

async function main() {
  await loadEnvFiles(envFilePaths)

  const credentials = requireCloudflareCredentials()

  const targetEnv = parseTargetEnv(process.argv[2])
  const scriptName = ENV_TO_SCRIPT_NAME[targetEnv]

  const secrets = parseEnv(botEnvSchema, process.env)

  await Bun.write(BOT_DEV_VARS_PATH, serializeDotenv(secrets))
  console.log(`Wrote ${BOT_DEV_VARS_PATH}`)

  let failures = 0
  for (const [name, value] of Object.entries(secrets)) {
    const result = await putSecret(credentials, scriptName, name, value)
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
  console.log(`Pushed ${Object.keys(secrets).length} secret(s) to ${scriptName}`)
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
