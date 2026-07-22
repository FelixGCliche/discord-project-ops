import { afterEach, describe, expect, test } from 'bun:test'
import { getWorkerUrl, requireWorkersSubdomain } from './index'

describe('getWorkerUrl', () => {
  test('builds a workers.dev URL from the worker name and subdomain', () => {
    expect(getWorkerUrl('discord-project-ops', 'example-subdomain')).toBe(
      'https://discord-project-ops.example-subdomain.workers.dev'
    )
  })
})

describe('requireWorkersSubdomain', () => {
  const original = process.env.CLOUDFLARE_WORKERS_SUBDOMAIN

  afterEach(() => {
    if (original === undefined) {
      delete process.env.CLOUDFLARE_WORKERS_SUBDOMAIN
    } else {
      process.env.CLOUDFLARE_WORKERS_SUBDOMAIN = original
    }
  })

  test('throws when CLOUDFLARE_WORKERS_SUBDOMAIN is unset', () => {
    delete process.env.CLOUDFLARE_WORKERS_SUBDOMAIN
    expect(() => requireWorkersSubdomain()).toThrow('CLOUDFLARE_WORKERS_SUBDOMAIN must be set')
  })

  test('returns the value when it is set', () => {
    process.env.CLOUDFLARE_WORKERS_SUBDOMAIN = 'example-subdomain'
    expect(requireWorkersSubdomain()).toBe('example-subdomain')
  })
})
