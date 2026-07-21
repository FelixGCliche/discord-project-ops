import { getEnvFilePaths, listSecrets, requireCloudflareCredentials } from 'cloudflare'
import { botEnvSchema } from '../env'
import { loadEnvFiles } from './load-env-files'
import { parseTargetEnv, ENV_TO_SCRIPT_NAME } from './target-env'

export function diffSecrets(
  deployedNames: ReadonlySet<string>,
  expectedNames: ReadonlySet<string>
): { missing: string[]; unused: string[] } {
  return {
    missing: [...expectedNames].filter((name) => !deployedNames.has(name)),
    unused: [...deployedNames].filter((name) => !expectedNames.has(name)),
  }
}

async function main() {
  await loadEnvFiles(getEnvFilePaths())

  const credentials = requireCloudflareCredentials()

  const targetEnv = parseTargetEnv(process.argv[2])
  const scriptName = ENV_TO_SCRIPT_NAME[targetEnv]

  const deployedSecrets = await listSecrets(credentials, scriptName)
  const deployedNames = new Set(deployedSecrets.map((s) => s.name))
  const expectedNames = new Set(Object.keys(botEnvSchema.shape))

  const { missing, unused } = diffSecrets(deployedNames, expectedNames)

  if (missing.length > 0) {
    console.error(`Missing secrets on ${scriptName}: ${missing.join(', ')}`)
  }
  if (unused.length > 0) {
    console.error(`Unused/stale secrets on ${scriptName}: ${unused.join(', ')}`)
  }
  if (missing.length > 0 || unused.length > 0) {
    process.exit(1)
  }

  console.log(`All ${deployedNames.size} secret(s) on ${scriptName} match the schema.`)
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
