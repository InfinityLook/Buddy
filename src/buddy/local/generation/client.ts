import type { BuddyTextGenerator, GenerationMetrics } from './types'

/** Jedna instance patří jednomu rozhovoru. Ukončení Workeru přeruší i CPU výpočet. */
export const createBrowserGenerator = (): BuddyTextGenerator & { getMetrics: () => GenerationMetrics | null } => {
  let worker: Worker | null = null
  let cancel: (() => void) | null = null
  let id = 0
  let metrics: GenerationMetrics | null = null
  const dispose = () => {
    cancel?.()
    cancel = null
    worker?.terminate()
    worker = null
    metrics = null
  }
  return {
    dispose,
    getMetrics: () => metrics,
    generate: (messages, signal) => new Promise((resolve, reject) => {
      if (signal.aborted) { reject(new DOMException('Požadavek byl zastaven.', 'AbortError')); return }
      if (cancel) { resolve(null); return }
      if (typeof Worker === 'undefined') { resolve(null); return }
      try {
        worker ??= new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
        const current = worker
        const requestId = ++id
        const finish = (text: string | null, aborted = false) => {
          clearTimeout(timer)
          signal.removeEventListener('abort', abort)
          current.onmessage = null
          current.onerror = null
          current.onmessageerror = null
          cancel = null
          if (aborted) reject(new DOMException('Požadavek byl zastaven.', 'AbortError'))
          else resolve(text)
        }
        const abort = () => { current.terminate(); if (worker === current) worker = null; finish(null, true) }
        const fail = () => { current.terminate(); if (worker === current) worker = null; finish(null) }
        const timer = setTimeout(fail, 25000)
        cancel = abort
        signal.addEventListener('abort', abort, { once: true })
        current.onerror = fail
        current.onmessageerror = fail
        current.onmessage = ({ data }: MessageEvent) => {
          if (!data || data.id !== requestId) return
          if (data.error) { fail(); return }
          metrics = data.metrics ?? null
          finish(typeof data.text === 'string' ? data.text : null)
        }
        try {
          current.postMessage({
            id: requestId, messages,
            base: new URL(`${import.meta.env.BASE_URL}buddy-ai/chat/`, window.location.href).href,
          })
        } catch { fail() }
      } catch { resolve(null) }
    }),
  }
}
