import { describe, it, expect } from 'vitest'
import {
  melByBotKoupit,
  melByBotPrijmoutObchod,
  melByBotZvysitNabidkuDrazby,
  pripravKartuBotuPexesa,
  pripravPresnostBotuRychleAukce,
  pripravSmerBota,
  zvazBotuNabidkuObchodu,
} from '@/boardgame/ai'
import { vytvorHrace, vytvorTrhStav } from '@/boardgame/engine'
import { OBCHODY_PODLE_KLICE } from '@/boardgame/obchody'
import type { PolozkaDrazby } from '@/boardgame/data/minihry'
import type { NabidkaObchodu, StavDrazby, StavPexesa } from '@/boardgame/types'

/** Vrátí zafrontované hodnoty v pořadí volání — appka tak umí
 *  injektovat víc po sobě jdoucích `nahodne()` volání najednou,
 *  stejný vzor jako Souboj's vlastní deterministické testy. */
const fronta = (hodnoty: number[]) => {
  let i = 0
  return () => hodnoty[Math.min(i++, hodnoty.length - 1)]
}

describe('pripravSmerBota', () => {
  it('v rohu mřížky vybere jen z platných směrů', () => {
    const bot = vytvorHrace('bot', 'Bot', 'gros', true, { x: 0, z: 0 })
    const stav = vytvorTrhStav([bot])
    for (const nahodne of [0, 0.3, 0.7, 0.999]) {
      const smer = pripravSmerBota(bot, stav, () => nahodne)
      expect(['dolu', 'vpravo']).toContain(smer)
    }
  })

  it('je deterministický pro stejnou injektovanou náhodu', () => {
    const bot = vytvorHrace('bot', 'Bot', 'gros', true, { x: 3, z: 3 })
    const stav = vytvorTrhStav([bot])
    const a = pripravSmerBota(bot, stav, () => 0.4)
    const b = pripravSmerBota(bot, stav, () => 0.4)
    expect(a).toBe(b)
  })
})

describe('melByBotKoupit (Fáze 1)', () => {
  const pekarna = OBCHODY_PODLE_KLICE['1,1'] // cena 150

  it('koupí, pokud mu po zaplacení zbyde dost rezervy', () => {
    const bot = { ...vytvorHrace('bot', 'Bot', 'gros', true, { x: 0, z: 1 }), penize: 1000 }
    expect(melByBotKoupit(bot, pekarna)).toBe(true)
  })

  it('nekoupí, pokud by po zaplacení klesl pod rezervu', () => {
    const bot = { ...vytvorHrace('bot', 'Bot', 'gros', true, { x: 0, z: 1 }), penize: 200 }
    expect(melByBotKoupit(bot, pekarna)).toBe(false)
  })
})

// ==========================================
// Fáze 5 — obchodování. zvazBotuNabidkuObchodu volá `nahodne` v pevném
// pořadí (nejdřív šance-na-pokus, teprve POTOM výběr konkrétního
// pole, viz jeho vlastní komentář v ai.ts) — testy proto fronty volí
// podle toho, kolik volání ta která větev doopravdy spotřebuje.
// ==========================================

describe('zvazBotuNabidkuObchodu (Fáze 5)', () => {
  it('vrátí null, pokud kostka náhody řekne "tenhle tah ne" (nad 0.3)', () => {
    const bot = { ...vytvorHrace('bot', 'Bot', 'gros', true, { x: 0, z: 0 }), penize: 1000 }
    const cil = { ...vytvorHrace('c', 'Cecil', 'cihla', false, { x: 1, z: 1 }) }
    const stav = { ...vytvorTrhStav([bot, cil]), vlastnictvi: { '1,1': 'c' } }
    expect(zvazBotuNabidkuObchodu(bot, cil, stav, () => 0.9)).toBeNull()
  })

  it('vrátí null, pokud cíl nic nevlastní', () => {
    const bot = { ...vytvorHrace('bot', 'Bot', 'gros', true, { x: 0, z: 0 }), penize: 1000 }
    const cil = vytvorHrace('c', 'Cecil', 'cihla', false, { x: 1, z: 1 })
    const stav = vytvorTrhStav([bot, cil])
    expect(zvazBotuNabidkuObchodu(bot, cil, stav, () => 0)).toBeNull()
  })

  it('navrhne 70 % ceny vlastněného pole za peníze, nikdy ne vlastní pole', () => {
    const bot = { ...vytvorHrace('bot', 'Bot', 'gros', true, { x: 0, z: 0 }), penize: 1000 }
    const cil = vytvorHrace('c', 'Cecil', 'cihla', false, { x: 1, z: 1 })
    const stav = { ...vytvorTrhStav([bot, cil]), vlastnictvi: { '1,1': 'c' } } // Pekárna, cena 150
    const navrh = zvazBotuNabidkuObchodu(bot, cil, stav, fronta([0, 0]))
    expect(navrh).toEqual({ nabizenePenize: 105, nabizenaPole: [], pozadovanePenize: 0, pozadovanaPole: ['1,1'] })
  })

  it('vybere mezi víc vlastněnými poli podle druhé fronty náhody', () => {
    const bot = { ...vytvorHrace('bot', 'Bot', 'gros', true, { x: 0, z: 0 }), penize: 1000 }
    const cil = vytvorHrace('c', 'Cecil', 'cihla', false, { x: 1, z: 1 })
    // Dvě vlastněná pole — '1,1' (Pekárna) a '5,1' (Řeznictví), obě v
    // Object.entries pořadí podle toho, jak je appka vepsala.
    const stav = { ...vytvorTrhStav([bot, cil]), vlastnictvi: { '1,1': 'c', '5,1': 'c' } }
    const prvni = zvazBotuNabidkuObchodu(bot, cil, stav, fronta([0, 0]))
    const druhe = zvazBotuNabidkuObchodu(bot, cil, stav, fronta([0, 0.99]))
    expect(prvni?.pozadovanaPole).toEqual(['1,1'])
    expect(druhe?.pozadovanaPole).toEqual(['5,1'])
  })

  it('vrátí null, pokud by bot po nabídnutých penězích klesl pod rezervu', () => {
    const bot = { ...vytvorHrace('bot', 'Bot', 'gros', true, { x: 0, z: 0 }), penize: 300 }
    const cil = vytvorHrace('c', 'Cecil', 'cihla', false, { x: 1, z: 1 })
    const stav = { ...vytvorTrhStav([bot, cil]), vlastnictvi: { '2,2': 'c' } } // Klenotnictví, cena 400 -> nabídka 280
    expect(zvazBotuNabidkuObchodu(bot, cil, stav, fronta([0, 0]))).toBeNull()
  })
})

describe('melByBotPrijmoutObchod (Fáze 5)', () => {
  const nabidka = (cast: Partial<NabidkaObchodu>): NabidkaObchodu => ({
    odKoho: 'x',
    komu: 'bot',
    nabizenePenize: 0,
    nabizenaPole: [],
    pozadovanePenize: 0,
    pozadovanaPole: [],
    ...cast,
  })

  it('přijme, pokud je čistý přínos kladný a rezerva vychází', () => {
    const bot = { ...vytvorHrace('bot', 'Bot', 'gros', true, { x: 0, z: 0 }), penize: 1000 }
    expect(melByBotPrijmoutObchod(bot, nabidka({ nabizenePenize: 200, pozadovanePenize: 100 }))).toBe(true)
  })

  it('odmítne přesně vyrovnanou nabídku (zisk === výdaj)', () => {
    const bot = { ...vytvorHrace('bot', 'Bot', 'gros', true, { x: 0, z: 0 }), penize: 1000 }
    expect(melByBotPrijmoutObchod(bot, nabidka({ nabizenePenize: 100, pozadovanePenize: 100 }))).toBe(false)
  })

  it('odmítne nevýhodnou nabídku (zisk < výdaj)', () => {
    const bot = { ...vytvorHrace('bot', 'Bot', 'gros', true, { x: 0, z: 0 }), penize: 1000 }
    expect(melByBotPrijmoutObchod(bot, nabidka({ nabizenePenize: 50, pozadovanePenize: 100 }))).toBe(false)
  })

  it('počítá i cenu nabízených/požadovaných polí, ne jen peníze', () => {
    const bot = { ...vytvorHrace('bot', 'Bot', 'gros', true, { x: 0, z: 0 }), penize: 1000 }
    // Nabízí pole v ceně 150 (Pekárna) za 0 peněz požadovaných -> zisk 150 > výdaj 0
    expect(melByBotPrijmoutObchod(bot, nabidka({ nabizenaPole: ['1,1'] }))).toBe(true)
    // Požaduje pole v ceně 400 (Klenotnictví) za 0 peněz nabízených -> zisk 0 < výdaj 400
    expect(melByBotPrijmoutObchod(bot, nabidka({ pozadovanaPole: ['2,2'] }))).toBe(false)
  })

  it('odmítne výhodnou nabídku, pokud by po zaplacení klesl pod rezervu', () => {
    const bot = { ...vytvorHrace('bot', 'Bot', 'gros', true, { x: 0, z: 0 }), penize: 150 }
    // Zisk (500) > výdaj (100), ale 150 - 100 = 50 < rezerva 100
    expect(melByBotPrijmoutObchod(bot, nabidka({ nabizenePenize: 500, pozadovanePenize: 100 }))).toBe(false)
  })
})

// ==========================================
// Fáze 6 — minihry. Poslední tři, poslední rozhodnutí bota.
// ==========================================

describe('pripravKartuBotuPexesa (Fáze 6)', () => {
  const stavPexesa = (otevrene: number[] = [], nalezene: number[] = []): StavPexesa => ({
    typ: 'pexeso',
    karty: [0, 1, 2, 3].map((i) => ({ symbol: String(i), nalezena: nalezene.includes(i) })),
    otevrene,
    cekaNaPotvrzeni: false,
    pokusy: 0,
  })

  it('vybere jen mezi kartami, co nejsou nalezené ani zrovna otočené', () => {
    const m = stavPexesa([1], [0])
    for (const nahodne of [0, 0.5, 0.99]) {
      const index = pripravKartuBotuPexesa(m, () => nahodne)
      expect([2, 3]).toContain(index)
    }
  })

  it('je deterministický pro stejnou injektovanou náhodu', () => {
    const m = stavPexesa()
    expect(pripravKartuBotuPexesa(m, () => 0.4)).toBe(pripravKartuBotuPexesa(m, () => 0.4))
  })
})

describe('melByBotZvysitNabidkuDrazby (Fáze 6)', () => {
  const polozka: PolozkaDrazby = { id: 'prsten', nazev: 'Zlatý prsten', ikona: '💍', vyvolavaciCena: 80, hodnota: 150 }
  const stavDrazby = (aktualniNabidka: number): StavDrazby => ({
    typ: 'drazba',
    polozkaId: polozka.id,
    aktualniNabidka,
    vedeId: null,
    poradiUcastniku: ['bot'],
    indexNaTahu: 0,
  })

  it('přihodí, pokud nová nabídka nepřesáhne hodnotu předmětu a zbyde rezerva', () => {
    const bot = { ...vytvorHrace('bot', 'Bot', 'gros', true, { x: 0, z: 0 }), penize: 1000 }
    expect(melByBotZvysitNabidkuDrazby(bot, stavDrazby(100), polozka)).toBe(true) // nová nabídka 120 <= 150
  })

  it('nepřihodí, pokud by nová nabídka přesáhla skutečnou hodnotu předmětu', () => {
    const bot = { ...vytvorHrace('bot', 'Bot', 'gros', true, { x: 0, z: 0 }), penize: 1000 }
    expect(melByBotZvysitNabidkuDrazby(bot, stavDrazby(140), polozka)).toBe(false) // nová nabídka 160 > 150
  })

  it('nepřihodí, pokud by po zaplacení nové nabídky klesl pod rezervu', () => {
    const bot = { ...vytvorHrace('bot', 'Bot', 'gros', true, { x: 0, z: 0 }), penize: 150 }
    expect(melByBotZvysitNabidkuDrazby(bot, stavDrazby(60), polozka)).toBe(false) // nová nabídka 80, 150-80=70 < rezerva 100
  })
})

describe('pripravPresnostBotuRychleAukce (Fáze 6)', () => {
  it('vrátí hodnotu v rozsahu [30, 85), nikdy celé 0–100', () => {
    for (const nahodne of [0, 0.5, 0.999]) {
      const presnost = pripravPresnostBotuRychleAukce(() => nahodne)
      expect(presnost).toBeGreaterThanOrEqual(30)
      expect(presnost).toBeLessThan(85)
    }
  })

  it('je deterministický pro stejnou injektovanou náhodu', () => {
    expect(pripravPresnostBotuRychleAukce(() => 0.4)).toBe(pripravPresnostBotuRychleAukce(() => 0.4))
  })
})
