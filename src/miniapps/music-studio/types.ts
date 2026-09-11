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
})

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
