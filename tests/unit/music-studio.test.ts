import { describe, it, expect } from 'vitest'
import {
  zmenPocetKroku,
  priponaPodleMime,
  prazdnyPattern,
  spocitejPocetOpakovaniBeatu,
  zpracujKlepnutiTempa,
  vypocitejBpmZKlepnuti,
  swingPosunSekund,
  MAX_SWING,
  DRUM_SOUNDS,
} from '@/miniapps/music-studio/types'
import { bufferNaWavBlob, type ZvukovaData } from '@/miniapps/music-studio/wavEncoder'
import { spocitejVrcholyVlny } from '@/miniapps/music-studio/waveform'
import { validateMusicStudioData } from '@/core/utils/musicStudioValidation'

describe('zmenPocetKroku', () => {
  it('při zvětšení zachová dosavadní kroky a doplní zbytek na false', () => {
    const kroky = { kick: [true, false, true, false, false, false, false, false], snare: Array(8).fill(false), hihat: Array(8).fill(false), clap: Array(8).fill(false), tom: Array(8).fill(false) }
    const novy = zmenPocetKroku(kroky, 16)
    expect(novy.kick).toHaveLength(16)
    expect(novy.kick.slice(0, 8)).toEqual([true, false, true, false, false, false, false, false])
    expect(novy.kick.slice(8)).toEqual(Array(8).fill(false))
  })

  it('při zmenšení useknuté kroky ztratí, zbytek zachová', () => {
    const puvodniKick = Array(16).fill(false)
    puvodniKick[0] = true
    puvodniKick[10] = true
    const kroky = { kick: puvodniKick, snare: Array(16).fill(false), hihat: Array(16).fill(false), clap: Array(16).fill(false), tom: Array(16).fill(false) }
    const novy = zmenPocetKroku(kroky, 8)
    expect(novy.kick).toHaveLength(8)
    expect(novy.kick[0]).toBe(true)
    // krok 10 byl useknutý, appka o něj nepečuje
    expect(novy.kick.every((v, i) => (i === 0 ? v === true : v === false))).toBe(true)
  })

  it('pokryje všechny bubny, ne jen ty, co v původních kroky byly', () => {
    const novy = zmenPocetKroku({} as never, 8)
    for (const buben of DRUM_SOUNDS) expect(novy[buben]).toEqual(Array(8).fill(false))
  })
})

describe('priponaPodleMime', () => {
  it('rozpozná webm/mp4/wav/ogg a jinak spadne na webm', () => {
    expect(priponaPodleMime('audio/webm;codecs=opus')).toBe('webm')
    expect(priponaPodleMime('audio/mp4')).toBe('m4a')
    expect(priponaPodleMime('audio/wav')).toBe('wav')
    expect(priponaPodleMime('audio/ogg')).toBe('ogg')
    expect(priponaPodleMime('neco/neznameho')).toBe('webm')
  })
})

describe('prazdnyPattern', () => {
  it('vytvoří pattern se všemi bubny na 100% hlasitosti a vypnutými kroky', () => {
    const p = prazdnyPattern(120, 16)
    expect(p.bpm).toBe(120)
    expect(p.pocetKroku).toBe(16)
    for (const buben of DRUM_SOUNDS) {
      expect(p.kroky[buben]).toHaveLength(16)
      expect(p.kroky[buben].every((v) => v === false)).toBe(true)
      expect(p.hlasitosti[buben]).toBe(100)
    }
  })
})

describe('spocitejPocetOpakovaniBeatu', () => {
  it('kladný pocetOpakovaniBeatu se použije beze změny, i kdyby nesouhlasil s délkou nahrávky', () => {
    expect(spocitejPocetOpakovaniBeatu(3, 2, 100)).toBe(3)
  })

  it('nulový pocetOpakovaniBeatu (appčino "dokud hraje nahrávka") dopočítá počet opakování z délky nahrávky', () => {
    // Jedno opakování 4 s, nahrávka 10 s → potřeba aspoň 3 opakování (12 s ≥ 10 s)
    expect(spocitejPocetOpakovaniBeatu(0, 4, 10)).toBe(3)
  })

  it('nahrávka přesně dělitelná délkou opakování nepřidá zbytečné opakování navíc', () => {
    expect(spocitejPocetOpakovaniBeatu(0, 5, 15)).toBe(3)
  })

  it('nulová/záporná délka opakování se ošetří jako 1 opakování, ne dělení nulou', () => {
    expect(spocitejPocetOpakovaniBeatu(0, 0, 10)).toBe(1)
  })

  it('nulová délka nahrávky (žádná nahrávka) vrátí aspoň 1 opakování', () => {
    expect(spocitejPocetOpakovaniBeatu(0, 4, 0)).toBe(1)
  })
})

describe('zpracujKlepnutiTempa / vypocitejBpmZKlepnuti', () => {
  it('jedno klepnutí neurčuje žádné BPM (chybí interval)', () => {
    const historie = zpracujKlepnutiTempa([], 1000)
    expect(historie).toEqual([1000])
    expect(vypocitejBpmZKlepnuti(historie)).toBeNull()
  })

  it('dvě klepnutí po 500 ms dají 120 BPM', () => {
    let historie = zpracujKlepnutiTempa([], 0)
    historie = zpracujKlepnutiTempa(historie, 500)
    expect(vypocitejBpmZKlepnuti(historie)).toBe(120)
  })

  it('čtyři pravidelná klepnutí po 250 ms dají 240 BPM (průměr intervalů)', () => {
    let historie: number[] = []
    for (const cas of [0, 250, 500, 750]) historie = zpracujKlepnutiTempa(historie, cas)
    expect(vypocitejBpmZKlepnuti(historie)).toBe(240)
  })

  it('dlouhá pauza (> 2000 ms) vynuluje historii na jediné nové klepnutí', () => {
    let historie = zpracujKlepnutiTempa([], 0)
    historie = zpracujKlepnutiTempa(historie, 500)
    historie = zpracujKlepnutiTempa(historie, 3000)
    expect(historie).toEqual([3000])
    expect(vypocitejBpmZKlepnuti(historie)).toBeNull()
  })

  it('appka drží nejvýš posledních 8 klepnutí, starší zahodí', () => {
    let historie: number[] = []
    for (let i = 0; i <= 10; i++) historie = zpracujKlepnutiTempa(historie, i * 100)
    expect(historie).toHaveLength(8)
    expect(historie[0]).toBe(300)
    expect(historie[historie.length - 1]).toBe(1000)
  })

  it('BPM se ořízne na appčino platné rozmezí 40–240', () => {
    // Interval 3000 ms -> 20 BPM, appka ořízne na 40
    let historie = zpracujKlepnutiTempa([], 0)
    historie = zpracujKlepnutiTempa(historie, 3000 - 1) // těsně pod hranicí dlouhé pauzy
    // Použij menší mezeru, co pauzu nespustí, ale pořád dá extrémní BPM
    historie = [0, 1999]
    expect(vypocitejBpmZKlepnuti(historie)).toBe(40)
  })
})

describe('swingPosunSekund', () => {
  it('sudý (on-beat) krok se nikdy neposune, ať je swing jakýkoli', () => {
    expect(swingPosunSekund(0, 0.5, 75)).toBe(0)
    expect(swingPosunSekund(2, 0.5, 50)).toBe(0)
  })

  it('nulový swing neposune ani lichý krok', () => {
    expect(swingPosunSekund(1, 0.5, 0)).toBe(0)
  })

  it('lichý krok se posune o odpovídající procento délky kroku', () => {
    // 50 % swingu z 0.5 s kroku = 0.25 s posun
    expect(swingPosunSekund(1, 0.5, 50)).toBeCloseTo(0.25)
    expect(swingPosunSekund(3, 0.2, 25)).toBeCloseTo(0.05)
  })

  it('swing nad appčino maximum (75) se ořízne', () => {
    expect(swingPosunSekund(1, 1, 200)).toBeCloseTo(MAX_SWING / 100)
  })

  it('záporný swing se ořízne na 0 (žádný posun)', () => {
    expect(swingPosunSekund(1, 1, -20)).toBe(0)
  })
})

describe('bufferNaWavBlob', () => {
  const fingovanaData = (vzorky: number[]): ZvukovaData => ({
    numberOfChannels: 1,
    length: vzorky.length,
    sampleRate: 44100,
    getChannelData: () => Float32Array.from(vzorky),
  })

  it('vytvoří platnou WAV hlavičku (RIFF/WAVE/data)', async () => {
    const blob = bufferNaWavBlob(fingovanaData([0, 0.5, -0.5, 1, -1]))
    expect(blob.type).toBe('audio/wav')
    const buffer = await blob.arrayBuffer()
    const view = new DataView(buffer)
    const ctenoRetezec = (offset: number, delka: number) =>
      Array.from({ length: delka }, (_, i) => String.fromCharCode(view.getUint8(offset + i))).join('')
    expect(ctenoRetezec(0, 4)).toBe('RIFF')
    expect(ctenoRetezec(8, 4)).toBe('WAVE')
    expect(ctenoRetezec(36, 4)).toBe('data')
  })

  it('zapíše správný počet PCM16 vzorků se správnými hodnotami', async () => {
    const blob = bufferNaWavBlob(fingovanaData([0, 1, -1]))
    const buffer = await blob.arrayBuffer()
    // 44 bajtů hlavičky + 3 vzorky * 2 bajty (mono, 16bit)
    expect(buffer.byteLength).toBe(44 + 6)
    const view = new DataView(buffer)
    expect(view.getInt16(44, true)).toBe(0)
    expect(view.getInt16(46, true)).toBe(0x7fff)
    expect(view.getInt16(48, true)).toBe(-0x8000)
  })
})

describe('spocitejVrcholyVlny', () => {
  it('prázdná data vrátí samé nuly, ne pád', () => {
    const vrcholy = spocitejVrcholyVlny({ length: 0, getChannelData: () => new Float32Array(0) }, 10)
    expect(vrcholy).toHaveLength(10)
    expect(vrcholy.every((v) => v === 0)).toBe(true)
  })

  it('vrátí vrchol (ne průměr) amplitudy pro každý úsek', () => {
    // 4 vzorky, 2 sloupce -> [0, 1] a [-1, 0], vrcholy [1, 1]
    const data = Float32Array.from([0, 1, -1, 0])
    const vrcholy = spocitejVrcholyVlny({ length: 4, getChannelData: () => data }, 2)
    expect(vrcholy).toEqual([1, 1])
  })
})

describe('validateMusicStudioData', () => {
  it('starší pattern bez pocetKroku/hlasitosti/clap/tom appka doplní na bezpečné výchozí hodnoty', () => {
    const vysledek = validateMusicStudioData({
      patterns: [
        {
          id: 'a',
          name: 'Starý beat',
          bpm: 100,
          createdAt: '2024-01-01',
          kroky: { kick: Array(8).fill(true), snare: Array(8).fill(false), hihat: Array(8).fill(false) },
        },
      ],
      recordings: [],
      songs: [],
    })
    expect(vysledek.success).toBe(true)
    if (!vysledek.success) return
    const p = vysledek.data.patterns[0]
    expect(p.pocetKroku).toBe(8)
    expect(p.kroky.clap).toEqual(Array(8).fill(false))
    expect(p.kroky.tom).toEqual(Array(8).fill(false))
    expect(p.hlasitosti.kick).toBe(100)
    expect(p.hlasitosti.clap).toBe(100)
  })

  it('starší pattern bez swingu appka doplní na 0 (vypnuto, appčino původní chování)', () => {
    const vysledek = validateMusicStudioData({
      patterns: [
        {
          id: 'a',
          name: 'Starý beat',
          bpm: 100,
          createdAt: '2024-01-01',
          kroky: { kick: Array(8).fill(true), snare: Array(8).fill(false), hihat: Array(8).fill(false) },
        },
      ],
      recordings: [],
      songs: [],
    })
    expect(vysledek.success).toBe(true)
    if (!vysledek.success) return
    expect(vysledek.data.patterns[0].swing).toBe(0)
  })

  it('swing mimo rozsah 0–75 se ořízne', () => {
    const vysledek = validateMusicStudioData({
      patterns: [
        {
          id: 'a',
          name: 'B',
          bpm: 100,
          createdAt: '2024-01-01',
          kroky: { kick: Array(8).fill(false), snare: Array(8).fill(false), hihat: Array(8).fill(false), clap: Array(8).fill(false), tom: Array(8).fill(false) },
          swing: 999,
        },
      ],
      recordings: [],
      songs: [],
    })
    expect(vysledek.success).toBe(true)
    if (!vysledek.success) return
    expect(vysledek.data.patterns[0].swing).toBe(75)
  })

  it('neplatný pocetKroku (mimo 8/16) spadne na 8, hlasitost mimo rozsah se ořízne', () => {
    const vysledek = validateMusicStudioData({
      patterns: [
        {
          id: 'a',
          name: 'B',
          bpm: 100,
          createdAt: '2024-01-01',
          pocetKroku: 7,
          kroky: { kick: Array(7).fill(false), snare: Array(7).fill(false), hihat: Array(7).fill(false), clap: Array(7).fill(false), tom: Array(7).fill(false) },
          hlasitosti: { kick: 500, snare: -20, hihat: 50, clap: 100, tom: 100 },
        },
      ],
      recordings: [],
      songs: [],
    })
    expect(vysledek.success).toBe(true)
    if (!vysledek.success) return
    const p = vysledek.data.patterns[0]
    expect(p.pocetKroku).toBe(8)
    expect(p.kroky.kick).toHaveLength(8)
    expect(p.hlasitosti.kick).toBe(100)
    expect(p.hlasitosti.snare).toBe(0)
    expect(p.hlasitosti.hihat).toBe(50)
  })

  it('starší skladba bez vyvážení dostane pocetOpakovaniBeatu 0 a hlasitosti 100 (appčino původní chování)', () => {
    const vysledek = validateMusicStudioData({
      patterns: [],
      recordings: [],
      songs: [{ id: 's1', name: 'Písnička', beatPatternId: 'b1', recordingId: 'r1', createdAt: '2024-01-01' }],
    })
    expect(vysledek.success).toBe(true)
    if (!vysledek.success) return
    const s = vysledek.data.songs[0]
    expect(s.pocetOpakovaniBeatu).toBe(0)
    expect(s.hlasitostBeatu).toBe(100)
    expect(s.hlasitostNahravky).toBe(100)
  })

  it('záporný nebo neplatný počet opakování se ořízne na 0', () => {
    const vysledek = validateMusicStudioData({
      patterns: [],
      recordings: [],
      songs: [{ id: 's1', name: 'X', beatPatternId: null, recordingId: null, createdAt: '2024-01-01', pocetOpakovaniBeatu: -3 }],
    })
    expect(vysledek.success).toBe(true)
    if (!vysledek.success) return
    expect(vysledek.data.songs[0].pocetOpakovaniBeatu).toBe(0)
  })
})
