import { loadChatBundle } from './loader'
import { BuddyTransformer, nextChatToken } from './runtime'
import { BuddyTokenizer, buildChatPrompt } from './tokenizer'
import type { BuddyChatMessage, GenerationMetrics } from './types'

const worker = globalThis as unknown as {
  onmessage: ((event: MessageEvent<{ id: number; base: string; messages: BuddyChatMessage[] }>) => void) | null
  postMessage: (value: unknown) => void
}
let bundle: Awaited<ReturnType<typeof loadChatBundle>> | undefined
let model: BuddyTransformer | null = null
let tokenizer: BuddyTokenizer | null = null
let busy = false

worker.onmessage = async ({ data }) => {
  if (busy) { worker.postMessage({ id: data.id, error: 'Výpočet už běží.' }); return }
  busy = true
  try {
    const received = performance.now()
    if (bundle === undefined) bundle = await loadChatBundle(data.base)
    if (!bundle) { worker.postMessage({ id: data.id, text: null }); return }
    const loaded = performance.now()
    if (!model) model = new BuddyTransformer(bundle.manifest, bundle.weights)
    if (!tokenizer) tokenizer = new BuddyTokenizer(bundle.manifest)
    const started = performance.now()
    const maxNew = 48
    const ids = buildChatPrompt(data.messages, tokenizer, bundle.manifest.config.context, maxNew)
    model.reset()
    const checkTime = () => {
      if (performance.now() - started > 6000) throw new Error('Generování překročilo časový limit.')
    }
    for (let i = 0; i + 1 < ids.length; i += 1) { checkTime(); model.step(ids[i], false) }
    const generated: number[] = []
    let token = ids[ids.length - 1]
    let eos = false
    for (let i = 0; i < maxNew; i += 1) {
      checkTime()
      token = nextChatToken(model.step(token))
      if (token === 2) { eos = true; break }
      generated.push(token)
    }
    checkTime()
    const metrics: GenerationMetrics = {
      promptTokens: ids.length, generatedTokens: generated.length,
      elapsedMs: performance.now() - received, generationMs: performance.now() - started,
      loadMs: loaded - received, initializationMs: started - loaded,
      modelBytes: bundle.manifest.bytes, endedWithEos: eos,
    }
    // Nevracíme neukončený text, poškozenou češtinu ani nekonečnou smyčku.
    const text = eos ? tokenizer.decode(generated).trim() : null
    worker.postMessage({ id: data.id, text, metrics })
  } catch {
    worker.postMessage({ id: data.id, error: 'Konverzační model není dostupný.' })
  } finally { busy = false }
      }
