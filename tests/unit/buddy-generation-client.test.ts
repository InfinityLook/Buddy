import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createBrowserGenerator } from '../../src/buddy/local/generation/client'

class FakeWorker {
  static instances: FakeWorker[] = []
  onmessage: ((event: { data: unknown }) => void) | null = null
  onerror: (() => void) | null = null
  onmessageerror: (() => void) | null = null
  postMessage = vi.fn()
  terminate = vi.fn()
  constructor() { FakeWorker.instances.push(this) }
}

beforeEach(() => { FakeWorker.instances = []; vi.stubGlobal('Worker', FakeWorker) })
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })

const messages = [{ role: 'user' as const, text: 'Jak se dnes máš?' }]

describe('Řízení výpočtu na pozadí', () => {
  it('spustí Worker až při povídání, ignoruje cizí ID a znovu ho použije', async () => {
    const client = createBrowserGenerator()
    expect(FakeWorker.instances).toHaveLength(0)
    const first = client.generate(messages, new AbortController().signal)
    const worker = FakeWorker.instances[0]
    const request = worker.postMessage.mock.calls[0][0]
    expect(request.messages).toEqual(messages)
    worker.onmessage!({ data: { id: request.id + 10, text: 'cizí' } })
    expect(worker.onmessage).not.toBeNull()
    worker.onmessage!({ data: { id: request.id, text: 'Ahoj.' } })
    expect(await first).toBe('Ahoj.')
    const second = client.generate(messages, new AbortController().signal)
    expect(FakeWorker.instances).toHaveLength(1)
    worker.onmessage!({ data: { id: worker.postMessage.mock.calls[1][0].id, text: null } })
    expect(await second).toBeNull()
    client.dispose()
  })

  it('zrušení opravdu ukončí CPU Worker a další výpočet vytvoří nový', async () => {
    const client = createBrowserGenerator()
    const controller = new AbortController()
    const first = client.generate(messages, controller.signal)
    const check = expect(first).rejects.toMatchObject({ name: 'AbortError' })
    const worker = FakeWorker.instances[0]
    controller.abort()
    await check
    expect(worker.terminate).toHaveBeenCalledOnce()
    expect(worker.onmessage).toBeNull()
    const second = client.generate(messages, new AbortController().signal)
    const next = FakeWorker.instances[1]
    next.onmessage!({ data: { id: next.postMessage.mock.calls[0][0].id, text: 'nový' } })
    expect(await second).toBe('nový')
    client.dispose()
  })

  it('dispose zruší i čekající stahování a uvolní instanci', async () => {
    const client = createBrowserGenerator()
    const result = client.generate(messages, new AbortController().signal)
    const check = expect(result).rejects.toMatchObject({ name: 'AbortError' })
    client.dispose()
    await check
    expect(FakeWorker.instances[0].terminate).toHaveBeenCalledOnce()
  })

  it('při chybě Workeru vrátí dostupnou náhradní větev', async () => {
    const client = createBrowserGenerator()
    const result = client.generate(messages, new AbortController().signal)
    FakeWorker.instances[0].onerror!()
    expect(await result).toBeNull()
    expect(FakeWorker.instances[0].terminate).toHaveBeenCalledOnce()
  })

  it('hlídá celkový čas včetně načítání', async () => {
    vi.useFakeTimers()
    const client = createBrowserGenerator()
    const result = client.generate(messages, new AbortController().signal)
    await vi.advanceTimersByTimeAsync(25001)
    expect(await result).toBeNull()
    expect(FakeWorker.instances[0].terminate).toHaveBeenCalledOnce()
  })

  it('u nepodporovaného Workeru a předem zrušeného požadavku nezačne výpočet', async () => {
    vi.stubGlobal('Worker', undefined)
    const client = createBrowserGenerator()
    expect(await client.generate(messages, new AbortController().signal)).toBeNull()
    const controller = new AbortController()
    controller.abort()
    await expect(client.generate(messages, controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
    expect(FakeWorker.instances).toHaveLength(0)
  })
})
