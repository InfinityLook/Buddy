// @vitest-environment node
import { describe, expect, it } from 'vitest'
import fixture from '../fixtures/buddy-transformer-v1.json'
import { parseChatManifest, verifyWeights } from '../../src/buddy/local/generation/format'
import { BuddyTransformer, nextChatToken } from '../../src/buddy/local/generation/runtime'
import { BuddyTokenizer, buildChatPrompt } from '../../src/buddy/local/generation/tokenizer'

const manifest = parseChatManifest(fixture.manifest)
const bytes = () => Uint8Array.from(Buffer.from(fixture.weightsBase64, 'base64')).buffer

describe('Vlastní generátor v prohlížeči', () => {
  it('ověří skutečný export vah a odmítne poškození', async () => {
    await verifyWeights(manifest, bytes())
    const corrupted = bytes()
    new Uint8Array(corrupted)[10] ^= 1
    await expect(verifyWeights(manifest, corrupted)).rejects.toThrow('součet')
    await expect(verifyWeights(manifest, corrupted.slice(4))).rejects.toThrow('délka')
  })

  it.each(fixture.texts)('má stejný BPE výsledek jako Python: $text', ({ text, ids }) => {
    const tokenizer = new BuddyTokenizer(manifest)
    expect(tokenizer.encode(text)).toEqual(ids)
    expect(tokenizer.decode(ids)).toBe(text)
  })

  it('logity pro všechny pozice a tokeny odpovídají PyTorchi v toleranci 2e-5', () => {
    const runtime = new BuddyTransformer(manifest, bytes())
    fixture.tokens.forEach((token, position) => {
      const logits = runtime.step(token)
      expect(logits).toHaveLength(fixture.logits[position].length)
      logits.forEach((value, i) => expect(Math.abs(value - fixture.logits[position][i])).toBeLessThan(0.00002))
    })
    runtime.reset()
    expect(Array.from(runtime.step(fixture.tokens[0]))).toEqual(Array.from(new BuddyTransformer(manifest, bytes()).step(fixture.tokens[0])))
  })

  it('vynechání výstupních logitů nezmění KV cache', () => {
    const runtime = new BuddyTransformer(manifest, bytes())
    fixture.tokens.slice(0, -1).forEach((token) => runtime.step(token, false))
    const logits = runtime.step(fixture.tokens.at(-1)!)
    logits.forEach((value, i) => expect(Math.abs(value - fixture.logits.at(-1)![i])).toBeLessThan(0.00002))
  })

  it('nevybírá řídicí tokeny a odmítne neplatné logity', () => {
    expect(nextChatToken(Float32Array.of(100, 100, 1, 100, 100, 100, 2))).toBe(6)
    expect(() => nextChatToken(Float32Array.of(1, 2, NaN))).toThrow()
  })

  it('nepřijme neplatný token ani přetečení kontextu', () => {
    const runtime = new BuddyTransformer(manifest, bytes())
    expect(() => runtime.step(999)).toThrow()
    for (let i = 0; i < manifest.config.context; i += 1) runtime.step(1, false)
    expect(() => runtime.step(1)).toThrow('kontext')
  })

  it('zahazuje celé staré dvojice a zachová poslední dotaz s rezervou', () => {
    const tokenizer = new BuddyTokenizer(manifest)
    const ids = buildChatPrompt([
      { role: 'user', text: 'x'.repeat(50) }, { role: 'assistant', text: 'x'.repeat(50) },
      { role: 'user', text: 'Ahoj světe!' },
    ], tokenizer, 64, 48)
    expect(ids).toEqual([1, 3, ...tokenizer.encode('Ahoj světe!'), 5, 4])
    expect(ids.length + 48).toBeLessThanOrEqual(64)
    expect(() => buildChatPrompt([{ role: 'user', text: 'x'.repeat(100) }], tokenizer, 64, 48)).toThrow('nevejde')
    expect(() => buildChatPrompt([{ role: 'assistant', text: 'Ahoj' }], tokenizer, 64, 48)).toThrow('zpráva')
  })

  it.each([
    (m: typeof fixture.manifest) => { m.tensors[0].byteOffset = 4 },
    (m: typeof fixture.manifest) => { m.tensors[0].shape[0] = 9000 },
    (m: typeof fixture.manifest) => { m.config.heads = 3 },
    (m: typeof fixture.manifest) => { m.config.width = 8192 },
    (m: typeof fixture.manifest) => { m.tokenizer.merges[0] = [0, 1] },
    (m: typeof fixture.manifest) => { m.tokenizer.merges[0] = [9999, 9999] },
    (m: typeof fixture.manifest) => { m.tokenizer.specialTokens.user = 0 },
    (m: typeof fixture.manifest) => { m.layerNormEpsilon = 0.1 },
  ])('odmítne neplatná metadata před alokací', (change) => {
    const altered = structuredClone(fixture.manifest)
    change(altered)
    expect(() => parseChatManifest(altered)).toThrow()
  })
})
