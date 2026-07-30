import { describe, expect, test } from 'bun:test'
import { HttpError } from './index'

describe('HttpError', () => {
  test('sets status and message, and is an instanceof Error and HttpError', () => {
    const error = new HttpError(400, 'bad thing')

    expect(error.status).toBe(400)
    expect(error.message).toBe('bad thing')
    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(HttpError)
  })
})
