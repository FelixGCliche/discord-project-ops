import { describe, expect, mock, test } from 'bun:test'
import { sendFollowup, editFollowup, deleteFollowup, editOriginalResponse, getFollowupUrl } from './index'

describe('webhook', () => {
  const appId = 'app123'
  const token = 'tok456'

  test('sendFollowup POSTs to the webhook URL', async () => {
    const fetchMock = mock(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response))
    await sendFollowup(appId, token, { content: 'hello' }, { fetch: fetchMock as any })
    const [url, init] = (fetchMock.mock.calls[0] ?? []) as any
    expect(url).toBe(`https://discord.com/api/v10/webhooks/${appId}/${token}`)
    expect(init.method).toBe('POST')
  })

  test('sendFollowup sends the provided body', async () => {
    const fetchMock = mock(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response))
    await sendFollowup(appId, token, { content: 'hello' }, { fetch: fetchMock as any })
    const [, init] = (fetchMock.mock.calls[0] ?? []) as any
    expect(JSON.parse(init.body)).toEqual({ content: 'hello' })
  })

  test('editFollowup PATCHes the message URL', async () => {
    const fetchMock = mock(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response))
    await editFollowup(appId, token, 'msg1', { content: 'updated' }, { fetch: fetchMock as any })
    const [url, init] = (fetchMock.mock.calls[0] ?? []) as any
    expect(url).toBe(`https://discord.com/api/v10/webhooks/${appId}/${token}/messages/msg1`)
    expect(init.method).toBe('PATCH')
  })

  test('deleteFollowup DELETEs the message URL', async () => {
    const fetchMock = mock(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response))
    await deleteFollowup(appId, token, 'msg1', { fetch: fetchMock as any })
    const [url, init] = (fetchMock.mock.calls[0] ?? []) as any
    expect(url).toBe(`https://discord.com/api/v10/webhooks/${appId}/${token}/messages/msg1`)
    expect(init.method).toBe('DELETE')
  })

  test('editOriginalResponse PATCHes @original', async () => {
    const fetchMock = mock(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response))
    await editOriginalResponse(appId, token, { content: 'edited original' }, { fetch: fetchMock as any })
    const [url, init] = (fetchMock.mock.calls[0] ?? []) as any
    expect(url).toBe(`https://discord.com/api/v10/webhooks/${appId}/${token}/messages/@original`)
    expect(init.method).toBe('PATCH')
  })

  test('getFollowupUrl returns the base webhook URL', () => {
    expect(getFollowupUrl(appId, token)).toBe(`https://discord.com/api/v10/webhooks/${appId}/${token}`)
  })
})
