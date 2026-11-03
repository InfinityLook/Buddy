import type { ChatManifest } from './types'

const linear = (x: Float32Array, weight: Float32Array, bias: Float32Array): Float32Array => {
  const out = new Float32Array(bias.length)
  for (let row = 0; row < out.length; row += 1) {
    let sum = bias[row]
    const offset = row * x.length
    for (let col = 0; col < x.length; col += 1) sum += weight[offset + col] * x[col]
    out[row] = sum
  }
  return out
}

const norm = (x: Float32Array, weight: Float32Array, bias: Float32Array): Float32Array => {
  let mean = 0
  for (const value of x) mean += value
  mean /= x.length
  let variance = 0
  for (const value of x) variance += (value - mean) ** 2
  const scale = 1 / Math.sqrt(variance / x.length + 0.00001)
  return Float32Array.from(x, (v, i) => (v - mean) * scale * weight[i] + bias[i])
}

// Aproximace erf má maximální absolutní chybu přibližně 1,5e-7.
const gelu = (x: number): number => {
  const a = Math.abs(x / Math.SQRT2)
  const t = 1 / (1 + 0.3275911 * a)
  const erf = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a)
  return x * 0.5 * (1 + (x < 0 ? -erf : erf))
}

/** CPU inference s KV cache. Instance obsluhuje jeden výpočet ve Workeru. */
export class BuddyTransformer {
  private readonly tensors = new Map<string, Float32Array>()
  private readonly keys: Float32Array[]
  private readonly values: Float32Array[]
  private position = 0

  constructor(readonly manifest: ChatManifest, buffer: ArrayBuffer) {
    if (buffer.byteLength !== manifest.bytes) throw new Error('Nesouhlasí velikost modelu.')
    // DataView podporuje i platformu s jiným pořadím bajtů.
    const view = new DataView(buffer)
    const all = new Float32Array(buffer.byteLength / 4)
    for (let i = 0; i < all.length; i += 1) all[i] = view.getFloat32(i * 4, true)
    for (const tensor of manifest.tensors) {
      this.tensors.set(tensor.name, all.subarray(tensor.byteOffset / 4, (tensor.byteOffset + tensor.bytes) / 4))
    }
    const { layers, context, width } = manifest.config
    this.keys = Array.from({ length: layers }, () => new Float32Array(context * width))
    this.values = Array.from({ length: layers }, () => new Float32Array(context * width))
  }

  reset(): void { this.position = 0 }

  /** Logity pro další token; každá pozice se vyhodnotí právě jednou. */
  step(token: number, output = true): Float32Array {
    const { width: w, heads, layers, context } = this.manifest.config
    if (!Number.isInteger(token) || token < 0 || token >= this.manifest.tokenizer.activeVocabulary || this.position >= context) {
      throw new Error('Neplatný vstup modelu nebo vyčerpaný kontext.')
    }
    const get = (name: string): Float32Array => {
      const value = this.tensors.get(name)
      if (!value) throw new Error('Chybí tensor modelu.')
      return value
    }
    const embeddings = get('tokens.weight')
    const positions = get('positions.weight')
    let x: Float32Array = Float32Array.from({ length: w }, (_, i) => embeddings[token * w + i] + positions[this.position * w + i])
    for (let block = 0; block < layers; block += 1) {
      const p = `blocks.${block}.`
      const qkv = linear(norm(x, get(p + 'ln1.weight'), get(p + 'ln1.bias')), get(p + 'qkv.weight'), get(p + 'qkv.bias'))
      this.keys[block].set(qkv.subarray(w, 2 * w), this.position * w)
      this.values[block].set(qkv.subarray(2 * w), this.position * w)
      const attention = new Float32Array(w)
      const size = w / heads
      for (let head = 0; head < heads; head += 1) {
        const start = head * size
        const scores = new Float64Array(this.position + 1)
        let max = -Infinity
        for (let pos = 0; pos <= this.position; pos += 1) {
          let score = 0
          for (let j = start; j < start + size; j += 1) score += qkv[j] * this.keys[block][pos * w + j]
          scores[pos] = score / Math.sqrt(size)
          max = Math.max(max, scores[pos])
        }
        let total = 0
        for (let pos = 0; pos < scores.length; pos += 1) total += (scores[pos] = Math.exp(scores[pos] - max))
        for (let j = start; j < start + size; j += 1) {
          let sum = 0
          for (let pos = 0; pos < scores.length; pos += 1) sum += scores[pos] / total * this.values[block][pos * w + j]
          attention[j] = sum
        }
      }
      const projected = linear(attention, get(p + 'proj.weight'), get(p + 'proj.bias'))
      x = Float32Array.from(x, (v, i) => v + projected[i])
      const hidden = linear(norm(x, get(p + 'ln2.weight'), get(p + 'ln2.bias')), get(p + 'ff1.weight'), get(p + 'ff1.bias'))
      for (let i = 0; i < hidden.length; i += 1) hidden[i] = gelu(hidden[i])
      const feedForward = linear(hidden, get(p + 'ff2.weight'), get(p + 'ff2.bias'))
      x = Float32Array.from(x, (v, i) => v + feedForward[i])
    }
    this.position += 1
    if (!output) return new Float32Array()
    x = norm(x, get('norm.weight'), get('norm.bias'))
    const logits = new Float32Array(this.manifest.tokenizer.activeVocabulary)
    for (let row = 0; row < logits.length; row += 1) {
      let sum = 0
      for (let col = 0; col < w; col += 1) sum += embeddings[row * w + col] * x[col]
      logits[row] = sum
    }
    return logits
  }
}

/** Greedy dekódování je reprodukovatelné; řídicí tokeny se nikdy negenerují. */
export const nextChatToken = (logits: Float32Array): number => {
  let best = 2
  for (let i = 0; i < logits.length; i += 1) {
    if (!Number.isFinite(logits[i])) throw new Error('Model vytvořil neplatné logity.')
    if ((i === 2 || i >= 6) && logits[i] > logits[best]) best = i
  }
  return best
      }
