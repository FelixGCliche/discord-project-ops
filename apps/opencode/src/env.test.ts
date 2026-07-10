import { describe, expect, test } from 'bun:test'
import { opencodeEnvSchema } from './env.ts'

const VALID_ENV = {
  OPENCODE_API_KEY: 'test-api-key',
  OPENCODE_SERVER_PASSWORD: 'test-password',
}

describe('opencodeEnvSchema', () => {
  test('parses a valid env', () => {
    const result = opencodeEnvSchema.safeParse(VALID_ENV)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.OPENCODE_SERVER_PASSWORD).toBe('test-password')
  })

  test('rejects a missing OPENCODE_SERVER_PASSWORD', () => {
    const { OPENCODE_SERVER_PASSWORD: _drop, ...rest } = VALID_ENV
    const result = opencodeEnvSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  test('rejects an empty OPENCODE_SERVER_PASSWORD', () => {
    const result = opencodeEnvSchema.safeParse({ ...VALID_ENV, OPENCODE_SERVER_PASSWORD: '' })
    expect(result.success).toBe(false)
  })

  test('OPENCODE_SERVER_HOSTNAME and OPENCODE_SERVER_PORT default when unset', () => {
    const result = opencodeEnvSchema.safeParse(VALID_ENV)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.OPENCODE_SERVER_HOSTNAME).toBe('0.0.0.0')
    expect(result.data.OPENCODE_SERVER_PORT).toBe(4096)
  })
})
