import { describe, it, expect } from 'vitest'
import { krokHry, vytvorPocatecniStav, ARENA_POLOMER } from '@/survival/engine/engine'
import { vypocitejVlnu, jeBossVlna } from '@/survival/data/waves'
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
