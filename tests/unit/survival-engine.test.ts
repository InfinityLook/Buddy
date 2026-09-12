import { describe, it, expect } from 'vitest'
import {
  krokHry,
  vytvorHrace,
  vytvorPocatecniStav,
  ARENA_POLOMER,
  extrahovat,
  pokracovatVeVlne,
  EXTRAKCE_BONUS_NASOBIC,
  vyberPerk,
  pouzitSchopnost,
  SCHOPNOSTI_IMPLEMENTOVANE,
} from '@/survival/engine/engine'
import { vypocitejVlnu, jeBossVlna, jeExtrakcniVlna } from '@/survival/data/waves'
import { vyhodnotZabiti } from '@/survival/engine/loot'
import { MONSTRA } from '@/survival/data/monsters'
import { VYCHOZI_POSTAVA } from '@/survival/data/postavy'
import { ZBRANE, VYCHOZI_ZBRAN, zbranPodleId } from '@/survival/data/weapons'
import { prahXpProUroven } from '@/survival/data/uroven'
import { PERKY, MAX_KRITICKA_SANCE, POCET_VOLEB_PERKU } from '@/survival/data/perky'
import { jeSynergieSplnena } from '@/survival/data/synergie'
import { SCHOPNOSTI } from '@/survival/data/abilities'

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
    // nejpomalejším intervalem spawnu. `nahodne0` (vždy 0) navíc
    // znamená, že hráč pořád kritizuje — za 400 ticků/300 nepřátel na
    // dosah appka skutečně narazí na level-up (bod 11 zadání) a hru by
    // to bez vybrání perku navždycky pozastavilo (levelUpNabidka),
    // takže test se — jako skutečný hráč — nabídkou musí sám prokousat.
    for (let i = 0; i < 400; i++) {
      krokHry(stav, 200, { x: 0, z: 0 }, nahodne0)
      if (stav.levelUpNabidka) vyberPerk(stav, stav.levelUpNabidka[0])
    }
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
      zpomalenoDoMs: -Infinity,
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
      zpomalenoDoMs: -Infinity,
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
      zpomalenoDoMs: -Infinity,
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
    // Appka potlačí i pickup spawn (viz jeho vlastní testovací sekce
    // níž) — jinak by s deterministickým nahodne0 (vždycky 0) appka
    // spawnula Health Orb přesně na hráčovu pozici (0,0) a "mrtvého"
    // hráče by ve stejném ticku vzkřísila dřív, než appka stihne
    // vyhodnotit konec běhu — přesně ten typ souběhu, co tenhle test
    // ověřuje pro extrakci, teď navíc i pro pickupy.
    stav.posledniPickupSpawnMs = stav.cas
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

describe('engine.ts — level-up a perky (bod 11 zadání, krok 1: engine bez UI)', () => {
  const nahodne0 = () => 0

  const slabyNepritel = (id: string, hp: number) => ({
    id,
    defId: 'crawler',
    jeBoss: false,
    pozice: { x: 1, z: 0 },
    hp,
    maxHp: 50,
    damage: 5,
    rychlost: 0,
    polomer: 0.4,
    typ: 'pozemni' as const,
    dosahUtoku: 0,
    barva: '#000',
    emoji: '🕷️',
    posledniUtokMs: -Infinity,
    fazeIndex: 0,
    posledniTeleportMs: -Infinity,
    zpomalenoDoMs: -Infinity,
  })

  it('prahXpProUroven: úroveň 1 je zadarmo (0 XP), dál přísně roste', () => {
    expect(prahXpProUroven(1)).toBe(0)
    expect(prahXpProUroven(2)).toBeGreaterThan(0)
    expect(prahXpProUroven(3)).toBeGreaterThan(prahXpProUroven(2))
    expect(prahXpProUroven(10)).toBeGreaterThan(prahXpProUroven(5))
  })

  it('zabití, co překročí práh na další úroveň, appka zvýší uroven a nabídne POCET_VOLEB_PERKU různých perků', () => {
    const stav = vytvorPocatecniStav(VYCHOZI_POSTAVA)
    stav.zbyvaSpawnovat = 0
    stav.xpZaBeh = prahXpProUroven(2) - MONSTRA.crawler.xp // těsně pod prahem
    stav.aktivniNepratele.push(slabyNepritel('test-lvl-1', 1))

    krokHry(stav, 16, { x: 0, z: 0 }, nahodne0)

    expect(stav.hrac.uroven).toBe(2)
    expect(stav.levelUpNabidka).not.toBeNull()
    expect(stav.levelUpNabidka).toHaveLength(POCET_VOLEB_PERKU)
    // appka nikdy nenabídne stejný perk dvakrát v jedné nabídce, i když
    // `nahodne` vrací pořád stejnou hodnotu (index 0 po každém splice).
    expect(new Set(stav.levelUpNabidka)).toHaveProperty('size', POCET_VOLEB_PERKU)
    for (const id of stav.levelUpNabidka!) {
      expect(PERKY.some((p) => p.id === id)).toBe(true)
    }
  })

  it('zabití, co práh nepřekročí, level-up nenastane', () => {
    const stav = vytvorPocatecniStav(VYCHOZI_POSTAVA)
    stav.zbyvaSpawnovat = 0
    stav.xpZaBeh = 0
    stav.aktivniNepratele.push(slabyNepritel('test-lvl-2', 1))

    krokHry(stav, 16, { x: 0, z: 0 }, nahodne0)

    expect(stav.hrac.uroven).toBe(1)
    expect(stav.levelUpNabidka).toBeNull()
  })

  it('dokud čeká levelUpNabidka, appka hru úplně pozastaví — žádný pohyb, čas ani spawn', () => {
    const stav = vytvorPocatecniStav(VYCHOZI_POSTAVA)
    stav.levelUpNabidka = ['sila', 'dosah', 'hbitost']
    const casPred = stav.cas
    const poziceInfo = { ...stav.hrac.pozice }
    const zbyvaPred = stav.zbyvaSpawnovat

    krokHry(stav, 500, { x: 1, z: 1 }, nahodne0)

    expect(stav.cas).toBe(casPred)
    expect(stav.hrac.pozice).toEqual(poziceInfo)
    expect(stav.zbyvaSpawnovat).toBe(zbyvaPred)
  })

  it('vyberPerk() aplikuje efekt, zapíše ho do ziskanePerky a vynuluje nabídku', () => {
    const stav = vytvorPocatecniStav(VYCHOZI_POSTAVA)
    stav.levelUpNabidka = ['sila', 'dosah', 'hbitost']
    const damagePred = stav.hrac.damage

    vyberPerk(stav, 'sila')

    expect(stav.hrac.damage).toBe(Math.round(damagePred * 1.15))
    expect(stav.ziskanePerky.sila).toBe(1)
    expect(stav.levelUpNabidka).toBeNull()
  })

  it('vyberPerk() se stejným id podruhé perk znovu stackne (ziskanePerky roste)', () => {
    const stav = vytvorPocatecniStav(VYCHOZI_POSTAVA)
    stav.levelUpNabidka = ['sila', 'dosah', 'hbitost']
    vyberPerk(stav, 'sila')
    stav.levelUpNabidka = ['sila', 'dosah', 'hbitost']
    vyberPerk(stav, 'sila')
    expect(stav.ziskanePerky.sila).toBe(2)
  })

  it('vyberPerk() typu maxHp zvýší maxHp i hp o stejnou hodnotu', () => {
    const stav = vytvorPocatecniStav(VYCHOZI_POSTAVA)
    stav.levelUpNabidka = ['vitalita', 'sila', 'dosah']
    const maxHpPred = stav.hrac.maxHp
    const hpPred = stav.hrac.hp

    vyberPerk(stav, 'vitalita')

    expect(stav.hrac.maxHp).toBe(maxHpPred + 20)
    expect(stav.hrac.hp).toBe(hpPred + 20)
  })

  it('vyberPerk() nikdy neposune kritickaSance nad MAX_KRITICKA_SANCE', () => {
    const stav = vytvorPocatecniStav(VYCHOZI_POSTAVA)
    stav.hrac.kritickaSance = MAX_KRITICKA_SANCE - 0.01
    stav.levelUpNabidka = ['presnost', 'sila', 'dosah']

    vyberPerk(stav, 'presnost')

    expect(stav.hrac.kritickaSance).toBe(MAX_KRITICKA_SANCE)
  })

  it('vyberPerk() je no-op mimo aktivní nabídku', () => {
    const stav = vytvorPocatecniStav(VYCHOZI_POSTAVA)
    const damagePred = stav.hrac.damage
    vyberPerk(stav, 'sila')
    expect(stav.hrac.damage).toBe(damagePred)
    expect(stav.ziskanePerky.sila).toBeUndefined()
  })

  it('vyberPerk() je no-op pro id, co appka zrovna nenabídla', () => {
    const stav = vytvorPocatecniStav(VYCHOZI_POSTAVA)
    stav.levelUpNabidka = ['sila', 'dosah', 'hbitost']
    const damagePred = stav.hrac.damage
    vyberPerk(stav, 'brutalita')
    expect(stav.hrac.damage).toBe(damagePred)
    expect(stav.levelUpNabidka).toEqual(['sila', 'dosah', 'hbitost'])
  })

  it('vyberPerk() je no-op, pokud běh už skončil', () => {
    const stav = vytvorPocatecniStav(VYCHOZI_POSTAVA)
    stav.levelUpNabidka = ['sila', 'dosah', 'hbitost']
    stav.konec = true
    stav.duvodKonce = 'smrt'
    const damagePred = stav.hrac.damage
    vyberPerk(stav, 'sila')
    expect(stav.hrac.damage).toBe(damagePred)
  })

  it('smrt má přednost i nad čerstvě nabídnutým levelUpNabidka ve stejném ticku', () => {
    const stav = vytvorPocatecniStav(VYCHOZI_POSTAVA)
    stav.zbyvaSpawnovat = 0
    stav.xpZaBeh = prahXpProUroven(2) - MONSTRA.crawler.xp
    stav.hrac.hp = 1
    // Nepřítel už je v kontaktu (appka ho tam schválně postaví), dá
    // smrtící kontaktní ránu VE STEJNÉM ticku, ve kterém ho pak
    // hráčův auto-útok zabije a překročí XP práh.
    const nepritel = slabyNepritel('test-lvl-3', 1)
    nepritel.pozice = { x: 0.1, z: 0 }
    nepritel.damage = 999
    stav.aktivniNepratele.push(nepritel)

    krokHry(stav, 16, { x: 0, z: 0 }, nahodne0)

    expect(stav.konec).toBe(true)
    expect(stav.duvodKonce).toBe('smrt')
    expect(stav.levelUpNabidka).toBeNull()
    // Appka uroven samotnou nevrací zpátky, jen appce nedovolí ukázat
    // mrtvému hráči kartu na výběr — stejná "level se nevrací, jen se
    // zavře nabídka" logika jako u extrakce/wave state výš.
    expect(stav.hrac.uroven).toBe(2)
  })
})

describe('synergie.ts / vyberPerk — build/synergy systém (bod 12 zadání, krok 3/4)', () => {
  it('jeSynergieSplnena — "kombo" platí, jen když appka má VŠECHNY vyjmenované perky aspoň jednou', () => {
    const podminka = { typ: 'kombo' as const, perky: ['sila', 'rychlopalba'] }
    expect(jeSynergieSplnena(podminka, {})).toBe(false)
    expect(jeSynergieSplnena(podminka, { sila: 1 })).toBe(false)
    expect(jeSynergieSplnena(podminka, { sila: 1, rychlopalba: 1 })).toBe(true)
  })

  it('jeSynergieSplnena — "stack" platí, jen když appka má daný perk aspoň `pocet`-krát', () => {
    const podminka = { typ: 'stack' as const, perkId: 'sila', pocet: 3 }
    expect(jeSynergieSplnena(podminka, { sila: 2 })).toBe(false)
    expect(jeSynergieSplnena(podminka, { sila: 3 })).toBe(true)
    expect(jeSynergieSplnena(podminka, { sila: 4 })).toBe(true)
  })

  it('vyberPerk() odemkne "kombo" synergii přesně tím výběrem, co podmínku poprvé splní', () => {
    const stav = vytvorPocatecniStav(VYCHOZI_POSTAVA)
    stav.levelUpNabidka = ['sila', 'dosah', 'hbitost']
    vyberPerk(stav, 'sila')
    expect(stav.aplikovaneSynergie).not.toContain('valecnik')

    stav.levelUpNabidka = ['rychlopalba', 'dosah', 'hbitost']
    const damagePredSynergii = stav.hrac.damage
    vyberPerk(stav, 'rychlopalba')

    expect(stav.aplikovaneSynergie).toContain('valecnik')
    // "Válečník" sám přidá dalších +15 % damage NAD RÁMEC toho, co
    // "Rychlopalba" (utokyZaSekundu) sama o sobě damage vůbec nemění —
    // appka tak pozná, že bonus skutečně proběhl, ne jen že se stav
    // sám o sobě náhodou nezměnil.
    expect(stav.hrac.damage).toBe(Math.round(damagePredSynergii * 1.15))
  })

  it('vyberPerk() odemkne "stack" synergii až při TŘETÍM stejném perku, ne dřív', () => {
    const stav = vytvorPocatecniStav(VYCHOZI_POSTAVA)
    stav.levelUpNabidka = ['sila', 'dosah', 'hbitost']
    vyberPerk(stav, 'sila')
    expect(stav.aplikovaneSynergie).not.toContain('berserk')

    stav.levelUpNabidka = ['sila', 'dosah', 'hbitost']
    vyberPerk(stav, 'sila')
    expect(stav.aplikovaneSynergie).not.toContain('berserk')

    stav.levelUpNabidka = ['sila', 'dosah', 'hbitost']
    vyberPerk(stav, 'sila')
    expect(stav.aplikovaneSynergie).toContain('berserk')
  })

  it('appka udělí bonus ze synergie jen JEDNOU za běh, i když podmínka dál platí', () => {
    const stav = vytvorPocatecniStav(VYCHOZI_POSTAVA)
    for (let i = 0; i < 3; i++) {
      stav.levelUpNabidka = ['sila', 'dosah', 'hbitost']
      vyberPerk(stav, 'sila')
    }
    expect(stav.aplikovaneSynergie.filter((id) => id === 'berserk')).toHaveLength(1)

    // Čtvrtá Síla podmínku (3×) pořád splňuje, appka ale bonus podruhé
    // nepřičte — jen "berserk" by se v aplikovaneSynergie objevil
    // dvakrát, kdyby appka tuhle ochranu neměla.
    stav.levelUpNabidka = ['sila', 'dosah', 'hbitost']
    vyberPerk(stav, 'sila')
    expect(stav.aplikovaneSynergie.filter((id) => id === 'berserk')).toHaveLength(1)
  })

  it('vyberPerk() může odemknout víc než jednu synergii najednou — appka projde CELÝ katalog, ne jen jednu', () => {
    const stav = vytvorPocatecniStav(VYCHOZI_POSTAVA)
    stav.ziskanePerky = { sila: 1, rychlopalba: 1, hbitost: 1 }
    stav.levelUpNabidka = ['vitalita', 'dosah', 'presnost']

    vyberPerk(stav, 'vitalita')

    expect(stav.aplikovaneSynergie).toContain('valecnik')
    expect(stav.aplikovaneSynergie).toContain('nezmar')
  })

  it('vyberPerk() bez odemčené synergie nechá aplikovaneSynergie prázdné', () => {
    const stav = vytvorPocatecniStav(VYCHOZI_POSTAVA)
    stav.levelUpNabidka = ['sila', 'dosah', 'hbitost']
    vyberPerk(stav, 'dosah')
    expect(stav.aplikovaneSynergie).toEqual([])
  })
})

describe('engine.ts — pouzitSchopnost (bod 11/12 zadání, krok 4/4: aktivní schopnosti)', () => {
  const nahodne0 = () => 0

  const nepritelNaPozici = (id: string, hp: number, pozice: { x: number; z: number }, damage = 5) => ({
    id,
    defId: 'crawler',
    jeBoss: false,
    pozice,
    hp,
    maxHp: hp,
    damage,
    rychlost: 0,
    polomer: 0.4,
    typ: 'pozemni' as const,
    dosahUtoku: 0,
    barva: '#000',
    emoji: '🕷️',
    posledniUtokMs: -Infinity,
    fazeIndex: 0,
    posledniTeleportMs: -Infinity,
    zpomalenoDoMs: -Infinity,
  })

  it('SCHOPNOSTI_IMPLEMENTOVANE obsahuje přesně čtyři z pěti — jen vampire ne (má cooldownMs: 0, je to pasivní efekt)', () => {
    expect(SCHOPNOSTI_IMPLEMENTOVANE.has('fire_nova')).toBe(true)
    expect(SCHOPNOSTI_IMPLEMENTOVANE.has('energy_shield')).toBe(true)
    expect(SCHOPNOSTI_IMPLEMENTOVANE.has('chain_lightning')).toBe(true)
    expect(SCHOPNOSTI_IMPLEMENTOVANE.has('frost_aura')).toBe(true)
    expect(SCHOPNOSTI_IMPLEMENTOVANE.has('vampire')).toBe(false)
  })

  it('neimplementovanou (vampire) nebo neznámou schopnost appka tiše ignoruje — no-op, žádný cooldown se nezapíše', () => {
    const stav = vytvorPocatecniStav(VYCHOZI_POSTAVA)
    pouzitSchopnost(stav, 'vampire', nahodne0)
    pouzitSchopnost(stav, 'neexistujici-id', nahodne0)
    expect(Object.keys(stav.hrac.posledniPouzitiSchopnosti)).toHaveLength(0)
  })

  it('fire_nova zraní nepřátele v dosahu, nechá bez zásahu ty mimo dosah', () => {
    const stav = vytvorPocatecniStav(VYCHOZI_POSTAVA)
    const blizko = nepritelNaPozici('blizko', 999, { x: 1, z: 0 })
    const daleko = nepritelNaPozici('daleko', 999, { x: 50, z: 0 })
    stav.aktivniNepratele.push(blizko, daleko)

    pouzitSchopnost(stav, 'fire_nova', nahodne0)

    expect(blizko.hp).toBeLessThan(999)
    expect(daleko.hp).toBe(999)
  })

  it('fire_nova zabití prochází STEJNOU kořist/XP/level-up cestou jako auto-útok', () => {
    const stav = vytvorPocatecniStav(VYCHOZI_POSTAVA)
    stav.aktivniNepratele.push(nepritelNaPozici('slaby', 1, { x: 1, z: 0 }))
    const xpPred = stav.xpZaBeh

    pouzitSchopnost(stav, 'fire_nova', nahodne0)

    expect(stav.zabitiCelkem).toBe(1)
    expect(stav.xpZaBeh).toBeGreaterThan(xpPred)
    expect(stav.aktivniNepratele).toHaveLength(0)
  })

  it('fire_nova respektuje cooldown — druhé zavolání dřív, než appka uplyne celý cooldown, je no-op', () => {
    const stav = vytvorPocatecniStav(VYCHOZI_POSTAVA)
    stav.aktivniNepratele.push(nepritelNaPozici('cil', 999, { x: 1, z: 0 }))

    pouzitSchopnost(stav, 'fire_nova', nahodne0)
    const hpPoPrvnimPouziti = stav.aktivniNepratele[0].hp

    stav.cas += 100 // hluboko pod fire_nova's 8000 ms cooldownem
    pouzitSchopnost(stav, 'fire_nova', nahodne0)

    expect(stav.aktivniNepratele[0].hp).toBe(hpPoPrvnimPouziti)
  })

  it('fire_nova jde použít znovu, jakmile appka uplyne celý cooldown', () => {
    const stav = vytvorPocatecniStav(VYCHOZI_POSTAVA)
    stav.aktivniNepratele.push(nepritelNaPozici('cil', 999, { x: 1, z: 0 }))

    pouzitSchopnost(stav, 'fire_nova', nahodne0)
    const hpPoPrvnimPouziti = stav.aktivniNepratele[0].hp

    const cooldown = SCHOPNOSTI.find((s) => s.id === 'fire_nova')!.cooldownMs
    stav.cas += cooldown + 1
    pouzitSchopnost(stav, 'fire_nova', nahodne0)

    expect(stav.aktivniNepratele[0].hp).toBeLessThan(hpPoPrvnimPouziti)
  })

  it('energy_shield nastaví reálnou kapacitu absorpce s časovým vypršením v budoucnosti', () => {
    const stav = vytvorPocatecniStav(VYCHOZI_POSTAVA)
    pouzitSchopnost(stav, 'energy_shield', nahodne0)
    expect(stav.hrac.stitAbsorpce).toBeGreaterThan(0)
    expect(stav.hrac.stitVyprsiMs).toBeGreaterThan(stav.cas)
  })

  it('energy_shield pohltí příchozí poškození místo HP, dokud má kapacitu', () => {
    const stav = vytvorPocatecniStav(VYCHOZI_POSTAVA)
    stav.zbyvaSpawnovat = 0
    pouzitSchopnost(stav, 'energy_shield', nahodne0)
    const absorpcePred = stav.hrac.stitAbsorpce
    const hpPred = stav.hrac.hp

    stav.aktivniNepratele.push(nepritelNaPozici('utocnik', 999, { x: 0, z: 0 }, 10))
    krokHry(stav, 16, { x: 0, z: 0 }, nahodne0)

    expect(stav.hrac.hp).toBe(hpPred)
    expect(stav.hrac.stitAbsorpce).toBeLessThan(absorpcePred)
  })

  it('energy_shield přestane chránit, jakmile appka spotřebuje celou kapacitu — přebytek jde na HP', () => {
    const stav = vytvorPocatecniStav(VYCHOZI_POSTAVA)
    stav.zbyvaSpawnovat = 0
    pouzitSchopnost(stav, 'energy_shield', nahodne0)
    stav.hrac.stitAbsorpce = 5 // appka si uměle sníží kapacitu, ať test nemusí čekat na skutečné vyčerpání

    stav.aktivniNepratele.push(nepritelNaPozici('silny', 999, { x: 0, z: 0 }, 20))
    const hpPred = stav.hrac.hp
    krokHry(stav, 16, { x: 0, z: 0 }, nahodne0)

    expect(stav.hrac.stitAbsorpce).toBe(0)
    expect(stav.hrac.hp).toBe(hpPred - 15) // 20 poškození − 5 pohlcených = 15 na HP
  })

  it('energy_shield appka zruší, jakmile uplyne jeho čas, i kdyby kapacita ještě zbývala', () => {
    const stav = vytvorPocatecniStav(VYCHOZI_POSTAVA)
    stav.zbyvaSpawnovat = 0
    pouzitSchopnost(stav, 'energy_shield', nahodne0)
    expect(stav.hrac.stitAbsorpce).toBeGreaterThan(0)

    stav.cas = stav.hrac.stitVyprsiMs + 1 // appka posune čas těsně ZA vypršení, kapacita zůstala nespotřebovaná

    stav.aktivniNepratele.push(nepritelNaPozici('utocnik', 999, { x: 0, z: 0 }, 10))
    const hpPred = stav.hrac.hp
    krokHry(stav, 16, { x: 0, z: 0 }, nahodne0)

    expect(stav.hrac.hp).toBe(hpPred - 10) // celé poškození prošlo, appka štít zrušila
    expect(stav.hrac.stitAbsorpce).toBe(0)
  })

  it('pouzitSchopnost je no-op, dokud čeká levelUpNabidka, nebo už po konci běhu', () => {
    const stav = vytvorPocatecniStav(VYCHOZI_POSTAVA)
    stav.levelUpNabidka = ['sila', 'dosah', 'hbitost']
    pouzitSchopnost(stav, 'energy_shield', nahodne0)
    expect(stav.hrac.stitAbsorpce).toBe(0)

    stav.levelUpNabidka = null
    stav.konec = true
    pouzitSchopnost(stav, 'energy_shield', nahodne0)
    expect(stav.hrac.stitAbsorpce).toBe(0)
  })
})

describe('engine.ts — Health Orb/Potion pickupy (appčino "co ještě zbývá")', () => {
  const nahodne0 = () => 0
  // Vysoký hod umístí pickup daleko od hráče (appka drží 90 % poloměru
  // arény, uhel skoro plná otáčka) — appka ho tak může spawnout, aniž
  // by ho hráč ve STEJNÉM ticku hned znovu sebral (appka sbírá pickupy
  // hned po spawnu, viz engine.ts's krokHry).
  const nahodneDaleko = () => 0.99

  it('první krokHry hned spawne pickup (appka nečeká celý interval na úplně první — stejná okamžitá logika jako u prvního monstra)', () => {
    const stav = vytvorPocatecniStav(VYCHOZI_POSTAVA)
    stav.zbyvaSpawnovat = 0
    krokHry(stav, 16, { x: 0, z: 0 }, nahodneDaleko)
    expect(stav.pickupy).toHaveLength(1)
    expect(stav.pickupy[0].typ).toBe('orb')
  })

  it('nízký hod (pod SANCE_LEKTVAR) appka spawne jako vzácnější lektvar, ne obyčejný orb', () => {
    const stav = vytvorPocatecniStav(VYCHOZI_POSTAVA)
    stav.zbyvaSpawnovat = 0
    krokHry(stav, 16, { x: 0, z: 0 }, () => 0.05)
    expect(stav.pickupy).toHaveLength(1)
    expect(stav.pickupy[0].typ).toBe('lektvar')
  })

  it('appka nikdy nespawne víc pickupů, než je MAX_PICKUPU_NA_ARENE', () => {
    const stav = vytvorPocatecniStav(VYCHOZI_POSTAVA)
    stav.zbyvaSpawnovat = 0
    stav.pickupy = [
      { id: 'p1', typ: 'orb', pozice: { x: 100, z: 100 } },
      { id: 'p2', typ: 'orb', pozice: { x: -100, z: 100 } },
      { id: 'p3', typ: 'orb', pozice: { x: 100, z: -100 } },
    ]
    krokHry(stav, 16, { x: 0, z: 0 }, nahodneDaleko)
    expect(stav.pickupy).toHaveLength(3)
  })

  it('další pickup appka nespawne dřív, než uplyne PICKUP_SPAWN_INTERVAL_MS od posledního', () => {
    const stav = vytvorPocatecniStav(VYCHOZI_POSTAVA)
    stav.zbyvaSpawnovat = 0
    krokHry(stav, 16, { x: 0, z: 0 }, nahodneDaleko) // appka spawne první hned (viz test výš)
    expect(stav.pickupy).toHaveLength(1)

    krokHry(stav, 16, { x: 0, z: 0 }, nahodneDaleko) // jen +16 ms — appka MUSÍ počkat
    expect(stav.pickupy).toHaveLength(1)

    krokHry(stav, 7000, { x: 0, z: 0 }, nahodneDaleko) // appka uplyne celý interval
    expect(stav.pickupy).toHaveLength(2)
  })

  it('sebratPickupy vyléčí hráče, pickup zmizí ze země, appka nikdy nepřeléčí nad maxHp', () => {
    const stav = vytvorPocatecniStav(VYCHOZI_POSTAVA)
    stav.zbyvaSpawnovat = 0
    stav.hrac.hp = stav.hrac.maxHp - 10 // chybí 10 HP
    stav.pickupy = [{ id: 'p1', typ: 'orb', pozice: { x: 0, z: 0 } }] // přesně na hráči
    stav.posledniPickupSpawnMs = stav.cas // appka potlačí ambientní spawn, ať test měří jen tenhle jeden pickup
    krokHry(stav, 16, { x: 0, z: 0 }, nahodne0)
    // appčin orb léčí round(maxHp * 0.15) = 15, ale appka nedovolí
    // přeléčit nad maxHp — appka tak ořeže na chybějících 10.
    expect(stav.hrac.hp).toBe(stav.hrac.maxHp)
    expect(stav.pickupy).toHaveLength(0)
  })

  it('pickup appka sebere, i když je hráč na plné HP — jen se nic nevyléčí (žádné "šetření si ho")', () => {
    const stav = vytvorPocatecniStav(VYCHOZI_POSTAVA)
    stav.zbyvaSpawnovat = 0
    const hpPred = stav.hrac.hp
    stav.pickupy = [{ id: 'p1', typ: 'lektvar', pozice: { x: 0, z: 0 } }]
    stav.posledniPickupSpawnMs = stav.cas
    krokHry(stav, 16, { x: 0, z: 0 }, nahodne0)
    expect(stav.hrac.hp).toBe(hpPred)
    expect(stav.pickupy).toHaveLength(0)
  })

  it('pickup appka nesebere, dokud je hráč mimo dosah', () => {
    const stav = vytvorPocatecniStav(VYCHOZI_POSTAVA)
    stav.zbyvaSpawnovat = 0
    stav.hrac.hp = 1
    stav.pickupy = [{ id: 'p1', typ: 'orb', pozice: { x: 20, z: 0 } }]
    stav.posledniPickupSpawnMs = stav.cas
    krokHry(stav, 16, { x: 0, z: 0 }, nahodne0)
    expect(stav.hrac.hp).toBe(1)
    expect(stav.pickupy).toHaveLength(1)
  })
})

describe('engine.ts — pouzitSchopnost: chain_lightning a frost_aura (dvě další ze čtyř implementovaných)', () => {
  const nahodne0 = () => 0

  const nepritelNaPozici = (id: string, hp: number, pozice: { x: number; z: number }, rychlost = 0) => ({
    id,
    defId: 'crawler',
    jeBoss: false,
    pozice,
    hp,
    maxHp: hp,
    damage: 5,
    rychlost,
    polomer: 0.4,
    typ: 'pozemni' as const,
    dosahUtoku: 0,
    barva: '#000',
    emoji: '🕷️',
    posledniUtokMs: -Infinity,
    fazeIndex: 0,
    posledniTeleportMs: -Infinity,
    zpomalenoDoMs: -Infinity,
  })

  it('chain_lightning skáče od nejbližšího k dalšímu, poškození u KAŽDÉHO dalšího skoku klesá', () => {
    const stav = vytvorPocatecniStav(VYCHOZI_POSTAVA)
    stav.zbyvaSpawnovat = 0
    const a = nepritelNaPozici('a', 999, { x: 2, z: 0 })
    const b = nepritelNaPozici('b', 999, { x: 6, z: 0 }) // 4 od `a`, v dosahu skoku
    const c = nepritelNaPozici('c', 999, { x: 10, z: 0 }) // 4 od `b`, v dosahu skoku
    stav.aktivniNepratele.push(a, b, c)

    pouzitSchopnost(stav, 'chain_lightning', nahodne0)

    // damage = round(20*2) = 40; round(40*0.7) = 28; round(28*0.7) = 20
    expect(a.hp).toBe(999 - 40)
    expect(b.hp).toBe(999 - 28)
    expect(c.hp).toBe(999 - 20)
  })

  it('chain_lightning nikdy nezasáhne stejného nepřítele dvakrát a respektuje CHAIN_LIGHTNING_MAX_CILU', () => {
    const stav = vytvorPocatecniStav(VYCHOZI_POSTAVA)
    stav.zbyvaSpawnovat = 0
    // 5 nepřátel v řadě po 3 od sebe — appka smí zasáhnout jen první 4.
    const nepratele = [0, 3, 6, 9, 12].map((x, i) => nepritelNaPozici(`n${i}`, 999, { x, z: 0 }))
    stav.aktivniNepratele.push(...nepratele)

    pouzitSchopnost(stav, 'chain_lightning', nahodne0)

    const zasazeni = nepratele.filter((n) => n.hp < 999)
    expect(zasazeni).toHaveLength(4)
    expect(nepratele[4].hp).toBe(999) // pátý (nejdál) appka nechá bez zásahu
  })

  it('chain_lightning bez jediného nepřítele v dosahu je jen "whiff" — appka i tak zapíše cooldown', () => {
    const stav = vytvorPocatecniStav(VYCHOZI_POSTAVA)
    pouzitSchopnost(stav, 'chain_lightning', nahodne0)
    expect(stav.hrac.posledniPouzitiSchopnosti.chain_lightning).toBe(0)
    // Zavolání znovu ihned appka odmítne — cooldown ještě neuplynul.
    stav.hrac.posledniPouzitiSchopnosti.chain_lightning = -Infinity // appka by jinak musela čekat 6 s
    pouzitSchopnost(stav, 'chain_lightning', nahodne0)
    expect(stav.hrac.posledniPouzitiSchopnosti.chain_lightning).toBe(0) // zapsáno znovu, appka to skutečně provedla
  })

  it('chain_lightning zabití prochází STEJNOU kořist/XP cestou jako auto-útok (zpracujZabitiNepritele)', () => {
    const stav = vytvorPocatecniStav(VYCHOZI_POSTAVA)
    stav.zbyvaSpawnovat = 0
    stav.aktivniNepratele.push(nepritelNaPozici('slaby', 1, { x: 1, z: 0 }))
    pouzitSchopnost(stav, 'chain_lightning', nahodne0)
    expect(stav.aktivniNepratele).toHaveLength(0)
    expect(stav.zabitiCelkem).toBe(1)
    expect(stav.xpZaBeh).toBe(MONSTRA.crawler.xp)
  })

  it('frost_aura zasáhne jen nepřátele v dosahu (FROST_AURA_POLOMER) a nastaví jim zpomalenoDoMs do budoucnosti', () => {
    const stav = vytvorPocatecniStav(VYCHOZI_POSTAVA)
    stav.zbyvaSpawnovat = 0
    const blizko = nepritelNaPozici('blizko', 999, { x: 4, z: 0 })
    const daleko = nepritelNaPozici('daleko', 999, { x: 12, z: 0 })
    stav.aktivniNepratele.push(blizko, daleko)

    pouzitSchopnost(stav, 'frost_aura', nahodne0)

    expect(blizko.zpomalenoDoMs).toBeGreaterThan(stav.cas)
    expect(daleko.zpomalenoDoMs).toBe(-Infinity)
  })

  it('frost_aura opravdu zpomalí pohyb zasaženého nepřítele oproti nezasaženému, na stejnou vzdálenost k hráči', () => {
    const stav = vytvorPocatecniStav(VYCHOZI_POSTAVA)
    stav.zbyvaSpawnovat = 0
    const zpomaleny = nepritelNaPozici('zpomaleny', 999, { x: 4, z: 0 }, 2) // v dosahu aury
    const normalni = nepritelNaPozici('normalni', 999, { x: 12, z: 0 }, 2) // mimo dosah
    stav.aktivniNepratele.push(zpomaleny, normalni)

    pouzitSchopnost(stav, 'frost_aura', nahodne0)
    krokHry(stav, 500, { x: 0, z: 0 }, nahodne0) // 0.5 s pohybu

    // Bez zpomalení by oba ušli rychlost×dt = 2×0.5 = 1.0. Appka
    // zpomalenému sníží efektivní rychlost na FROST_AURA_ZPOMALENI_NASOBIC
    // (0.35)×, takže ušel jen 0.35 — výrazně méně než nezpomalený.
    const posunZpomaleny = 4 - zpomaleny.pozice.x
    const posunNormalni = 12 - normalni.pozice.x
    expect(posunZpomaleny).toBeCloseTo(0.35, 5)
    expect(posunNormalni).toBeCloseTo(1, 5)
  })

  it('frost_aura zpomalení appka zruší, jakmile uplyne jeho trvání', () => {
    const stav = vytvorPocatecniStav(VYCHOZI_POSTAVA)
    stav.zbyvaSpawnovat = 0
    const nepritel = nepritelNaPozici('n', 999, { x: 4, z: 0 }, 2)
    stav.aktivniNepratele.push(nepritel)
    pouzitSchopnost(stav, 'frost_aura', nahodne0)

    stav.cas = nepritel.zpomalenoDoMs + 1 // appka posune čas těsně ZA vypršení

    krokHry(stav, 500, { x: 0, z: 0 }, nahodne0)
    const posun = 4 - nepritel.pozice.x
    expect(posun).toBeCloseTo(1, 5) // plná rychlost, appka zpomalení už nepoužije
  })
})

describe('engine.ts — vytvorHrace/vytvorPocatecniStav: výběr zbraně (appčino "co dál tam chybí" bod 4)', () => {
  it('bez druhého argumentu je chování naprosto stejné jako s explicitním VYCHOZI_ZBRAN (nulová regrese)', () => {
    const bezZbrane = vytvorHrace(VYCHOZI_POSTAVA)
    const sVychoziZbrani = vytvorHrace(VYCHOZI_POSTAVA, VYCHOZI_ZBRAN)
    expect(bezZbrane).toEqual(sVychoziZbrani)
  })

  it('s výchozí zbraní (Iron Sword) appka počítá damage čistě z postavy — přesně jako appka dělala předtím, než zbraně vůbec šlo měnit', () => {
    const hrac = vytvorHrace(VYCHOZI_POSTAVA, VYCHOZI_ZBRAN)
    expect(hrac.damage).toBe(VYCHOZI_POSTAVA.damage)
    expect(hrac.dosahUtoku).toBe(VYCHOZI_ZBRAN.dosah)
    expect(hrac.utokyZaSekundu).toBe(VYCHOZI_ZBRAN.utokyZaSekundu)
  })

  it('dosah/rychlost útoku appka bere PŘÍMO ze zbraně, ne z postavy', () => {
    const frostStaff = zbranPodleId('frost_staff')
    const hrac = vytvorHrace(VYCHOZI_POSTAVA, frostStaff)
    expect(hrac.dosahUtoku).toBe(frostStaff.dosah)
    expect(hrac.utokyZaSekundu).toBe(frostStaff.utokyZaSekundu)
  })

  it('damage je postavina vlastní hodnota PLUS rozdíl zbraně proti Iron Swordu — silnější zbraň zvýší damage, slabší ho sníží', () => {
    const voidScythe = zbranPodleId('void_scythe') // damage 34, o 16 víc než Iron Sword (18)
    const frostStaff = zbranPodleId('frost_staff') // damage 14, o 4 míň než Iron Sword

    const seScythem = vytvorHrace(VYCHOZI_POSTAVA, voidScythe)
    const sFrostStaffem = vytvorHrace(VYCHOZI_POSTAVA, frostStaff)

    expect(seScythem.damage).toBe(VYCHOZI_POSTAVA.damage + 16)
    expect(sFrostStaffem.damage).toBe(VYCHOZI_POSTAVA.damage - 4)
    expect(seScythem.damage).toBeGreaterThan(sFrostStaffem.damage)
  })

  it('vytvorPocatecniStav předá zbraň dál do vytvorHrace — hráč reálně START s vybranou zbraní, ne s Iron Swordem natvrdo', () => {
    const voidScythe = zbranPodleId('void_scythe')
    const stav = vytvorPocatecniStav(VYCHOZI_POSTAVA, voidScythe)
    expect(stav.hrac.dosahUtoku).toBe(voidScythe.dosah)
    expect(stav.hrac.utokyZaSekundu).toBe(voidScythe.utokyZaSekundu)
  })

  it('zbranPodleId vrátí VYCHOZI_ZBRAN pro neznámé/poškozené id, ne že by appka spadla', () => {
    expect(zbranPodleId('neexistuje')).toBe(VYCHOZI_ZBRAN)
  })

  it('všech 5 zbraní má platnou raritu a jen Iron Sword nemá odemkovaciCena (appka ho dává zdarma)', () => {
    expect(ZBRANE).toHaveLength(5)
    const ironSword = ZBRANE.find((z) => z.id === 'iron_sword')
    expect(ironSword?.odemkovaciCena).toBeUndefined()
    for (const z of ZBRANE) {
      if (z.id === 'iron_sword') continue
      expect(z.odemkovaciCena).toBeGreaterThan(0)
    }
  })
})
