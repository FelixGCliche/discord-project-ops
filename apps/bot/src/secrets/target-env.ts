// Must match the `env.<name>.name` fields in apps/bot/wrangler.jsonc
export const ENV_TO_SCRIPT_NAME = {
  production: 'discord-project-ops',
  staging: 'discord-project-ops-staging',
} as const

export type TargetEnv = keyof typeof ENV_TO_SCRIPT_NAME

export function parseTargetEnv(arg: string | undefined): TargetEnv {
  const targetEnv = arg ?? 'production'
  if (!(targetEnv in ENV_TO_SCRIPT_NAME)) {
    console.error(`Unknown environment "${targetEnv}". Expected one of: ${Object.keys(ENV_TO_SCRIPT_NAME).join(', ')}`)
    process.exit(1)
  }
  return targetEnv as TargetEnv
}
