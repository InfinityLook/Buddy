// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import fixture from '../fixtures/buddy-transformer-v1.json'
import { loadChatBundle, readBounded } from '../../src/buddy/local/generation/loader'

const root = 'https://buddy.test/buddy-ai/chat/'
const sha = fixture.manifest.sha256
const active = { version: 1, enabled: true, manifest: `model-${sha}.json`, weights: `weights-${sha}.bin`, review: { status: 'approved', modelSha256: sha } }
const json = (value: unknown) => new Response(JSON.stringify(value))
const bytes = () => Uint8Array.from(Buffer.from(fixture.weightsBase64, 'base64'))
let stored: Map<string, Response>
let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>

beforeEach(() => {
  stored = new Map()
  vi.stubGlobal('location', new URL('https://buddy.test/hub'))
  vi.stubGlobal('caches', {
    open: vi.fn(async () => ({
      match: async (url: string) => stored.get(url)?.clone(),
      put: async (url: string, response: Response) => { stored.set(url, response.clone()) },
      keys: async () => [...stored.keys()].map((url) => new Request(url)),
      delete: async (request: Request) => stored.delete(request.url),
    })),
  })
  fetchMock = vi.fn<typeof fetch>().mockImplementation(async (input) => {
    const url = String(input)
    if (url.endsWith('active.json')) return json(active)
    if (url.endsWith('.json')) return json(fixture.manifest)
    return new Response(bytes())
  })
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => vi.unstubAllGlobals())

describe('Načítání společně verzovaných souborů generátoru', () => {
  it('u vypnutého pilotu nestáhne ani manifest, ani váhy', async () => {
    fetchMock.mockResolvedValueOnce(json({ version: 1, enabled: false }))
    expect(await loadChatBundle(root)).toBeNull()
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('ověří celou verzi a uloží ji pro další použití offline', async () => {
    const bundle = await loadChatBundle(root)
    expect(bundle?.manifest.sha256).toBe(sha)
    expect(bundle?.weights.byteLength).toBe(fixture.manifest.bytes)
    expect(stored.size).toBe(3)
    fetchMock.mockRejectedValue(new Error('offline'))
    expect((await loadChatBundle(root))?.manifest.sha256).toBe(sha)
  })

  it('čerstvé vypnutí modelu má přednost před dřívější uloženou verzí', async () => {
    await loadChatBundle(root)
    fetchMock.mockResolvedValueOnce(json({ version: 1, enabled: false }))
    expect(await loadChatBundle(root)).toBeNull()
    fetchMock.mockRejectedValue(new Error('offline'))
    expect(await loadChatBundle(root)).toBeNull()
  })

  it('poškozené váhy se nestanou offline verzí', async () => {
    const corrupted = bytes()
    corrupted[5] ^= 1
    fetchMock.mockImplementation(async (input) => String(input).endsWith('active.json')
      ? json(active) : String(input).endsWith('.json') ? json(fixture.manifest) : new Response(corrupted))
    await expect(loadChatBundle(root)).rejects.toThrow('součet')
    expect(stored.has(root + 'active.json')).toBe(false)
  })

  it('odmítne zaměněný manifest i neschválenou verzi', async () => {
    fetchMock.mockResolvedValueOnce(json({ ...active, review: { status: 'pending', modelSha256: sha } }))
    await expect(loadChatBundle(root)).rejects.toThrow('kvality')
    expect(fetchMock).toHaveBeenCalledOnce()
    fetchMock.mockResolvedValueOnce(json({ ...active, manifest: 'https://cizi.test/model.json' }))
    await expect(loadChatBundle(root)).rejects.toThrow('kvality')
    fetchMock.mockResolvedValueOnce(json(active)).mockResolvedValueOnce(json({ ...fixture.manifest, sha256: 'a'.repeat(64) }))
    await expect(loadChatBundle(root)).rejects.toThrow('verze')
  })

  it('nenačítá modely z jiného serveru', async () => {
    await expect(loadChatBundle('https://cizi.test/')).rejects.toThrow('součástí')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('při selhání ukládání může použít již ověřené soubory', async () => {
    vi.stubGlobal('caches', { open: vi.fn().mockRejectedValue(new Error('storage disabled')) })
    expect((await loadChatBundle(root))?.manifest.sha256).toBe(sha)
  })

  it('omezuje odpověď i bez Content-Length a odmítne HTTP chybu', async () => {
    await expect(readBounded(new Response('x'.repeat(20)), 10)).rejects.toThrow('velikost')
    await expect(readBounded(new Response('x', { headers: { 'Content-Length': '20' } }), 10)).rejects.toThrow('velký')
    await expect(readBounded(new Response('error', { status: 404 }), 100)).rejects.toThrow('dostupný')
  })
})
