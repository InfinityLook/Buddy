import { describe, it, expect } from 'vitest'
import { zmenPocetKroku, priponaPodleMime, prazdnyPattern, DRUM_SOUNDS } from '@/miniapps/music-studio/types'
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
