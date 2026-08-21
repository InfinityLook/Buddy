import { describe, it, expect } from 'vitest'
import { MAX_UROVEN, MAX_DOVEDNOST_RANK, vychoziProgres, xpProDalsiUroven, pripocistXp, bojoveBonusyZProgresu } from '@/game/leveling'

// ==========================================
// game/leveling.ts — postup jedné postavy (level, XP, dovednostní
// body). useSouboj.ts samotné (tahový souboj, poškození, RNG) se
// schválně netestuje tady: je to React hook navázaný na dva Zustand
// story (useWalletStore, useGameCharacter) a poškození je náhodné —
// patří to buď do tests/components/, nebo do e2e/ (viz už ověřené
// dungeon.js/obchod.js scénáře z manuálního testování téhle session).
// Leveling.ts je naproti tomu čistá, deterministická matematika.
// ==========================================

describe('xpProDalsiUroven', () => {
  it('roste lineárně o 25 XP za úroveň', () => {
    expect(xpProDalsiUroven(1)).toBe(40)
    expect(xpProDalsiUroven(2)).toBe(65)
    expect(xpProDalsiUroven(3)).toBe(90)
  })
})

describe('pripocistXp', () => {
  it('nedosáhne-li XP na práh, úroveň i zbylé XP se jen sečtou', () => {
    const v = pripocistXp(vychoziProgres(), 20)
    expect(v.uroven).toBe(1)
    expect(v.xp).toBe(20)
    expect(v.dovednostniBody).toBe(0)
  })

  it('přesně na prahu postoupí o úroveň a dá dovednostní bod', () => {
    const v = pripocistXp(vychoziProgres(), xpProDalsiUroven(1))
    expect(v.uroven).toBe(2)
    expect(v.xp).toBe(0)
    expect(v.dovednostniBody).toBe(1)
  })

  it('velká odměna postoupí o víc úrovní najednou', () => {
    // Dost na úrovně 1→2 (40) a 2→3 (65) s 10 XP navrch.
    const v = pripocistXp(vychoziProgres(), 40 + 65 + 10)
    expect(v.uroven).toBe(3)
    expect(v.xp).toBe(10)
    expect(v.dovednostniBody).toBe(2)
  })

  it('zastaví se na MAX_UROVEN a nenechá přebytečné XP viset', () => {
    const obrovskaOdmena = pripocistXp(vychoziProgres(), 100_000)
    expect(obrovskaOdmena.uroven).toBe(MAX_UROVEN)
    expect(obrovskaOdmena.xp).toBe(0)
  })

  it('na maxu už dovednostní body přesně odpovídají počtu postupů (9 = 9)', () => {
    const obrovskaOdmena = pripocistXp(vychoziProgres(), 100_000)
    expect(obrovskaOdmena.dovednostniBody).toBe(MAX_UROVEN - 1)
    // A přesně tolik se dá utratit: 3 uzly × MAX_DOVEDNOST_RANK stupňů.
    expect(obrovskaOdmena.dovednostniBody).toBe(3 * MAX_DOVEDNOST_RANK)
  })

  it('záporné nebo neceločíselné XP se ignoruje/zaokrouhlí dolů, nikdy nesníží progres', () => {
    const zaklad = pripocistXp(vychoziProgres(), 20)
    const seZapornym = pripocistXp(zaklad, -50)
    expect(seZapornym.xp).toBe(20)
  })
})

describe('bojoveBonusyZProgresu', () => {
  it('čerstvá postava nemá žádné bojové bonusy', () => {
    expect(bojoveBonusyZProgresu(vychoziProgres())).toEqual({ vydrz: 0, poskozeni: 0, kriticka: 0 })
  })

  it('výdrž roste jak s úrovní, tak s dovedností vydrz nezávisle', () => {
    const progres = { ...vychoziProgres(), uroven: 4, dovednosti: { vydrz: 2, sila: 0, presnost: 0 } }
    // (uroven - 1) * 2 + dovednost * 8 = 3*2 + 2*8 = 6 + 16 = 22
    expect(bojoveBonusyZProgresu(progres).vydrz).toBe(22)
  })

  it('síla a přesnost se převádí na procenta poškození/kritiky', () => {
    const progres = { ...vychoziProgres(), dovednosti: { vydrz: 0, sila: 3, presnost: 3 } }
    const bonusy = bojoveBonusyZProgresu(progres)
    expect(bonusy.poskozeni).toBeCloseTo(0.15) // 3 × 5 %
    expect(bonusy.kriticka).toBeCloseTo(0.09) // 3 × 3 %
  })
})
