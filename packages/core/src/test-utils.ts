import { spyOn } from 'bun:test'
import { prettifyError, type z } from 'zod'

export type MockFetch = (input: string | URL | Request, init?: RequestInit) => Promise<Response>

export function mockFetch(mockFetch: MockFetch) {
  const stub = (...args: Parameters<typeof fetch>) => mockFetch(...args)
  stub.preconnect = (() => {}) satisfies typeof fetch.preconnect

  return spyOn(globalThis, 'fetch').mockImplementation(stub)
}

export function assertParseSuccess<T>(result: z.ZodSafeParseResult<T>): asserts result is z.ZodSafeParseSuccess<T> {
  if (!result.success) throw new Error(prettifyError(result.error))
}
