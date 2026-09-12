import { describe, it, expect } from 'vitest'
import {
  krokHry,
  vytvorPocatecniStav,
  ARENA_POLOMER,
  extrahovat,
  pokracovatVeVlne,
  EXTRAKCE_BONUS_NASOBIC,
} from '@/survival/engine/engine'
import { vypocitejVlnu, jeBossVlna, jeExtrakcniVlna } from '@/survival/data/waves'
import { vyhodnotZabiti } from '@/survival/engine/loot'
import { MONSTRA } from '@/survival/data/monsters'
import { VYCHOZI_POSTAVA } from '@/survival/data/postavy'

// ==========================================
// Survival Night — engine je čistý (žádný React/prohlížeč), takže jde
// otestovat stejně jako combat/engine.ts u Souboje: injektované
// `nahodne` místo Math.random, kontrola konkrétních přechodů stavu.
// ==========================================

describe('waves.ts — parametrický wave systém', () => {
  it('vlny 1-9 nejsou boss, vlna 10 ano', () => {
    for (let i = 1; i <= 9; i++) expect(jeBossVlna(i)).toBe(false)
    expect(jeBossVlna(10)).toBe(true)
    expect(jeBossVlna(20)).toBe(true)
  })

  it('počet nepřátel i statMultiplikator rostou s vlnou', () => {
    const v1 = vypocitejVlnu(1)
    const v5 = vypocitejVlnu(5)
    expect(v5.pocetNepratel).toBeGreaterThan(v1.pocetNepratel)
    expect(v5.statMultiplikator).toBeGreaterThan(v1.statMultiplikator)
  })

  it('boss vlna nemá běžné spawny', () => {
    const boss = vypocitejVlnu(10)
    expect(boss.jeBoss).toBe(true)
    expect(boss.pocetNepratel).toBe(0)
  })

  it('dostupné typy rostou s vlnou (pozdější vlna nikdy nemá méně typů)', () => {
    const v1 = vypocitejVlnu(1)
    const v8 = vypocitejVlnu(8)
    expect(v8.dostupneTypy.length).toBeGreaterThanOrEqual(v1.dostupneTypy.length)
    expect(v1.dostupneTypy).toContain('crawler')
  })

  it('násobky 5 (včetně boss milníků 10/20/...) jsou extrakční body, ostatní ne', () => {
    expect(jeExtrakcniVlna(5)).toBe(true)
    expect(jeExtrakcniVlna(10)).toBe(true)
    expect(jeExtrakcniVlna(15)).toBe(true)
    expect(jeExtrakcniVlna(1)).toBe(false)
    expect(jeExtrakcniVlna(7)).toBe(false)
  })
})

describe('loot.ts — vyhodnotZabiti', () => {
  it('XP a Gold jsou vždy přesně z definice monstra', () => {
    const vysledek = vyhodnotZabiti(MONSTRA.crawler, () => 0.99)
    expect(vysledek.xp).toBe(MONSTRA.crawler.xp)
    expect(vysledek.gold).toBe(MONSTRA.crawler.gold)
  })

  it('nízký hod na kostce = krystal i vzácný drop', () => {
    const vysledek = vyhodnotZabiti(MONSTRA.crawler, () => 0)
    expect(vysledek.krystal).toBe(1)
    expect(vysledek.vzacnyDrop).toBe(true)
  })

  it('vysoký hod na kostce = žádný krystal ani vzácný drop', () => {
    const vysledek = vyhodnotZabiti(MONSTRA.crawler, () => 0.999)
    expect(vysledek.krystal).toBe(0)
    expect(vysledek.vzacnyDrop).toBe(false)
  })
})

describe('engine.ts — krokHry', () => {
  const nahodne0 = () => 0 // vždy "nejnižší" hod — deterministické spawny/kritické zásahy

  it('hráč se pohne směrem k joystickovému vstupu', () => {
    const stav = vytvorPocatecniStav(VYCHOZI_POSTAVA)
    krokHry(stav, 1000, { x: 1, z: 0 }, nahodne0)
    expect(stav.hrac.pozice.x).toBeGreaterThan(0)
    expect(stav.hrac.pozice.z).toBeCloseTo(0, 5)
  })

  it('hráč se nikdy nedostane za hranici arény', () => {
    const stav = vytvorPocatecniStav(VYCHOZI_POSTAVA)
    for (let i = 0; i < 200; i++) krokHry(stav, 200, { x: 1, z: 0 }, nahodne0)
    const vzdalenost = Math.hypot(stav.hrac.pozice.x, stav.hrac.pozice.z)
    expect(vzdalenost).toBeLessThanOrEqual(ARENA_POLOMER + 0.001)
  })

  it('monstra postupně naspawnují až do plného počtu vlny 1', () => {
    const stav = vytvorPocatecniStav(VYCHOZI_POSTAVA)
    const cilovyPocet = vypocitejVlnu(1).pocetNepratel
    // Dost dlouhý čas, ať appka stihne dospawnovat celou vlnu i s
    // nejpomalejším intervalem spawnu.
    for (let i = 0; i < 400; i++) krokHry(stav, 200, { x: 0, z: 0 }, nahodne0)
    expect(stav.zbyvaSpawnovat).toBe(0)
    expect(stav.aktivniNepratele.length + stav.zabitiCelkem).toBeGreaterThanOrEqual(cilovyPocet)
  })

  it('kontaktní nepřítel hráči ubírá HP', () => {
    const stav = vytvorPocatecniStav(VYCHOZI_POSTAVA)
    stav.aktivniNepratele.push({
      id: 'test-1',
      defId: 'crawler',
      jeBoss: false,
      pozice: { x: 0.1, z: 0 },
      hp: 50,
      maxHp: 50,
      damage: 10,
      rychlost: 0,
      polomer: 0.5,
      typ: 'pozemni',
      dosahUtoku: 0,
      barva: '#000',
      emoji: '🕷️',
      posledniUtokMs: -Infinity,
      fazeIndex: 0,
      posledniTeleportMs: -Infinity,
    })
    const hpPred = stav.hrac.hp
    krokHry(stav, 16, { x: 0, z: 0 }, nahodne0)
    expect(stav.hrac.hp).toBeLessThan(hpPred)
  })

  it('hráčův auto-útok zabije slabé monstrum na dosah a připočte odměnu', () => {
    const stav = vytvorPocatecniStav(VYCHOZI_POSTAVA)
    // Appka vypne přirozený spawn vlny 1, ať test izolovaně ověří jen
    // auto-útok — jinak by ve stejném ticku naspawnovalo i další
    // monstrum (posledniSpawnMs startuje -Infinity stejně jako
    // hráčův posledniUtokMs) a počet živých nepřátel by neseděl.
    stav.zbyvaSpawnovat = 0
    stav.aktivniNepratele.push({
      id: 'test-2',
      defId: 'crawler',
      jeBoss: false,
      pozice: { x: 1, z: 0 },
      hp: 1,
      maxHp: 50,
      damage: 5,
      rychlost: 0,
      polomer: 0.4,
      typ: 'pozemni',
      dosahUtoku: 0,
      barva: '#000',
      emoji: '🕷️',
      posledniUtokMs: -Infinity,
      fazeIndex: 0,
      posledniTeleportMs: -Infinity,
    })
    krokHry(stav, 16, { x: 0, z: 0 }, nahodne0)
    expect(stav.aktivniNepratele.length).toBe(0)
    expect(stav.zabitiCelkem).toBe(1)
    expect(stav.xpZaBeh).toBe(MONSTRA.crawler.xp)
  })

  it('hráč umírá při 0 HP a stav zamrzne (další krok nic nezmění)', () => {
    const stav = vytvorPocatecniStav(VYCHOZI_POSTAVA)
    stav.hrac.hp = 1
    stav.aktivniNepratele.push({
      id: 'test-3',
      defId: 'demon',
      jeBoss: false,
      pozice: { x: 0.1, z: 0 },
      hp: 500,
      maxHp: 500,
      damage: 999,
      rychlost: 0,
      polomer: 0.5,
      typ: 'pozemni',
      dosahUtoku: 0,
      barva: '#000',
      emoji: '👹',
      posledniUtokMs: -Infinity,
      fazeIndex: 0,
      posledniTeleportMs: -Infinity,
    })
    krokHry(stav, 16, { x: 0, z: 0 }, nahodne0)
    expect(stav.konec).toBe(true)
    expect(stav.duvodKonce).toBe('smrt')
    expect(stav.hrac.hp).toBe(0)

    const stavPoSmrti = { ...stav }
    krokHry(stav, 500, { x: 1, z: 1 }, nahodne0)
    expect(stav.hrac.pozice).toEqual(stavPoSmrti.hrac.pozice)
    expect(stav.cas).toBe(stavPoSmrti.cas)
  })

  it('boss se objeví na vlně 10 a appka mu spočítá fáze podle HP', () => {
    const stav = vytvorPocatecniStav(VYCHOZI_POSTAVA)
    stav.vlna = 10
    stav.faceVlny = 'boss-spawnuje'
    krokHry(stav, 16, { x: 0, z: 0 }, nahodne0)
    expect(stav.aktivniNepratele.length).toBe(1)
    const boss = stav.aktivniNepratele[0]
    expect(boss.jeBoss).toBe(true)
    expect(boss.fazeIndex).toBe(0)

    boss.hp = Math.round(boss.maxHp * 0.5)
    krokHry(stav, 16, { x: 0, z: 0 }, nahodne0)
    expect(stav.aktivniNepratele[0].fazeIndex).toBe(1)
  })
})

describe('engine.ts — extrakce (bod 18 zadání: "continue or extract")', () => {
  const nahodne0 = () => 0

  it('vlna, co je násobkem 5, po dokončení nabídne extrakci místo rovnou další vlny', () => {
    const stav = vytvorPocatecniStav(VYCHOZI_POSTAVA)
    stav.vlna = 5
    stav.faceVlny = 'spawnuje'
    stav.zbyvaSpawnovat = 0
    stav.aktivniNepratele = []
    krokHry(stav, 16, { x: 0, z: 0 }, nahodne0)
    expect(stav.faceVlny).toBe('extrakce')
    expect(stav.vlna).toBe(5) // appka ještě neinkrementovala, čeká na rozhodnutí
    expect(stav.konec).toBe(false)
  })

  it('vlna, co NENÍ násobkem 5, pokračuje rovnou do další vlny beze změny', () => {
    const stav = vytvorPocatecniStav(VYCHOZI_POSTAVA)
    stav.vlna = 3
    stav.faceVlny = 'spawnuje'
    stav.zbyvaSpawnovat = 0
    stav.aktivniNepratele = []
    krokHry(stav, 16, { x: 0, z: 0 }, nahodne0)
    expect(stav.faceVlny).toBe('spawnuje')
    expect(stav.vlna).toBe(4)
  })

  it('poražení bosse na vlně 10 (násobek 5 i 10) taky nabídne extrakci', () => {
    const stav = vytvorPocatecniStav(VYCHOZI_POSTAVA)
    stav.vlna = 10
    stav.faceVlny = 'boss-boj'
    stav.aktivniNepratele = []
    krokHry(stav, 16, { x: 0, z: 0 }, nahodne0)
    expect(stav.faceVlny).toBe('extrakce')
    expect(stav.vlna).toBe(10)
  })

  it('smrt má přednost, i když nastane ve stejném ticku jako dokončení extrakční vlny', () => {
    const stav = vytvorPocatecniStav(VYCHOZI_POSTAVA)
    stav.vlna = 5
    stav.faceVlny = 'spawnuje'
    stav.zbyvaSpawnovat = 0
    stav.aktivniNepratele = []
    stav.hrac.hp = 0
    krokHry(stav, 16, { x: 0, z: 0 }, nahodne0)
    expect(stav.konec).toBe(true)
    expect(stav.duvodKonce).toBe('smrt')
  })

  it('extrahovat() zabalí odměnu s bonusem a ukončí běh jako úspěch, ne smrt', () => {
    const stav = vytvorPocatecniStav(VYCHOZI_POSTAVA)
    stav.faceVlny = 'extrakce'
    stav.vlna = 5
    stav.goldZaBeh = 100
    stav.krystalZaBeh = 4
    extrahovat(stav)
    expect(stav.konec).toBe(true)
    expect(stav.duvodKonce).toBe('extrakce')
    expect(stav.goldZaBeh).toBe(Math.round(100 * EXTRAKCE_BONUS_NASOBIC))
    expect(stav.krystalZaBeh).toBe(Math.round(4 * EXTRAKCE_BONUS_NASOBIC))
  })

  it('extrahovat() je no-op mimo fázi extrakce', () => {
    const stav = vytvorPocatecniStav(VYCHOZI_POSTAVA)
    expect(stav.faceVlny).toBe('spawnuje')
    extrahovat(stav)
    expect(stav.konec).toBe(false)
    expect(stav.duvodKonce).toBe(null)
  })

  it('extrahovat() je no-op, pokud běh už skončil', () => {
    const stav = vytvorPocatecniStav(VYCHOZI_POSTAVA)
    stav.faceVlny = 'extrakce'
    stav.konec = true
    stav.duvodKonce = 'smrt'
    stav.goldZaBeh = 50
    extrahovat(stav)
    expect(stav.duvodKonce).toBe('smrt') // appka nepřepíše už zapsaný důvod konce
    expect(stav.goldZaBeh).toBe(50) // ani nepřidá bonus na kořist, co se už neuloží
  })

  it('pokracovatVeVlne() rozjede další vlnu a vrátí appku z extrakční fáze', () => {
    const stav = vytvorPocatecniStav(VYCHOZI_POSTAVA)
    stav.faceVlny = 'extrakce'
    stav.vlna = 5
    pokracovatVeVlne(stav)
    expect(stav.vlna).toBe(6)
    expect(stav.faceVlny).toBe('spawnuje')
    expect(stav.konec).toBe(false)
  })

  it('pokracovatVeVlne() po vlně 10 (boss milník) rozjede běžnou vlnu 11, ne dalšího bosse', () => {
    const stav = vytvorPocatecniStav(VYCHOZI_POSTAVA)
    stav.faceVlny = 'extrakce'
    stav.vlna = 10
    pokracovatVeVlne(stav)
    expect(stav.vlna).toBe(11)
    expect(stav.faceVlny).toBe('spawnuje')
  })

  it('pokracovatVeVlne() je no-op mimo fázi extrakce', () => {
    const stav = vytvorPocatecniStav(VYCHOZI_POSTAVA)
    const vlnaPred = stav.vlna
    pokracovatVeVlne(stav)
    expect(stav.vlna).toBe(vlnaPred)
  })
})
