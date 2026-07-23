import { describe, expect, test } from 'bun:test'
import { HttpError } from 'core'
import { createWorkerFetch } from './worker'

describe('createWorkerFetch', () => {
  test('returns 404 for an unknown route', async () => {
    const fetchFn = createWorkerFetch({})

    const response = await fetchFn(new Request('https://example.com/unknown'), {})

    expect(response.status).toBe(404)
    expect(await response.text()).toBe('Not found')
  })

  test('passes through the handler response for a matching route', async () => {
    const fetchFn = createWorkerFetch({
      '/hello': async () => new Response('hi there', { status: 200 }),
    })

    const response = await fetchFn(new Request('https://example.com/hello'), {})

    expect(response.status).toBe(200)
    expect(await response.text()).toBe('hi there')
  })

  test('returns the HttpError status and message when a handler throws an HttpError', async () => {
    const fetchFn = createWorkerFetch({
      '/bad': async () => {
        throw new HttpError(400, 'bad thing')
      },
    })

    const response = await fetchFn(new Request('https://example.com/bad'), {})

    expect(response.status).toBe(400)
    expect(await response.text()).toBe('bad thing')
  })

  test('returns a generic 500 when a handler throws a plain Error', async () => {
    const fetchFn = createWorkerFetch({
      '/oops': async () => {
        throw new Error('oops')
      },
    })

    const response = await fetchFn(new Request('https://example.com/oops'), {})

    expect(response.status).toBe(500)
    expect(await response.text()).toBe('Internal Server Error')
  })
})
