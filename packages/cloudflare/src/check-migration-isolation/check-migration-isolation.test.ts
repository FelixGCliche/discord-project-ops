import { describe, expect, test } from 'bun:test'
import { findDisallowedFiles } from './index'

describe('findDisallowedFiles', () => {
  test('allows the wrangler config file itself', () => {
    expect(findDisallowedFiles(['apps/bot/wrangler.jsonc'])).toEqual([])
  })

  test('allows new Durable Object class source under packages/cloudflare/src', () => {
    expect(
      findDisallowedFiles([
        'apps/bot/wrangler.jsonc',
        'packages/cloudflare/src/session-store/index.ts',
        'packages/cloudflare/src/session-store/session-store.test.ts',
      ])
    ).toEqual([])
  })

  test('allows the entrypoint re-export and package export map the migration needs', () => {
    expect(
      findDisallowedFiles(['apps/bot/wrangler.jsonc', 'apps/bot/src/index.ts', 'packages/cloudflare/package.json'])
    ).toEqual([])
  })

  test('flags unrelated files outside the allowlist', () => {
    expect(findDisallowedFiles(['apps/bot/wrangler.jsonc', 'apps/bot/src/env.ts'])).toEqual(['apps/bot/src/env.ts'])
  })

  test('flags files even when no wrangler.jsonc change is present in the list', () => {
    expect(findDisallowedFiles(['packages/core/src/decision/index.ts'])).toEqual([
      'packages/core/src/decision/index.ts',
    ])
  })

  test('returns an empty array when nothing is disallowed', () => {
    expect(findDisallowedFiles([])).toEqual([])
  })
})
