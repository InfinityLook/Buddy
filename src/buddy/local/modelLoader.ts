import type { IntentModel } from './intentModel'

const MODEL_URL = `${import.meta.env.BASE_URL}buddy-ai/model-v1.json`
const CACHE_NAME = 'buddy-ai-model-v1'
const TIMEOUT_MS = 8000

let modelPromise: Promise<IntentModel> | null = null

const isVector = (value: unknown, length: number): value is number[] =>
  Array.isArray(value) && value.length === length &&
  value.every((item) => typeof item === 'number' &&
    Number.isFinite(item) && Math.abs(item) <= 10000)

/** Kontrola formátu a rozměrů před prvním použitím stažených vah. */
export const isIntentModel = (value: unknown): value is IntentModel => {
  if (typeof value !== 'object' || value === null) return false
  const model = value as Record<string, unknown>
  const { featureCount, labels, weights, biases } = model

  if (model.version !== 1 || typeof featureCount !== 'number' ||
    !Number.isInteger(featureCount) || featureCount < 128 || featureCount > 8192) {
    return false
  }
  if (!Array.isArray(labels) || labels.length < 2 || labels.length > 64 ||
    !labels.every((label) => typeof label === 'string' && /^[a-z][a-z0-9_]{0,63}$/.test(label)) ||
    new Set(labels).size !== labels.length) {
    return false
  }
  return Array.isArray(weights) && weights.length === labels.length &&
    weights.every((row) => isVector(row, featureCount)) &&
    isVector(biases, labels.length)
}

const parseModel = (value: unknown): IntentModel => {
  if (!isIntentModel(value)) {
    throw new Error('Soubor modelu má neplatný formát. Je potřeba znovu spustit trénování.')
  }
  return value
}

const readCachedModel = async (): Promise<IntentModel | null> => {
  if (typeof caches === 'undefined') return null
  try {
    const cache = await caches.open(CACHE_NAME)
    const response = await cache.match(MODEL_URL)
    return response ? parseModel(await response.json()) : null
  } catch {
    // Nedostupná nebo poškozená cache nesmí blokovat načtení ze sítě.
    return null
  }
}

const downloadModel = async (): Promise<IntentModel> => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(MODEL_URL, {
      cache: 'no-cache',
      signal: controller.signal,
    })
    if (!response.ok) {
      throw new Error(`Model není dostupný (HTTP ${response.status}). Zkontroluj soubor public/buddy-ai/model-v1.json.`)
    }
    const model = parseModel(await response.json())

    if (typeof caches !== 'undefined') {
      try {
        const cache = await caches.open(CACHE_NAME)
        await cache.put(MODEL_URL, new Response(JSON.stringify(model), {
          headers: { 'Content-Type': 'application/json' },
        }))
      } catch {
        // I bez místa v cache lze model používat v aktuálním běhu aplikace.
      }
    }
    return model
  } finally {
    clearTimeout(timeout)
  }
}

const loadModel = async (): Promise<IntentModel> => {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    const cached = await readCachedModel()
    if (cached) return cached
    throw new Error('Model ještě není uložený v telefonu. Připoj se k internetu a otevři Buddyho asistenta.')
  }

  try {
    return await downloadModel()
  } catch (error) {
    const cached = await readCachedModel()
    if (cached) return cached

    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Načítání modelu trvá příliš dlouho. Zkontroluj připojení a zkus to znovu.')
    }
    if (error instanceof SyntaxError) {
      throw new Error('Adresa modelu nevrátila platný JSON. Zkontroluj nasazení souboru model-v1.json.')
    }
    if (error instanceof TypeError) {
      throw new Error('Model se nepodařilo stáhnout. Zkontroluj připojení a zkus to znovu.')
    }
    throw error
  }
}

/** Souběžné požadavky sdílejí jedno načtení. Po chybě lze načítání opakovat. */
export const loadBuddyModel = (): Promise<IntentModel> => {
  if (!modelPromise) {
    modelPromise = loadModel().catch((error: unknown) => {
      modelPromise = null
      throw error
    })
  }
  return modelPromise
      }
