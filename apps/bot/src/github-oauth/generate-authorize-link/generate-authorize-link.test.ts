import { describe, expect, test } from 'bun:test'
import { buildAuthorizeUrl } from './index'

describe('buildAuthorizeUrl', () => {
  test('replaces the callback path with /github/oauth/authorize and keeps the origin', () => {
    const result = buildAuthorizeUrl('https://example.com/github/oauth/callback', 'signed-token')
    expect(result).toBe('https://example.com/github/oauth/authorize?token=signed-token')
  })

  test('ignores nested or differing paths on the redirect URI, using only its origin', () => {
    const result = buildAuthorizeUrl('https://example.com/some/nested/path', 'signed-token')
    expect(result).toBe('https://example.com/github/oauth/authorize?token=signed-token')
  })

  test('URL-encodes special characters in the token', () => {
    const result = buildAuthorizeUrl('https://example.com/github/oauth/callback', 'a.b.c+d/e')
    const url = new URL(result)
    expect(url.searchParams.get('token')).toBe('a.b.c+d/e')
  })
})
