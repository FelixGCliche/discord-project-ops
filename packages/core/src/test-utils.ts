import { spyOn } from 'bun:test'
import { prettifyError, type z } from 'zod'

type FetchImpl = (input: string | URL | Request, init?: RequestInit) => Promise<Response>

export function mockFetch(impl: FetchImpl) {
  return spyOn(globalThis, 'fetch').mockImplementation(impl as unknown as typeof fetch)
}

export function assertParseSuccess<T>(result: z.ZodSafeParseResult<T>): asserts result is z.ZodSafeParseSuccess<T> {
  if (!result.success) throw new Error(prettifyError(result.error))
}
