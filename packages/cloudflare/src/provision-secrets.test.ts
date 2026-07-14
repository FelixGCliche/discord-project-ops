import { describe, expect, test } from 'bun:test'
import { serializeDotenv } from './provision-secrets'

describe('serializeDotenv', () => {
  test('joins entries as KEY=value lines', () => {
    const result = serializeDotenv({ FOO: 'bar', BAZ: 'qux' })
    expect(result).toBe('FOO=bar\nBAZ=qux')
  })

  test('preserves insertion order', () => {
    const result = serializeDotenv({ B: '2', A: '1' })
    expect(result).toBe('B=2\nA=1')
  })

  test('returns an empty string for no entries', () => {
    expect(serializeDotenv({})).toBe('')
  })
})
