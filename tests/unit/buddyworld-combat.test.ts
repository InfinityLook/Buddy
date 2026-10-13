import { describe, expect, it } from 'vitest'
import {
  DOSAH_UTOKU_HRACE,
  COOLDOWN_UTOKU_HRACE_MS,
  POSKOZENI_HRACE_MIN,
  POSKOZENI_HRACE_MAX,
  RESPAWN_PO_MS,
  jePripravenUtok,
  krokAI,
  melByRespawnovat,
  omezNaOblast,
  pokusUtokHrace,
  pokusUtokNepritele,
  vytvorNepritelRuntime,
  vzdalenost2D,
} from '@/buddyworld/combat/engine'
import type { NepritelDef } from '@/buddyworld/types'

const DEF: NepritelDef = {
  id: 'test-nepritel',
  jmeno: 'Testovací vlček',
  ikona: '🐺',
  maxHp: 40,
  poskozeni: 6,
  dosahUtoku: 1.5,
  dosahDetekce: 7,
  rychlost: 2.6,
  cooldownUtokuMs: 1200,
  odmenaXp: 25,
  model: null,
}

describe('vzdalenost2D', () => {
  it('spočítá Eukleidovskou vzdálenost dvou bodů', () => {
    expect(vzdalenost2D({ x: 0, z: 0 }, { x: 3, z: 4 })).toBe(5)
  })
})

describe('omezNaOblast', () => {
  it('nechá pozici uvnitř oblasti beze změny', () => {
    const pozice = { x: 5, z: 5 }
    expect(omezNaOblast(pozice, 20)).toEqual(pozice)
  })

  it('zkrátí pozici mimo oblast na její okraj', () => {
    const omezena = omezNaOblast({ x: 30, z: 0 }, 10)
    expect(omezena.x).toBeCloseTo(10)
    expect(omezena.z).toBeCloseTo(0)
  })

  it('nehroutí se na středu (0,0)', () => {
    expect(omezNaOblast({ x: 0, z: 0 }, 10)).toEqual({ x: 0, z: 0 })
  })
})

describe('vytvorNepritelRuntime', () => {
  it('nastaví plné HP, klidovou fázi a žádný respawn/útok v minulosti', () => {
    const n = vytvorNepritelRuntime(DEF.id, DEF.maxHp, { x: 1, z: 2 })
    expect(n.hp).toBe(DEF.maxHp)
    expect(n.faze).toBe('klid')
    expect(n.posledniUtokMs).toBe(-Infinity)
    expect(n.respawnOdMs).toBe(-Infinity)
    expect(n.pozice).toEqual({ x: 1, z: 2 })
  })
})

describe('krokAI', () => {
  it('mrtvého nepřítele vůbec nezmění', () => {
    const mrtvy = { ...vytvorNepritelRuntime(DEF.id, DEF.maxHp, { x: 0, z: 0 }), faze: 'mrtvy' as const, hp: 0 }
    expect(krokAI(mrtvy, DEF, { x: 0, z: 0 }, 1)).toBe(mrtvy)
  })

  it('zůstane v klidu, pokud je hráč mimo detekční dosah', () => {
    const n = vytvorNepritelRuntime(DEF.id, DEF.maxHp, { x: 0, z: 0 })
    const vysledek = krokAI(n, DEF, { x: 100, z: 0 }, 1)
    expect(vysledek.faze).toBe('klid')
  })

  it('začne honit hráče uvnitř detekčního dosahu, mimo útočný', () => {
    const n = vytvorNepritelRuntime(DEF.id, DEF.maxHp, { x: 0, z: 0 })
    const vysledek = krokAI(n, DEF, { x: 5, z: 0 }, 1)
    expect(vysledek.faze).toBe('honi')
    expect(vysledek.pozice.x).toBeGreaterThan(0)
  })

  it('přejde na útok uvnitř útočného dosahu, pozici nemění', () => {
    const n = vytvorNepritelRuntime(DEF.id, DEF.maxHp, { x: 1, z: 0 })
    const vysledek = krokAI(n, DEF, { x: 0, z: 0 }, 1)
    expect(vysledek.faze).toBe('utoci')
    expect(vysledek.pozice).toEqual({ x: 1, z: 0 })
  })

  it('vrátí se zpátky do klidu, jakmile se hráč vzdálí za detekční dosah', () => {
    const honici = { ...vytvorNepritelRuntime(DEF.id, DEF.maxHp, { x: 0, z: 0 }), faze: 'honi' as const }
    const vysledek = krokAI(honici, DEF, { x: 100, z: 0 }, 1)
    expect(vysledek.faze).toBe('klid')
  })
})

describe('pokusUtokNepritele', () => {
  it('neudeří mimo fázi "utoci"', () => {
    const n = vytvorNepritelRuntime(DEF.id, DEF.maxHp, { x: 0, z: 0 })
    const vysledek = pokusUtokNepritele(n, DEF, 1000)
    expect(vysledek.provedeno).toBe(false)
  })

  it('neudeří dřív, než uplyne cooldown', () => {
    const utocici = { ...vytvorNepritelRuntime(DEF.id, DEF.maxHp, { x: 0, z: 0 }), faze: 'utoci' as const, posledniUtokMs: 1000 }
    const vysledek = pokusUtokNepritele(utocici, DEF, 1000 + DEF.cooldownUtokuMs - 1)
    expect(vysledek.provedeno).toBe(false)
  })

  it('udeří přesně jednou, jakmile cooldown uplyne, a aktualizuje čas útoku', () => {
    const utocici = { ...vytvorNepritelRuntime(DEF.id, DEF.maxHp, { x: 0, z: 0 }), faze: 'utoci' as const, posledniUtokMs: 1000 }
    const casUtoku = 1000 + DEF.cooldownUtokuMs
    const vysledek = pokusUtokNepritele(utocici, DEF, casUtoku)
    expect(vysledek.provedeno).toBe(true)
    expect(vysledek.poskozeni).toBe(DEF.poskozeni)
    expect(vysledek.nepritel.posledniUtokMs).toBe(casUtoku)
  })
})

describe('pokusUtokHrace', () => {
  it('neudeří mrtvého nepřítele', () => {
    const mrtvy = { ...vytvorNepritelRuntime(DEF.id, DEF.maxHp, { x: 0, z: 0 }), faze: 'mrtvy' as const }
    const vysledek = pokusUtokHrace(mrtvy, 0, -Infinity, 1000)
    expect(vysledek.provedeno).toBe(false)
  })

  it('neudeří nepřítele mimo dosah útoku hráče', () => {
    const n = vytvorNepritelRuntime(DEF.id, DEF.maxHp, { x: 0, z: 0 })
    const vysledek = pokusUtokHrace(n, DOSAH_UTOKU_HRACE + 1, -Infinity, 1000)
    expect(vysledek.provedeno).toBe(false)
  })

  it('neudeří dřív, než uplyne appčin cooldown útoku hráče', () => {
    const n = vytvorNepritelRuntime(DEF.id, DEF.maxHp, { x: 0, z: 0 })
    const vysledek = pokusUtokHrace(n, 0, 1000, 1000 + COOLDOWN_UTOKU_HRACE_MS - 1)
    expect(vysledek.provedeno).toBe(false)
  })

  it('udeří v rámci dosahu a cooldownu, poškození padne do appčina rozsahu', () => {
    const n = vytvorNepritelRuntime(DEF.id, DEF.maxHp, { x: 0, z: 0 })
    const vysledekMin = pokusUtokHrace(n, 0, -Infinity, 1000, () => 0)
    const vysledekMax = pokusUtokHrace(n, 0, -Infinity, 1000, () => 1)
    expect(vysledekMin.provedeno).toBe(true)
    expect(vysledekMin.poskozeni).toBe(POSKOZENI_HRACE_MIN)
    expect(vysledekMax.poskozeni).toBe(POSKOZENI_HRACE_MAX)
  })

  it('porazí nepřítele, jakmile HP klesne na nulu, a nastaví appčin respawn', () => {
    const skoroMrtvy = { ...vytvorNepritelRuntime(DEF.id, DEF.maxHp, { x: 0, z: 0 }), hp: 5 }
    const vysledek = pokusUtokHrace(skoroMrtvy, 0, -Infinity, 1000, () => 0)
    expect(vysledek.porazen).toBe(true)
    expect(vysledek.nepritel.faze).toBe('mrtvy')
    expect(vysledek.nepritel.hp).toBe(0)
    expect(vysledek.nepritel.respawnOdMs).toBe(1000 + RESPAWN_PO_MS)
  })

  it('nezabije nepřítele, kterému zbývá víc HP, než je appčino poškození', () => {
    const n = vytvorNepritelRuntime(DEF.id, DEF.maxHp, { x: 0, z: 0 })
    const vysledek = pokusUtokHrace(n, 0, -Infinity, 1000, () => 0)
    expect(vysledek.porazen).toBe(false)
    expect(vysledek.nepritel.hp).toBe(DEF.maxHp - POSKOZENI_HRACE_MIN)
  })
})

describe('melByRespawnovat', () => {
  it('je nepravda, pokud nepřítel není mrtvý', () => {
    const n = vytvorNepritelRuntime(DEF.id, DEF.maxHp, { x: 0, z: 0 })
    expect(melByRespawnovat(n, 999999)).toBe(false)
  })

  it('je nepravda, dokud appčin respawnOdMs ještě neuplynul', () => {
    const mrtvy = { ...vytvorNepritelRuntime(DEF.id, DEF.maxHp, { x: 0, z: 0 }), faze: 'mrtvy' as const, respawnOdMs: 5000 }
    expect(melByRespawnovat(mrtvy, 4999)).toBe(false)
  })

  it('je pravda, jakmile respawnOdMs uplyne', () => {
    const mrtvy = { ...vytvorNepritelRuntime(DEF.id, DEF.maxHp, { x: 0, z: 0 }), faze: 'mrtvy' as const, respawnOdMs: 5000 }
    expect(melByRespawnovat(mrtvy, 5000)).toBe(true)
  })
})

describe('jePripravenUtok', () => {
  it('je nepravda pro mrtvého nepřítele', () => {
    const mrtvy = { ...vytvorNepritelRuntime(DEF.id, DEF.maxHp, { x: 0, z: 0 }), faze: 'mrtvy' as const }
    expect(jePripravenUtok(mrtvy, 0, -Infinity, 1000)).toBe(false)
  })

  it('je nepravda mimo dosah', () => {
    const n = vytvorNepritelRuntime(DEF.id, DEF.maxHp, { x: 0, z: 0 })
    expect(jePripravenUtok(n, DOSAH_UTOKU_HRACE + 1, -Infinity, 1000)).toBe(false)
  })

  it('je nepravda, dokud cooldown neuplyne', () => {
    const n = vytvorNepritelRuntime(DEF.id, DEF.maxHp, { x: 0, z: 0 })
    expect(jePripravenUtok(n, 0, 1000, 1000 + COOLDOWN_UTOKU_HRACE_MS - 1)).toBe(false)
  })

  it('je pravda, když jsou appčiny podmínky splněné zároveň', () => {
    const n = vytvorNepritelRuntime(DEF.id, DEF.maxHp, { x: 0, z: 0 })
    expect(jePripravenUtok(n, 0, -Infinity, 1000)).toBe(true)
  })
})
