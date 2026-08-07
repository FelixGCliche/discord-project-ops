import { describe, expect, test } from 'bun:test'
import { getOctokitErrorStatus } from './index'

describe('getOctokitErrorStatus()', () => {
  test('returns the numeric status from an Octokit-shaped error', () => {
    expect(getOctokitErrorStatus({ status: 404, message: 'Not Found' })).toBe(404)
  })

  test('returns undefined for a plain Error with no status', () => {
    expect(getOctokitErrorStatus(new Error('boom'))).toBeUndefined()
  })

  test('returns undefined for null, undefined, and non-object causes', () => {
    expect(getOctokitErrorStatus(null)).toBeUndefined()
    expect(getOctokitErrorStatus(undefined)).toBeUndefined()
    expect(getOctokitErrorStatus('boom')).toBeUndefined()
  })

  test('returns undefined when status is present but not a number', () => {
    expect(getOctokitErrorStatus({ status: '404' })).toBeUndefined()
  })
})
