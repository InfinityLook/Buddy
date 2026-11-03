import type { BuddyChatMessage, ChatManifest } from './types'

/** Stejné dělení whitespace jako Python re, včetně NEL a řídicích oddělovačů. */
const PIECES = /[\u0009-\u000d\u001c-\u0020\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+|[^\u0009-\u000d\u001c-\u0020\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+/gu

export class BuddyTokenizer {
  private readonly ranks = new Map<string, number>()
  private readonly pieces: Uint8Array[] = Array.from({ length: 6 }, () => new Uint8Array())
  private readonly encoder = new TextEncoder()
  private readonly decoder = new TextDecoder('utf-8', { fatal: true })

  constructor(manifest: ChatManifest) {
    for (let i = 0; i < 256; i += 1) this.pieces.push(Uint8Array.of(i))
    for (const [a, b] of manifest.tokenizer.merges) {
      this.ranks.set(`${a},${b}`, this.pieces.length)
      this.pieces.push(new Uint8Array([...this.pieces[a], ...this.pieces[b]]))
    }
  }

  encode(text: string): number[] {
    const result: number[] = []
    for (const piece of text.match(PIECES) ?? []) {
      let ids = Array.from(this.encoder.encode(piece), (b) => b + 6)
      while (ids.length > 1) {
        let rank = Infinity
        let best = ''
        for (let i = 0; i + 1 < ids.length; i += 1) {
          const key = `${ids[i]},${ids[i + 1]}`
          const candidate = this.ranks.get(key) ?? Infinity
          if (candidate < rank) { rank = candidate; best = key }
        }
        if (!Number.isFinite(rank)) break
        const next: number[] = []
        for (let i = 0; i < ids.length; i += 1) {
          if (i + 1 < ids.length && `${ids[i]},${ids[i + 1]}` === best) {
            next.push(rank)
            i += 1
          } else next.push(ids[i])
        }
        ids = next
      }
      result.push(...ids)
    }
    return result
  }

  decode(ids: readonly number[]): string {
    const bytes: number[] = []
    for (const id of ids) {
      if (!Number.isInteger(id) || id < 6 || !this.pieces[id]) throw new Error('Neplatný token výstupu.')
      bytes.push(...this.pieces[id])
    }
    return this.decoder.decode(Uint8Array.from(bytes))
  }
}

/** Vynechá staré celé dvojice, zachová poslední dotaz a rezervu pro odpověď. */
export const buildChatPrompt = (
  messages: readonly BuddyChatMessage[], tokenizer: BuddyTokenizer, context: number, reserve: number,
): number[] => {
  if (!Number.isInteger(reserve) || reserve < 1 || reserve >= context ||
    !messages.length || messages.length > 17 || messages.length % 2 !== 1) {
    throw new Error('Neplatná délka kontextu rozhovoru.')
  }
  const chunks = messages.map((message, i) => {
    const expected = i % 2 ? 'assistant' : 'user'
    if (message.role !== expected || !message.text.trim() || message.text.length > 500) {
      throw new Error('Neplatná zpráva rozhovoru.')
    }
    return [expected === 'user' ? 3 : 4, ...tokenizer.encode(message.text), expected === 'user' ? 5 : 2]
  })
  while (chunks.length > 1 && chunks.reduce((sum, chunk) => sum + chunk.length, 2) + reserve > context) {
    chunks.splice(0, 2)
  }
  const ids = [1, ...chunks.flat(), 4]
  if (ids.length + reserve > context) throw new Error('Dotaz se nevejde do kontextu modelu.')
  return ids
}
