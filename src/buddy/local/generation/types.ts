export interface BuddyChatMessage {
  role: 'user' | 'assistant'
  text: string
}

/** Generátor vrací pouze text. Nemá přístup k adaptérům akcí ani ke storům. */
export interface BuddyTextGenerator {
  generate: (messages: readonly BuddyChatMessage[], signal: AbortSignal) => Promise<string | null>
  dispose: () => void
}

export interface ChatManifest {
  version: 1
  architecture: 'buddy-transformer-v1'
  config: { vocab: number; context: number; width: number; heads: number; layers: number }
  format: 'float32-le'
  bytes: number
  sha256: string
  activation: 'gelu-erf'
  layerNormEpsilon: number
  tensors: Array<{ name: string; shape: number[]; byteOffset: number; bytes: number }>
  tokenizer: {
    type: 'byte-bpe-v1'
    byteOffset: 6
    merges: number[][]
    activeVocabulary: number
    specialTokens: { pad: 0; bos: 1; eos: 2; user: 3; assistant: 4; sep: 5 }
  }
  tiedOutputWeight: 'tokens.weight'
}

export interface GenerationMetrics {
  promptTokens: number
  generatedTokens: number
  elapsedMs: number
  generationMs: number
  loadMs: number
  initializationMs: number
  modelBytes: number
  endedWithEos: boolean
}
