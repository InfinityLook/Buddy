// ==========================================
// Tvar dat Music Studia (appka za Music Roomem — viz
// src/flagships/music-room/). Tři nezávislé věci sdílející jeden
// store, protože skladba je jen kombinace prvních dvou: beat pattern
// (bicí, syntetizované, žádný soubor navíc), nahrávka (skutečný zvuk
// z mikrofonu, uložený jako Blob v core/utils/fileStorage.ts — stejné
// úložiště jako File Manager, jen jiný prostor id) a skladba (spojí
// jeden pattern a nejvýš jednu nahrávku dohromady, přehraje obojí
// najednou).
// ==========================================

export type DrumSound = 'kick' | 'snare' | 'hihat' | 'clap' | 'tom'

export const DRUM_SOUNDS: DrumSound[] = ['kick', 'snare', 'hihat', 'clap', 'tom']

export const DRUM_LABELS: Record<DrumSound, string> = {
  kick: 'KICK',
  snare: 'SNARE',
  hihat: 'HI-HAT',
  clap: 'CLAP',
  tom: 'TOM',
}

// 8 kroků na jeden takt je appčina výchozí a taky jediná délka, jakou
// uměla uložit před rozšířením na volitelných 8/16 — zůstává jako
// bezpečný výchozí bod pro starší uložený pattern bez vlastního
// pocetKroku (viz musicStudioValidation.ts).
export const KROKU_V_PATTERNU = 8

// 16 kroků appka čte jako šestnáctinové noty (4 kroky na dobu), 8 kroků
// jako osminové (2 kroky na dobu) — obě volby jsou tak vždycky přesně
// jeden takt ve 4/4, jen v jiném rozlišení, ne dva takty osminových not
// (viz useBeatSequencer.ts's krokyNaDobu).
export const POCTY_KROKU_NA_VYBER = [8, 16] as const
export type PocetKroku = (typeof POCTY_KROKU_NA_VYBER)[number]

export interface BeatPattern {
  id: string
  name: string
  bpm: number
  pocetKroku: PocetKroku
  // Jeden boolean seznam na buben, délka vždycky pocetKroku.
  kroky: Record<DrumSound, boolean[]>
  // Hlasitost 0–100 na buben, součást uloženého mixu — appka ji čte i
  // při stažení WAV (vyrenderujPatternNaBuffer v audioEngine.ts), ne
  // jen při živém přehrávání. Chybějící/starší pattern (uložený před
  // touhle appkovou verzí) se čte jako 100 všude, kde appka hlasitost
  // potřebuje — sama appka do dat nikdy nezapíše chybějící hodnotu,
  // jen validace/výchozí stav ji doplňuje.
  hlasitosti: Record<DrumSound, number>
  // Swing/groove 0–75 % — appka o tolik zpozdí liché ("off-beat")
  // kroky proti sudým, ať rytmus zní jako shuffle, ne jako mechanicky
  // přesný metronom (viz swingPosunSekund níž). 0 = appčino původní,
  // úplně rovné chování — i výchozí hodnota pro starší pattern uložený
  // předtím, než appka swing měla vůbec (viz musicStudioValidation.ts).
  swing: number
  createdAt: string
}

export const vychoziHlasitosti = (): Record<DrumSound, number> =>
  Object.fromEntries(DRUM_SOUNDS.map((b) => [b, 100])) as Record<DrumSound, number>

/** Prázdný pattern se všemi kroky vypnutými a hlasitostí na 100 % —
 *  výchozí stav Beat Makeru při otevření a základ pro "Nový beat". */
export const prazdnyPattern = (
  bpm = 96,
  pocetKroku: PocetKroku = KROKU_V_PATTERNU
): Omit<BeatPattern, 'id' | 'name' | 'createdAt'> => ({
  bpm,
  pocetKroku,
  kroky: Object.fromEntries(DRUM_SOUNDS.map((b) => [b, Array(pocetKroku).fill(false)])) as Record<
    DrumSound,
    boolean[]
  >,
  hlasitosti: vychoziHlasitosti(),
  swing: 0,
})

/** Nejvyšší appkou dovolený swing — nad tuhle hranici by se "off-beat"
 *  krok posunul až skoro na místo dalšího kroku, což by nezněl jako
 *  groove, ale jako rozbitý rytmus. Stejná appčina konvence jako
 *  klasické MPC swing rozmezí (tam 50–75 %), jen appka počítá od nuly,
 *  ne od poloviny, ať 0 vždycky znamená "vypnuto". */
export const MAX_SWING = 75

/** O kolik vteřin appka posune daný krok kvůli swingu — jen liché
 *  ("off-beat") kroky se posouvají dozadu, sudé ("on-beat") zůstávají
 *  přesně na místě, protože to je, co swing/groove vůbec znamená: ne
 *  "zpomalit celé tempo", jen zpozdit tu "a" mezi dvěma dobami o
 *  kousek později. Čistá funkce nezávislá na Web Audiu — appka ji volá
 *  jak při živém přehrávání (useBeatSequencer.ts), tak při offline
 *  WAV mixdownu (audioEngine.ts's vyrenderujPatternNaBuffer), ať obě
 *  cesty zní stejně. */
export const swingPosunSekund = (krok: number, sekundNaKrok: number, swing: number): number => {
  if (krok % 2 === 0) return 0
  return (Math.min(MAX_SWING, Math.max(0, swing)) / 100) * sekundNaKrok
}

/** Zachová dosavadní zapnuté kroky při zvětšení/zmenšení délky patternu
 *  (8↔16) — přidané kroky jsou vypnuté, useknuté kroky se ztratí, appka
 *  nikdy nezahodí celý pattern jen kvůli změně rozlišení. */
export const zmenPocetKroku = (
  kroky: Record<DrumSound, boolean[]>,
  novyPocet: PocetKroku
): Record<DrumSound, boolean[]> =>
  Object.fromEntries(
    DRUM_SOUNDS.map((buben) => {
      const puvodni = kroky[buben] ?? []
      return [buben, Array.from({ length: novyPocet }, (_, i) => puvodni[i] ?? false)]
    })
  ) as Record<DrumSound, boolean[]>

// ==========================================
// Tap tempo — appka odvodí BPM z rytmu, jakým uživatel klepe na
// tlačítko, místo aby ho musel znát a zadat ručně. Obě funkce čisté,
// testovatelné bez Date.now()/komponenty — appka jim časy klepnutí
// předává jako obyčejná čísla (ms).
// ==========================================

// Kolik naposledy klepnutých časů appka pro výpočet BPM použije — víc
// by zprůměrovalo i starší, už neplatnou rychlost, kdyby uživatel
// tempo uprostřed klepání změnil.
const MAX_KLEPNUTI_PRO_TEMPO = 8

// Pauza mezi klepnutími delší než tohle appka bere jako "uživatel začal
// klepat úplně znovu", ne pokračování stejné série — jinak by dlouhá
// odmlka (zaváhání, přestávka) zprůměrovala dvě nesouvisející tempa
// do jednoho nesmyslného čísla.
const MAX_MEZERA_KLEPNUTI_MS = 2000

/** Přidá nové klepnutí (Date.now()) do historie — appka historii sama
 *  ořízne na posledních MAX_KLEPNUTI_PRO_TEMPO a při moc dlouhé pauze ji
 *  vynuluje na jediné, právě přijaté klepnutí. */
export const zpracujKlepnutiTempa = (predchozi: number[], novyCasMs: number): number[] => {
  const posledni = predchozi[predchozi.length - 1]
  if (posledni !== undefined && novyCasMs - posledni > MAX_MEZERA_KLEPNUTI_MS) return [novyCasMs]
  return [...predchozi, novyCasMs].slice(-MAX_KLEPNUTI_PRO_TEMPO)
}

/** BPM z průměrného intervalu mezi posledními klepnutími — null, dokud
 *  appka nemá aspoň dvě klepnutí (jedno samo o sobě neurčuje žádný
 *  interval). Ořízne se na appčino platné rozmezí BPM (40–240, stejné
 *  jako ruční vstup ve draft.bpm). */
export const vypocitejBpmZKlepnuti = (casyKlepnutiMs: number[]): number | null => {
  if (casyKlepnutiMs.length < 2) return null
  const intervaly: number[] = []
  for (let i = 1; i < casyKlepnutiMs.length; i++) intervaly.push(casyKlepnutiMs[i] - casyKlepnutiMs[i - 1])
  const prumer = intervaly.reduce((a, b) => a + b, 0) / intervaly.length
  if (prumer <= 0) return null
  return Math.min(240, Math.max(40, Math.round(60000 / prumer)))
}

// Metadata nahrávky — skutečná zvuková data leží v IndexedDB
// (core/utils/fileStorage.ts, stejné úložiště jako File Manager, id
// s prefixem NAHRAVKA_ID_PREFIX níž, ať se prostor id nikdy nepotká
// s File Manager's vlastními id). `mime` appka potřebuje sama —
// MediaRecorder si typ nahrávky vybírá podle toho, co prohlížeč umí
// (webm/mp4), a bez něj by <audio> po obnově ze zálohy nemusel vědět,
// jak blob přehrát (viz core/utils/fileBackup.ts).
export interface Recording {
  id: string
  name: string
  mime: string
  durationSec: number
  createdAt: string
}

export const NAHRAVKA_ID_PREFIX = 'hudba-nahravka-'

/** Přípona pro stažení nahrávky jako reálného souboru — appka nemá
 *  vlastní kontrolu nad tím, jaký přesný MIME MediaRecorder v daném
 *  prohlížeči zvolí (webm/mp4/ogg), takže se z něj přípona odvozuje
 *  místo natvrdo předpokládat jednu. */
export const priponaPodleMime = (mime: string): string => {
  const m = mime.toLowerCase()
  if (m.includes('mp4') || m.includes('m4a')) return 'm4a'
  if (m.includes('wav')) return 'wav'
  if (m.includes('ogg')) return 'ogg'
  return 'webm'
}

/** Kolikrát se má beat opakovat vedle nahrávky dané délky — appčino
 *  živé přehrávání skladby umí `pocetOpakovaniBeatu === 0` ("dokud hraje
 *  nahrávka") řídit průběžně přes onended, ale mixdown do jednoho WAV
 *  souboru (MusicStudio.tsx's vyrenderujSkladbuNaBuffer) potřebuje
 *  dopředu znát přesný, konečný počet opakování, protože se celý mix
 *  renderuje najednou přes OfflineAudioContext, ne krok po kroku živě.
 *  Čistá funkce, testovatelná bez Web Audia. */
export const spocitejPocetOpakovaniBeatu = (
  pocetOpakovaniBeatu: number,
  delkaJednohoOpakovaniSekund: number,
  delkaNahravkySekund: number
): number => {
  if (pocetOpakovaniBeatu > 0) return pocetOpakovaniBeatu
  if (delkaJednohoOpakovaniSekund <= 0) return 1
  return Math.max(1, Math.ceil(delkaNahravkySekund / delkaJednohoOpakovaniSekund))
}

export interface Song {
  id: string
  name: string
  beatPatternId: string | null
  recordingId: string | null
  // Kolikrát appka sama zastaví přehrávání beatu, než nahrávka dohraje
  // do konce — 0 znamená "dokud hraje nahrávka" (appčino původní,
  // pořád platné chování, zachované jako výchozí hodnota). Nahrávka
  // sama vždycky dohraje celá bez ohledu na tohle číslo, appka jím
  // reguluje jen to, jak dlouho hraje beat pod ní.
  pocetOpakovaniBeatu: number
  hlasitostBeatu: number // 0–100, výchozí 100 (appčino chování před vyvážením)
  hlasitostNahravky: number // 0–100, výchozí 100
  createdAt: string
}
