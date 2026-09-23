export interface Flashcard {
  id: string
  question: string
  answer: string
  // Balíček, do kterého kartička patří (předmět, okruh…). Umožňuje učit
  // se jen část sady místo všeho najednou.
  deck: string
  // Označení "tuhle umím". Dá se kdykoli vzít zpět.
  known: boolean
  // Nastaví se, když uživatel kartičku poprvé označí za naučenou, a už
  // se nikdy nemaže. Díky tomu se XP za jednu kartičku připíše jen
  // jednou a nejde ho farmit přepínáním tam a zpět.
  learnedAt: string | null
  // Leitnerova krabice — čím výš, tím delší interval do dalšího
  // opakování (viz LEITNER_INTERVALY_DNY níž). Nová kartička je v
  // krabici 1.
  box: number
  // Kdy má appka kartičku příště nabídnout k opakování. null = hned
  // (nová kartička, nebo starší uložená bez tohoto pole — appka ji
  // radši ukáže dřív, než by ji tichem přeskočila).
  dueAt: string | null
}

export const DEFAULT_DECK = 'Obecné'

// Pseudobalíček pro přepínač — neodpovídá žádné hodnotě v datech
export const ALL_DECKS = 'Vše'

// Nové kartičky se zakládají prázdné; ukázkový obsah tu nikdy nebyl
// k ničemu — viz DEMO_CARD_IDS níž.
export const INITIAL_CARDS: Flashcard[] = []

// Ukázkové kartičky o Reactu a JavaScriptu ležely v úložišti i studentům,
// kterým programování nic neříká, a nešly smazat (mazání chybělo).
// Poznáme je podle id i otázky zároveň, ať omylem nezahodíme vlastní
// kartičku, která se náhodou trefí do stejného id.
export const DEMO_CARD_IDS = ['1', '2', '3']
export const DEMO_CARD_QUESTIONS = [
  'Co je to React Hook?',
  'Jaký je rozdíl mezi LET a CONST?',
  'Co znamená zkratka DOM?',
]

// ==========================================
// Opakování s rozestupy (spaced repetition) — Leitnerova krabicová
// metoda. Appčino hodnocení je čistě binární ("Umím"/"Ještě ne"), takže
// se sem hodí líp než SM-2 s jeho koeficientem obtížnosti: špatná
// odpověď vrátí kartičku do krabice 1, dobrá ji posune o jednu výš.
// Vyšší krabice = delší interval, než appka kartičku nabídne znovu —
// dobře naučené kartičky tak zabírají čím dál míň studijního času,
// zatímco ty, co dělají problém, se vrací brzy.
// ==========================================

// Index 0 = interval krabice 1 (dnů do dalšího opakování po první
// správné odpovědi), index 5 = krabice 6 (appčino "umím to dobře").
export const LEITNER_INTERVALY_DNY: readonly number[] = [0, 1, 3, 7, 14, 30]

export const MIN_KRABICE = 1
export const MAX_KRABICE = LEITNER_INTERVALY_DNY.length

// Špatná odpověď vždycky spadne zpátky na začátek — jedna chyba nesmí
// stát jen jeden stupínek, jinak by appka kartičku, co dělá problém,
// pořád nabízela skoro stejně zřídka jako tu, co uživatel umí.
export const dalsiKrabice = (box: number, spravne: boolean): number => {
  if (!spravne) return MIN_KRABICE
  return Math.min(MAX_KRABICE, box + 1)
}

// Termín dalšího opakování podle toho, do jaké krabice kartička právě
// spadla. `ted` jde přes parametr kvůli testovatelnosti bez skutečného
// systémového času.
export const vypocitejDalsiTermin = (box: number, ted: Date = new Date()): string => {
  const bezpecnaKrabice = Math.min(Math.max(Math.round(box), MIN_KRABICE), MAX_KRABICE)
  const dny = LEITNER_INTERVALY_DNY[bezpecnaKrabice - 1]
  const vysledek = new Date(ted)
  vysledek.setDate(vysledek.getDate() + dny)
  return vysledek.toISOString()
}

// null/nerozeznatelné datum znamená "appka o termínu nic neví" — radši
// ukázat kartičku dřív, než ji tichem přeskočit navždycky.
export const jeKOpakovaniDnes = (dueAt: string | null | undefined, ted: Date = new Date()): boolean => {
  if (!dueAt) return true
  const cas = new Date(dueAt).getTime()
  if (!Number.isFinite(cas)) return true
  return cas <= ted.getTime()
}
