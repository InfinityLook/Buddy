import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  normalizeIntentText,
  predictIntent,
  trainIntentModel,
} from '../../src/buddy/local/intentModel.ts'
import type { IntentExample } from '../../src/buddy/local/intentModel.ts'
import {
  BUDDY_INTENTS,
  TRAINING_EXAMPLES,
  VALIDATION_EXAMPLES,
} from '../../src/buddy/local/trainingData.ts'

// Spouštění z kořene repozitáře s Node.js 24:
// node --experimental-strip-types tools/buddy-ai/train.ts

const root = new URL('../../', import.meta.url)
const modelFile = new URL('public/buddy-ai/model-v1.json', root)
const reportFile = new URL('tools/buddy-ai/output/training-report.json', root)
const options = { featureCount: 2048, epochs: 120, learningRate: 0.35, seed: 42 }
const thresholds = { minimumScore: 0.7, minimumMargin: 0.2 }
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex')

// Kontrola proběhne před tréninkem a před zápisem výstupních souborů.
const seen = new Set<string>()
const validateExamples = (name: string, examples: readonly IntentExample[]) => {
  if (!examples.length) throw new Error(`${name}: chybí příklady.`)

  for (const example of examples) {
    if (typeof example.text !== 'string' || typeof example.intent !== 'string') {
      throw new Error(`${name}: text i identifikátor musí být řetězce.`)
    }
    if (!(BUDDY_INTENTS as readonly string[]).includes(example.intent)) {
      throw new Error(`${name}: neznámý požadavek ${example.intent}.`)
    }
    const normalized = normalizeIntentText(example.text)
    if (!normalized || example.text.length > 500) {
      throw new Error(`${name}: příklad potřebuje neprázdný text do 500 znaků.`)
    }
    if (seen.has(normalized)) {
      throw new Error(`${name}: opakovaný příklad nebo překryv sad: ${example.text}`)
    }
    seen.add(normalized)
  }

  for (const intent of BUDDY_INTENTS) {
    if (!examples.some((example) => example.intent === intent)) {
      throw new Error(`${name}: chybí příklady pro ${intent}.`)
    }
  }
}

validateExamples('Trénovací sada', TRAINING_EXAMPLES)
validateExamples('Ověřovací sada', VALIDATION_EXAMPLES)

console.log(`Trénuji ${BUDDY_INTENTS.length} kategorií z ${TRAINING_EXAMPLES.length} příkladů.`)
const started = performance.now()
const model = trainIntentModel(TRAINING_EXAMPLES, options)
const trainingMilliseconds = Math.round(performance.now() - started)

if (!model.weights.flat().every(Number.isFinite) || !model.biases.every(Number.isFinite)) {
  throw new Error('Trénování vytvořilo neplatné číselné váhy.')
}

// Zaokrouhlení zmenší JSON. Ověřujeme už tento výsledný model.
model.weights = model.weights.map((row) => row.map((value) => Number(value.toFixed(6))))
model.biases = model.biases.map((value) => Number(value.toFixed(6)))

const results = VALIDATION_EXAMPLES.map((example) => {
  const prediction = predictIntent(
    model, example.text, thresholds.minimumScore, thresholds.minimumMargin,
  )
  return {
    text: example.text,
    expected: example.intent,
    predicted: prediction.intent,
    score: prediction.score,
    margin: prediction.margin,
  }
})

const total = results.length
const accepted = results.filter((result) => result.predicted !== null)
const correct = accepted.filter((result) => result.predicted === result.expected).length
const wrong = accepted.length - correct
const abstained = total - accepted.length
const modelText = `${JSON.stringify(model)}\n`

const report = {
  version: 1,
  createdAt: new Date().toISOString(),
  algorithm: 'hashed-ngram-softmax-sgd',
  trainingOptions: options,
  thresholds,
  trainingMilliseconds,
  data: {
    categories: BUDDY_INTENTS.length,
    trainingExamples: TRAINING_EXAMPLES.length,
    validationExamples: VALIDATION_EXAMPLES.length,
    sha256: sha256(JSON.stringify({ training: TRAINING_EXAMPLES, validation: VALIDATION_EXAMPLES })),
  },
  model: {
    file: 'public/buddy-ai/model-v1.json',
    bytes: Buffer.byteLength(modelText, 'utf8'),
    sha256: sha256(modelText),
  },
  validation: {
    total,
    accepted: accepted.length,
    correct,
    wrong,
    abstained,
    coverage: accepted.length / total,
    accuracyAmongAccepted: accepted.length ? correct / accepted.length : null,
    correctOfAll: correct / total,
    results,
  },
  note: 'Průběžná ověřovací sada slouží k ladění. Výsledek není nezávislý benchmark ani oprávnění provádět akce.',
}

await mkdir(dirname(fileURLToPath(modelFile)), { recursive: true })
await mkdir(dirname(fileURLToPath(reportFile)), { recursive: true })
await writeFile(modelFile, modelText, 'utf8')
await writeFile(reportFile, `${JSON.stringify(report, null, 2)}\n`, 'utf8')

if (sha256(await readFile(modelFile, 'utf8')) !== report.model.sha256) {
  throw new Error('Kontrola uloženého modelu neprošla.')
}

console.log(`Model: public/buddy-ai/model-v1.json (${report.model.bytes} bajtů)`)
console.log('Zpráva: tools/buddy-ai/output/training-report.json')
console.log(`Správně z celé ověřovací sady: ${correct}/${total}`)
console.log(`Chybně zvolené kategorie: ${wrong}. Bez rozhodnutí: ${abstained}.`)
console.log(`Doba samotného trénování: ${trainingMilliseconds} ms na tomto stroji.`)
