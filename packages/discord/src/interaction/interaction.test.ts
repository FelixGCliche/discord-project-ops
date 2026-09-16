import { describe, expect, test } from 'bun:test'
import { interactionSchema, InteractionType } from './schema'
import type { ApplicationCommandData, MessageComponentData } from './schema'

describe('interactionSchema', () => {
  test('parses a PING interaction', () => {
    const result = interactionSchema.parse({
      id: '1',
      application_id: 'app1',
      type: InteractionType.PING,
      token: 'tok',
      version: 1,
    })
    expect(result.type).toBe(1)
  })

  test('parses an APPLICATION_COMMAND interaction', () => {
    const result = interactionSchema.parse({
      id: '2',
      application_id: 'app1',
      type: InteractionType.APPLICATION_COMMAND,
      token: 'tok',
      version: 1,
      data: { id: 'cmd1', name: 'test', type: 1 },
      channel_id: 'ch1',
    })
    expect(result.type).toBe(2)
    const data = result.data as ApplicationCommandData
    expect(data.name).toBe('test')
  })

  test('parses a MESSAGE_COMPONENT interaction', () => {
    const result = interactionSchema.parse({
      id: '3',
      application_id: 'app1',
      type: InteractionType.MESSAGE_COMPONENT,
      token: 'tok',
      version: 1,
      data: { custom_id: 'approve_123', component_type: 2 },
      channel_id: 'ch1',
    })
    expect(result.type).toBe(3)
    const data = result.data as MessageComponentData
    expect(data.custom_id).toBe('approve_123')
  })
})
