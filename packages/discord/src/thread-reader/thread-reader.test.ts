import { describe, expect, mock, test } from 'bun:test'
import { fetchThreadMessages } from './index'

function createBasicMessage(id: string) {
  return {
    id,
    channel_id: 'ch1',
    author: {
      id: 'author1',
      username: 'testuser',
      discriminator: '1234',
      avatar: null,
    },
    content: `message ${id}`,
    timestamp: '2024-01-01T00:00:00.000Z',
    edited_timestamp: null,
    tts: false,
    mention_everyone: false,
    mentions: [],
    mention_roles: [],
    attachments: [],
    embeds: [],
    pinned: false,
    type: 0,
  }
}

describe('thread-reader', () => {
  const channelId = 'ch123'
  const botToken = 'bot_tok'

  test('sends request with Bot auth header', async () => {
    const fetchMock = mock(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as Response))
    await fetchThreadMessages(channelId, botToken, { fetch: fetchMock as any })
    const [, init] = (fetchMock.mock.calls[0] ?? []) as any
    expect(init.headers.Authorization).toBe(`Bot ${botToken}`)
  })

  test('uses default limit of 50', async () => {
    const fetchMock = mock(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as Response))
    await fetchThreadMessages(channelId, botToken, { fetch: fetchMock as any })
    const [url] = (fetchMock.mock.calls[0] ?? []) as any
    expect(url).toBe(`https://discord.com/api/v10/channels/${channelId}/messages?limit=50`)
  })

  test('accepts custom limit', async () => {
    const fetchMock = mock(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as Response))
    await fetchThreadMessages(channelId, botToken, { fetch: fetchMock as any, limit: 10 })
    const [url] = (fetchMock.mock.calls[0] ?? []) as any
    expect(url).toContain('limit=10')
  })

  test('accepts before param for pagination', async () => {
    const fetchMock = mock(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as Response))
    await fetchThreadMessages(channelId, botToken, { fetch: fetchMock as any, before: 'msg99' })
    const [url] = (fetchMock.mock.calls[0] ?? []) as any
    expect(url).toContain('before=msg99')
  })

  test('reverses messages to be oldest-first', async () => {
    const fetchMock = mock(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([createBasicMessage('3'), createBasicMessage('2'), createBasicMessage('1')]),
      } as Response)
    )
    const messages = await fetchThreadMessages(channelId, botToken, { fetch: fetchMock as any })
    expect(messages).toHaveLength(3)
    expect(messages[0]?.id).toBe('1')
    expect(messages[1]?.id).toBe('2')
    expect(messages[2]?.id).toBe('3')
  })

  test('throws on non-ok response', async () => {
    const fetchMock = mock(() => Promise.resolve({ ok: false, status: 403 } as Response))
    await expect(fetchThreadMessages(channelId, botToken, { fetch: fetchMock as any })).rejects.toThrow(
      'Failed to fetch messages: 403'
    )
  })
})
