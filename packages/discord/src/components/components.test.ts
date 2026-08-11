import { describe, expect, test } from 'bun:test'
import { createButton, createActionRow, createApproveDenyRow } from './index'
import { ButtonStyle } from './schema'

describe('component builders', () => {
  test('createButton builds a primary button', () => {
    const btn = createButton({
      style: ButtonStyle.PRIMARY,
      customId: 'test_btn',
      label: 'Click Me',
    })
    expect(btn.type).toBe(2)
    expect(btn.style).toBe(1)
    expect(btn.custom_id).toBe('test_btn')
    expect(btn.label).toBe('Click Me')
  })

  test('createButton builds a link button', () => {
    const btn = createButton({
      style: ButtonStyle.LINK,
      customId: null,
      label: 'Learn More',
      url: 'https://example.com',
    })
    expect(btn.style).toBe(5)
    expect(btn.url).toBe('https://example.com')
    expect(btn.custom_id).toBeUndefined()
  })

  test('createActionRow wraps buttons', () => {
    const row = createActionRow(
      createButton({ style: 1, customId: 'a', label: 'A' }),
      createButton({ style: 4, customId: 'b', label: 'B' })
    )
    expect(row.type).toBe(1)
    expect(row.components).toHaveLength(2)
    expect(row.components[0]?.custom_id).toBe('a')
    expect(row.components[1]?.custom_id).toBe('b')
  })

  test('createApproveDenyRow returns Approve and Deny buttons', () => {
    const row = createApproveDenyRow('approve_1', 'deny_1')
    expect(row.components).toHaveLength(2)
    expect(row.components[0]?.custom_id).toBe('approve_1')
    expect(row.components[0]?.style).toBe(ButtonStyle.PRIMARY)
    expect(row.components[0]?.label).toBe('Approve')
    expect(row.components[1]?.custom_id).toBe('deny_1')
    expect(row.components[1]?.style).toBe(ButtonStyle.DANGER)
    expect(row.components[1]?.label).toBe('Deny')
  })
})
