import { describe, expect, test } from 'bun:test'
import { serializeDotenv } from './provision'
import { diffSecrets } from './validate'

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

describe('diffSecrets', () => {
  test('returns no missing/unused when deployed matches expected exactly', () => {
    const result = diffSecrets(new Set(['A', 'B']), new Set(['A', 'B']))
    expect(result).toEqual({ missing: [], unused: [] })
  })

  test('reports expected names that are not deployed as missing', () => {
    const result = diffSecrets(new Set(['A']), new Set(['A', 'B', 'C']))
    expect(result.missing).toEqual(['B', 'C'])
    expect(result.unused).toEqual([])
  })

  test('reports deployed names that are not expected as unused', () => {
    const result = diffSecrets(new Set(['A', 'B', 'C']), new Set(['A']))
    expect(result.missing).toEqual([])
    expect(result.unused).toEqual(['B', 'C'])
  })

  test('reports both missing and unused when deployed and expected diverge', () => {
    const result = diffSecrets(new Set(['A', 'STALE']), new Set(['A', 'NEW']))
    expect(result.missing).toEqual(['NEW'])
    expect(result.unused).toEqual(['STALE'])
  })

  test('returns empty arrays when both sets are empty', () => {
    const result = diffSecrets(new Set(), new Set())
    expect(result).toEqual({ missing: [], unused: [] })
  })
})
