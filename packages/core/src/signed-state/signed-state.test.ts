import { describe, expect, test } from 'bun:test'
import { createSignedState, timingSafeEqual, verifySignedState } from './index'

describe('createSignedState() / verifySignedState()', () => {
  test('accepts a state signed with the same secret', async () => {
    const state = await createSignedState('state-secret', 'test-purpose')
    const isValid = await verifySignedState('state-secret', state, 'test-purpose')
    expect(isValid).toBe(true)
  })

  test('rejects a state signed with a different secret', async () => {
    const state = await createSignedState('other-secret', 'test-purpose')
    const isValid = await verifySignedState('state-secret', state, 'test-purpose')
    expect(isValid).toBe(false)
  })

  test('rejects a tampered signature', async () => {
    const state = await createSignedState('state-secret', 'test-purpose')
    const [nonce, timestamp] = state.split('.')
    const tampered = `${nonce}.${timestamp}.not-the-real-signature`
    const isValid = await verifySignedState('state-secret', tampered, 'test-purpose')
    expect(isValid).toBe(false)
  })

  test('rejects a malformed state', async () => {
    const isValid = await verifySignedState('state-secret', 'not-a-valid-state', 'test-purpose')
    expect(isValid).toBe(false)
  })

  test('rejects an expired state', async () => {
    const state = await createSignedState('state-secret', 'test-purpose')
    const isValid = await verifySignedState('state-secret', state, 'test-purpose', -1)
    expect(isValid).toBe(false)
  })

  test('rejects a state signed with a different purpose', async () => {
    const state = await createSignedState('state-secret', 'purpose-a')
    const isValid = await verifySignedState('state-secret', state, 'purpose-b')
    expect(isValid).toBe(false)
  })
})

describe('timingSafeEqual()', () => {
  test('returns true for equal strings', () => {
    expect(timingSafeEqual('abc123', 'abc123')).toBe(true)
  })

  test('returns false for different strings of the same length', () => {
    expect(timingSafeEqual('abc123', 'abc124')).toBe(false)
  })

  test('returns false for strings of different lengths', () => {
    expect(timingSafeEqual('abc', 'abcd')).toBe(false)
  })
})
