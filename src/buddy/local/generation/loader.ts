import { MAX_MODEL_BYTES, parseChatManifest, verifyWeights } from './format'
import type { ChatManifest } from './types'

const CACHE = 'buddy-chat-bundles-v1'
interface ActiveModel {
  version: 1
  enabled: boolean
  manifest?: string
  weights?: string
  review?: { status: 'approved'; modelSha256: string }
}

const parseActive = (value: unknown): ActiveModel => {
  if (!value || typeof value !== 'object') throw new Error('Chybí nastavení konverzačního modelu.')
  const active = value as ActiveModel
  if (active.version !== 1 || typeof active.enabled !== 'boolean') throw new Error('Neplatná verze nastavení.')
  if (!active.enabled) return { version: 1, enabled: false }
  const sha = active.review?.modelSha256
  if (active.review?.status !== 'approved' || typeof sha !== 'string' || !/^[a-f0-9]{64}$/.test(sha) ||
    active.manifest !== `model-${sha}.json` || active.weights !== `weights-${sha}.bin`) {
    throw new Error('Model nemá kontrolu kvality pro tuto verzi vah.')
  }
  return active
}

/** Limit platí i při chybějícím Content-Length a při streamované odpovědi. */
export const readBounded = async (response: Response, limit: number): Promise<ArrayBuffer> => {
  if (!response.ok || !response.body || Number(response.headers.get('Content-Length')) > limit) {
    await response.body?.cancel()
    throw new Error('Soubor modelu není dostupný nebo je příliš velký.')
  }
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let length = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      length += value.byteLength
      if (length > limit) throw new Error('Soubor modelu překročil povolenou velikost.')
      chunks.push(value)
    }
  } finally {
    await reader.cancel().catch(() => {})
    reader.releaseLock()
  }
  const data = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.length }
  return data.buffer
}

const parseJson = (bytes: ArrayBuffer): unknown => JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))

export const loadChatBundle = async (base: string): Promise<{ manifest: ChatManifest; weights: ArrayBuffer } | null> => {
  const root = new URL(base)
  if (root.origin !== globalThis.location.origin) throw new Error('Model musí být součástí této aplikace.')
  const activeUrl = new URL('active.json', root).href
  let cache: Cache | null = null
  try { if (typeof caches !== 'undefined') cache = await caches.open(CACHE) } catch { /* Cache není nutná. */ }
  const download = async (url: string, max: number): Promise<ArrayBuffer> => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 15000)
    try { return await readBounded(await fetch(url, { cache: 'no-store', signal: controller.signal }), max) }
    finally { clearTimeout(timer) }
  }
  const cached = async (url: string, max: number): Promise<ArrayBuffer> => {
    const response = await cache?.match(url)
    if (!response) throw new Error('Model není uložený pro offline použití.')
    return readBounded(response, max)
  }
  let activeBytes: ArrayBuffer
  let online = true
  try { activeBytes = await download(activeUrl, 4096) }
  catch { online = false; activeBytes = await cached(activeUrl, 4096) }
  const active = parseActive(parseJson(activeBytes))
  if (!active.enabled) {
    // Čerstvé vypnutí má přednost i před dříve povolenou offline kopií.
    try { await cache?.put(activeUrl, new Response(activeBytes)) } catch { /* Bez cache lze pokračovat. */ }
    return null
  }
  const manifestUrl = new URL(active.manifest!, root).href
  const weightsUrl = new URL(active.weights!, root).href
  const get = async (url: string, max: number): Promise<ArrayBuffer> => {
    if (!online) return cached(url, max)
    try { return await download(url, max) } catch { return cached(url, max) }
  }
  const manifestBytes = await get(manifestUrl, 256_000)
  const manifest = parseChatManifest(parseJson(manifestBytes))
  if (manifest.sha256 !== active.review!.modelSha256) throw new Error('Nesouhlasí verze schváleného modelu.')
  const weights = await get(weightsUrl, Math.min(manifest.bytes, MAX_MODEL_BYTES))
  await verifyWeights(manifest, weights)
  // Ukazatel na model uložíme až po ověření obou souborů. Půl stažení není offline verze.
  try {
    if (cache) {
      await cache.put(manifestUrl, new Response(manifestBytes))
      await cache.put(weightsUrl, new Response(weights))
      await cache.put(activeUrl, new Response(activeBytes))
      const keep = new Set([activeUrl, manifestUrl, weightsUrl])
      for (const request of await cache.keys()) if (!keep.has(request.url)) await cache.delete(request)
    }
  } catch { /* Nedostatek místa v cache nebrání aktuálnímu výpočtu. */ }
  return { manifest, weights }
  }
