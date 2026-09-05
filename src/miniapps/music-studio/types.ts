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

export type DrumSound = 'kick' | 'snare' | 'hihat'

export const DRUM_SOUNDS: DrumSound[] = ['kick', 'snare', 'hihat']

export const DRUM_LABELS: Record<DrumSound, string> = {
  kick: 'KICK',
  snare: 'SNARE',
  hihat: 'HI-HAT',
}

// 8 kroků na jeden takt (osminové noty ve 4/4) — dost na skutečný
// rytmus, ne 16 nezávislých bodů, co by appku zbytečně zesložitily.
export const KROKU_V_PATTERNU = 8

export interface BeatPattern {
  id: string
  name: string
  bpm: number
  // Jeden boolean seznam na buben, délka vždycky KROKU_V_PATTERNU.
  kroky: Record<DrumSound, boolean[]>
  createdAt: string
}

/** Prázdný pattern se všemi kroky vypnutými — výchozí stav Beat Makeru
 *  při otevření a základ pro "Nový beat". */
export const prazdnyPattern = (bpm = 96): Omit<BeatPattern, 'id' | 'name' | 'createdAt'> => ({
  bpm,
  kroky: {
    kick: Array(KROKU_V_PATTERNU).fill(false),
    snare: Array(KROKU_V_PATTERNU).fill(false),
    hihat: Array(KROKU_V_PATTERNU).fill(false),
  },
})

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

export interface Song {
  id: string
  name: string
  beatPatternId: string | null
  recordingId: string | null
  createdAt: string
}
