import { describe, expect, mock, test } from 'bun:test'
import { registerCommands } from './index'

describe('commands', () => {
  const appId = 'app123'
  const botToken = 'bot_tok'

  test('PUTs to the commands registration URL', async () => {
    const fetchMock = mock(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as Response))
    await registerCommands(appId, botToken, [{ name: 'test', description: 'A test command' }], {
      fetch: fetchMock as any,
    })
    const [url, init] = (fetchMock.mock.calls[0] ?? []) as any
    expect(url).toBe(`https://discord.com/api/v10/applications/${appId}/commands`)
    expect(init.method).toBe('PUT')
  })

  test('sends Bot auth header', async () => {
    const fetchMock = mock(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as Response))
    await registerCommands(appId, botToken, [{ name: 'test', description: 'A test command' }], {
      fetch: fetchMock as any,
    })
    const [, init] = (fetchMock.mock.calls[0] ?? []) as any
    expect(init.headers.Authorization).toBe(`Bot ${botToken}`)
  })

  test('sends commands as JSON body', async () => {
    const fetchMock = mock(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as Response))
    const commands = [{ name: 'test', description: 'A test command' }]
    await registerCommands(appId, botToken, commands, { fetch: fetchMock as any })
    const [, init] = (fetchMock.mock.calls[0] ?? []) as any
    expect(JSON.parse(init.body)).toEqual(commands)
  })

  test('returns parsed commands on success', async () => {
    const fetchMock = mock(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve([
            { id: 'cmd1', application_id: 'app1', name: 'test', description: 'A test command', version: '1' },
          ]),
      } as Response)
    )
    const result = await registerCommands(appId, botToken, [{ name: 'test', description: 'A test command' }], {
      fetch: fetchMock as any,
    })
    expect(result).toHaveLength(1)
    expect(result[0]?.name).toBe('test')
  })

  test('throws on non-ok response', async () => {
    const fetchMock = mock(() => Promise.resolve({ ok: false, status: 401 } as Response))
    await expect(
      registerCommands(appId, botToken, [{ name: 'test', description: 'A test command' }], { fetch: fetchMock as any })
    ).rejects.toThrow('Failed to register commands: 401')
  })
})
