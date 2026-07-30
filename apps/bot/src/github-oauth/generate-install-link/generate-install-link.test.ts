import { describe, expect, test } from 'bun:test'
import { buildInstallUrl } from './index'

describe('buildInstallUrl', () => {
  test('builds the GitHub App install URL for the given slug with the state as a query param', () => {
    const result = buildInstallUrl('discord-project-ops', 'signed-token')
    expect(result).toBe('https://github.com/apps/discord-project-ops/installations/new?state=signed-token')
  })

  test('URL-encodes special characters in the state', () => {
    const result = buildInstallUrl('discord-project-ops', 'a.b.c+d/e')
    const url = new URL(result)
    expect(url.searchParams.get('state')).toBe('a.b.c+d/e')
  })
})
