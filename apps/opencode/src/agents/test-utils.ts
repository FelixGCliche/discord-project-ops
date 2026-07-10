import { expect } from 'bun:test'

export function expectAllValuesToBe<T>(obj: Record<string, T> | undefined, expected: T): void {
  for (const value of Object.values(obj ?? {})) {
    expect(value).toBe(expected)
  }
}
