import type { ChatManifest } from './types'

export const MAX_MODEL_BYTES = 16_000_000

export const tensorShapes = (config: ChatManifest['config']): Array<[string, number[]]> => {
  const { vocab, context, width: w, layers } = config
  const shapes: Array<[string, number[]]> = [
    ['tokens.weight', [vocab, w]], ['positions.weight', [context, w]],
  ]
  for (let i = 0; i < layers; i += 1) {
    for (const [name, shape] of [
      ['ln1.weight', [w]], ['ln1.bias', [w]], ['ln2.weight', [w]], ['ln2.bias', [w]],
      ['qkv.weight', [3 * w, w]], ['qkv.bias', [3 * w]],
      ['proj.weight', [w, w]], ['proj.bias', [w]],
      ['ff1.weight', [4 * w, w]], ['ff1.bias', [4 * w]],
      ['ff2.weight', [w, 4 * w]], ['ff2.bias', [w]],
    ] as Array<[string, number[]]>) shapes.push([`blocks.${i}.${name}`, shape])
  }
  return [...shapes, ['norm.weight', [w]], ['norm.bias', [w]]]
}

/** Ověří i každý rozměr a offset; metadata nesmějí zadat libovolnou alokaci. */
export const parseChatManifest = (value: unknown): ChatManifest => {
  const fail = (): never => { throw new Error('Neplatný formát konverzačního modelu.') }
  if (!value || typeof value !== 'object') return fail()
  const m = value as ChatManifest
  if (m.version !== 1 || m.architecture !== 'buddy-transformer-v1' ||
    m.format !== 'float32-le' || m.activation !== 'gelu-erf' ||
    m.layerNormEpsilon !== 0.00001 || m.tiedOutputWeight !== 'tokens.weight' ||
    typeof m.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(m.sha256) || !m.config) return fail()
  const { vocab, context, width, heads, layers } = m.config
  if (![vocab, context, width, heads, layers].every(Number.isInteger) ||
    vocab < 262 || vocab > 4096 || context < 8 || context > 256 ||
    width < 4 || width > 256 || heads < 1 || heads > 8 || width % heads ||
    layers < 1 || layers > 6) return fail()
  const shapes = tensorShapes(m.config)
  if (!Array.isArray(m.tensors) || m.tensors.length !== shapes.length) return fail()
  let offset = 0
  for (let i = 0; i < shapes.length; i += 1) {
    const [name, shape] = shapes[i]
    const tensor = m.tensors[i]
    const bytes = shape.reduce((a, b) => a * b, 4)
    if (!tensor || tensor.name !== name || tensor.byteOffset !== offset ||
      tensor.bytes !== bytes || !Array.isArray(tensor.shape) ||
      tensor.shape.length !== shape.length || tensor.shape.some((v, j) => v !== shape[j])) return fail()
    offset += bytes
  }
  if (m.bytes !== offset || offset > MAX_MODEL_BYTES) return fail()
  const t = m.tokenizer
  if (!t || t.type !== 'byte-bpe-v1' || t.byteOffset !== 6 ||
    !Array.isArray(t.merges) || t.merges.length > vocab - 262 ||
    t.activeVocabulary !== 262 + t.merges.length) return fail()
  const pairs = new Set<string>()
  const lengths: number[] = Array(262).fill(1)
  let totalPieceBytes = 256
  for (let i = 0; i < t.merges.length; i += 1) {
    const pair = t.merges[i]
    if (!Array.isArray(pair) || pair.length !== 2 ||
      pair.some((v) => !Number.isInteger(v) || v < 6 || v >= 262 + i)) return fail()
    const key = pair.join(',')
    if (pairs.has(key)) return fail()
    pairs.add(key)
    const length = lengths[pair[0]] + lengths[pair[1]]
    totalPieceBytes += length
    if (length > 4096 || totalPieceBytes > 1_000_000) return fail()
    lengths.push(length)
  }
  if (!t.specialTokens || ['pad', 'bos', 'eos', 'user', 'assistant', 'sep']
    .some((key, i) => t.specialTokens[key as keyof typeof t.specialTokens] !== i)) return fail()
  return m
}

export const verifyWeights = async (manifest: ChatManifest, buffer: ArrayBuffer): Promise<void> => {
  if (buffer.byteLength !== manifest.bytes) throw new Error('Nesouhlasí délka vah.')
  const hash = await crypto.subtle.digest('SHA-256', buffer)
  const hex = Array.from(new Uint8Array(hash), (v) => v.toString(16).padStart(2, '0')).join('')
  if (hex !== manifest.sha256) throw new Error('Nesouhlasí kontrolní součet vah.')
  const view = new DataView(buffer)
  for (let i = 0; i < buffer.byteLength; i += 4) {
    const v = view.getFloat32(i, true)
    if (!Number.isFinite(v) || Math.abs(v) > 10000) throw new Error('Neplatná hodnota vah.')
  }
      }
