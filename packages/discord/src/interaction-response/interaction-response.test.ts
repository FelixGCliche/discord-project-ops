import { describe, expect, test } from 'bun:test'
import { respondPong, respondDefer, respondDeferUpdate, respondMessage, respondUpdateMessage } from './index'
import { InteractionMessageFlags } from './schema'

describe('interaction responses', () => {
  test('respondPong returns type 1 with no data', () => {
    const res = respondPong()
    expect(res.type).toBe(1)
    expect(res.data).toBeUndefined()
  })

  test('respondDefer returns type 5', () => {
    const res = respondDefer()
    expect(res.type).toBe(5)
  })

  test('respondDefer with ephemeral sets EPHEMERAL flag', () => {
    const res = respondDefer(true)
    expect(res.type).toBe(5)
    expect(res.data?.flags).toBe(InteractionMessageFlags.EPHEMERAL)
  })

  test('respondDeferUpdate returns type 6', () => {
    const res = respondDeferUpdate()
    expect(res.type).toBe(6)
    expect(res.data).toBeUndefined()
  })

  test('respondMessage returns type 4 with content', () => {
    const res = respondMessage('hello')
    expect(res.type).toBe(4)
    expect(res.data?.content).toBe('hello')
  })

  test('respondMessage with ephemeral sets flag', () => {
    const res = respondMessage('hello', { ephemeral: true })
    expect(res.data?.flags).toBe(64)
  })

  test('respondUpdateMessage returns type 7', () => {
    const res = respondUpdateMessage('updated')
    expect(res.type).toBe(7)
    expect(res.data?.content).toBe('updated')
  })

  test('respondUpdateMessage with components', () => {
    const res = respondUpdateMessage('updated', { components: [] })
    expect(res.type).toBe(7)
    expect(res.data?.components).toEqual([])
  })
})
