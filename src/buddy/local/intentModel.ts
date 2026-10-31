// Vlastní malý klasifikátor českých příkazů. Váhy se učí z příkladů.
// Skóre vyjadřuje výsledek modelu, nikoli ověřenou pravděpodobnost správnosti.

export interface IntentExample {
  text: string
  intent: string
}

export interface IntentModel {
  version: 1
  featureCount: number
  labels: string[]
  weights: number[][]
  biases: number[]
}

export interface IntentPrediction {
  intent: string | null
  score: number
  margin: number
}

export interface IntentTrainingOptions {
  featureCount?: number
  epochs?: number
  learningRate?: number
  seed?: number
}

type Features = Array<[index: number, value: number]>
const MAX_TEXT_LENGTH = 500

export const normalizeIntentText = (text: string): string =>
  text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim()

const hash = (text: string, size: number): number => {
  let value = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    value = Math.imul(value ^ text.charCodeAt(i), 16777619)
  }
  return (value >>> 0) % size
}

const featuresFor = (text: string, size: number): Features => {
  if (text.length > MAX_TEXT_LENGTH) return []
  const normalized = normalizeIntentText(text)
  if (!normalized) return []

  const counts = new Map<number, number>()
  const add = (feature: string, weight = 1) => {
    const index = hash(feature, size)
    counts.set(index, (counts.get(index) ?? 0) + weight)
  }

  const words = normalized.split(' ')
  words.forEach((word, index) => {
    add(`slovo:${word}`, 2)
    if (index > 0) add(`dvojice:${words[index - 1]} ${word}`, 2)
    const bounded = `^${word}$`
    for (let n = 3; n <= 5; n += 1) {
      for (let start = 0; start + n <= bounded.length; start += 1) {
        add(`znaky:${bounded.slice(start, start + n)}`)
      }
    }
  })

  const length = Math.hypot(...counts.values())
  return Array.from(counts, ([index, value]) => [index, value / length])
}

const scoresFor = (model: IntentModel, features: Features): number[] => {
  const logits = model.weights.map((weights, label) =>
    features.reduce((sum, [index, value]) => sum + weights[index] * value, model.biases[label])
  )
  const maximum = Math.max(...logits)
  const values = logits.map((value) => Math.exp(value - maximum))
  const total = values.reduce((sum, value) => sum + value, 0)
  return values.map((value) => value / total)
}

/** Učení od nuly; stejná data a nastavení vytvoří stejný model. */
export const trainIntentModel = (
  examples: readonly IntentExample[],
  options: IntentTrainingOptions = {},
): IntentModel => {
  const featureCount = options.featureCount ?? 2048
  const epochs = options.epochs ?? 120
  const learningRate = options.learningRate ?? 0.35
  let seed = options.seed ?? 42

  if (!Number.isInteger(featureCount) || featureCount < 128 || featureCount > 8192) {
    throw new Error('Počet příznaků musí být celé číslo od 128 do 8192.')
  }
  if (!Number.isInteger(epochs) || epochs < 1 || epochs > 500) {
    throw new Error('Počet trénovacích průchodů musí být od 1 do 500.')
  }
  if (!Number.isFinite(learningRate) || learningRate <= 0 || learningRate > 2) {
    throw new Error('Rychlost učení musí být větší než 0 a nejvýše 2.')
  }
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) {
    throw new Error('Trénovací seed musí být celé číslo od 0 do 4294967295.')
  }
  if (examples.length < 2 || examples.length > 10000) {
    throw new Error('Trénink potřebuje 2 až 10000 příkladů.')
  }

  const seen = new Map<string, string>()
  const prepared = examples.map((example) => {
    const features = featuresFor(example.text, featureCount)
    if (!features.length || !/^[a-z][a-z0-9_]{0,63}$/.test(example.intent)) {
      throw new Error('Příklad potřebuje text do 500 znaků a platný identifikátor požadavku.')
    }
    const normalized = normalizeIntentText(example.text)
    const previous = seen.get(normalized)
    if (previous !== undefined && previous !== example.intent) {
      throw new Error('Stejný text je přiřazen dvěma různým požadavkům.')
    }
    seen.set(normalized, example.intent)
    return { features, intent: example.intent }
  })

  const labels = [...new Set(examples.map((example) => example.intent))].sort()
  if (labels.length < 2 || labels.length > 64) {
    throw new Error('Model potřebuje 2 až 64 různých požadavků.')
  }

  const model: IntentModel = {
    version: 1, featureCount, labels,
    weights: labels.map(() => Array<number>(featureCount).fill(0)),
    biases: labels.map(() => 0),
  }
  const order = prepared.map((_, index) => index)

  for (let epoch = 0; epoch < epochs; epoch += 1) {
    for (let i = order.length - 1; i > 0; i -= 1) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
      const j = Math.floor((seed / 4294967296) * (i + 1))
      ;[order[i], order[j]] = [order[j], order[i]]
    }
    const rate = learningRate / (1 + epoch * 0.02)
    for (const index of order) {
      const example = prepared[index]
      const scores = scoresFor(model, example.features)
      labels.forEach((label, labelIndex) => {
        const error = scores[labelIndex] - (label === example.intent ? 1 : 0)
        for (const [feature, value] of example.features) {
          model.weights[labelIndex][feature] -= rate * error * value
        }
        model.biases[labelIndex] -= rate * error
      })
    }
  }
  return model
}

/** Výstup modelu je návrh. Oprávnění a provedení akcí řeší samostatná vrstva. */
export const predictIntent = (
  model: IntentModel,
  text: string,
  minimumScore = 0.7,
  minimumMargin = 0.2,
): IntentPrediction => {
  if (![minimumScore, minimumMargin].every((value) =>
    Number.isFinite(value) && value >= 0 && value <= 1)) {
    throw new Error('Prahy rozpoznávání musí být v rozsahu 0 až 1.')
  }
  const features = featuresFor(text, model.featureCount)
  if (!features.length) return { intent: null, score: 0, margin: 0 }

  const ranked = scoresFor(model, features)
    .map((score, index) => ({ score, intent: model.labels[index] }))
    .sort((a, b) => b.score - a.score)
  const best = ranked[0]
  const margin = best.score - ranked[1].score
  return {
    intent: best.score >= minimumScore && margin >= minimumMargin ? best.intent : null,
    score: best.score,
    margin,
  }
    }
