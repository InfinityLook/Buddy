import { describe, it, expect } from 'vitest'
import { Udalost, pocetNadchazejicichUdalosti, udalostSeVyskytujeVDen } from '@/miniapps/kalendar/types'
import { validateKalendarData } from '@/core/utils/kalendarValidation'

// ==========================================
// Opakující se události (viz CLAUDE.md) — appka nikdy neukládá
// jednotlivé budoucí výskyty zvlášť, jen první datum a typ opakování,
// takže výskyt se vždycky počítá znovu, ne čte z uloženého seznamu.
// ==========================================

const udalost = (patch: Partial<Udalost> = {}): Udalost => ({
  id: 'u1',
  datum: '2025-01-06', // pondělí
  nazev: 'Test',
  popis: '',
  createdAt: 0,
  opakovani: 'zadne',
  updatedAt: 0,
  deletedAt: null,
  ...patch,
})

describe('udalostSeVyskytujeVDen', () => {
  it('jednorázová událost se vyskytuje jen ve svém vlastním dni', () => {
    const u = udalost({ opakovani: 'zadne' })
    expect(udalostSeVyskytujeVDen(u, '2025-01-06')).toBe(true)
    expect(udalostSeVyskytujeVDen(u, '2025-01-13')).toBe(false)
  })

  it('žádná událost se nikdy nevyskytuje PŘED svým prvním datem', () => {
    const u = udalost({ datum: '2025-01-06', opakovani: 'tydne' })
    expect(udalostSeVyskytujeVDen(u, '2025-01-05')).toBe(false)
  })

  it('týdenní opakování se vyskytuje o 7, 14, 21 dní později, ne mimo', () => {
    const u = udalost({ datum: '2025-01-06', opakovani: 'tydne' })
    expect(udalostSeVyskytujeVDen(u, '2025-01-13')).toBe(true)
    expect(udalostSeVyskytujeVDen(u, '2025-01-20')).toBe(true)
    expect(udalostSeVyskytujeVDen(u, '2025-01-27')).toBe(true)
    // O den vedle — stejný týden v týdnu ale ne násobek 7 dní od prvního.
    expect(udalostSeVyskytujeVDen(u, '2025-01-14')).toBe(false)
  })

  it('měsíční opakování se vyskytuje ve stejný den v měsíci, i v jiném roce', () => {
    const u = udalost({ datum: '2025-01-15', opakovani: 'mesicne' })
    expect(udalostSeVyskytujeVDen(u, '2025-02-15')).toBe(true)
    expect(udalostSeVyskytujeVDen(u, '2026-01-15')).toBe(true)
    expect(udalostSeVyskytujeVDen(u, '2025-02-16')).toBe(false)
  })

  it('měsíční opakování na 31. den prostě přeskočí měsíc, co ho nemá', () => {
    const u = udalost({ datum: '2025-01-31', opakovani: 'mesicne' })
    expect(udalostSeVyskytujeVDen(u, '2025-04-30')).toBe(false)
    expect(udalostSeVyskytujeVDen(u, '2025-03-31')).toBe(true)
  })
})

describe('pocetNadchazejicichUdalosti', () => {
  it('jednorázová událost v minulosti se nepočítá, v budoucnosti ano', () => {
    const udalosti = [
      udalost({ id: 'a', datum: '2025-01-01', opakovani: 'zadne' }),
      udalost({ id: 'b', datum: '2025-06-01', opakovani: 'zadne' }),
    ]
    expect(pocetNadchazejicichUdalosti(udalosti, '2025-03-01')).toBe(1)
  })

  it('opakující se událost se počítá vždycky, i kdyby první výskyt už proběhl', () => {
    const udalosti = [udalost({ id: 'a', datum: '2020-01-01', opakovani: 'tydne' })]
    expect(pocetNadchazejicichUdalosti(udalosti, '2025-03-01')).toBe(1)
  })
})

describe('validateKalendarData', () => {
  it('starší uložená událost bez pole opakovani dostane bezpečnou výchozí hodnotu "zadne"', () => {
    const vysledek = validateKalendarData({
      udalosti: [{ id: 'u1', datum: '2025-01-01', nazev: 'Stará událost' }],
    })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) expect(vysledek.data.udalosti[0].opakovani).toBe('zadne')
  })

  it('neplatná hodnota opakovani se u té jedné položky tiše vyřadí', () => {
    const vysledek = validateKalendarData({
      udalosti: [{ id: 'u1', datum: '2025-01-01', nazev: 'Špatné opakování', opakovani: 'rocne' }],
    })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) expect(vysledek.data.udalosti).toHaveLength(0)
  })

  it('starší tvar (barvyDni jako Record<datum, barva>) se tiše převede na nový', () => {
    const vysledek = validateKalendarData({ barvyDni: { '2025-01-01': 'cyan', '2025-01-02': 'neplatna-barva' } })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) {
      expect(vysledek.data.barvyDniZaznamy).toHaveLength(1)
      expect(vysledek.data.barvyDniZaznamy[0]).toMatchObject({ id: '2025-01-01', datum: '2025-01-01', barva: 'cyan' })
    }
  })

  it('nový tvar (pole barvyDniZaznamy) projde beze změny', () => {
    const vysledek = validateKalendarData({
      barvyDniZaznamy: [{ id: '2025-01-01', datum: '2025-01-01', barva: 'violet' }],
    })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) expect(vysledek.data.barvyDniZaznamy).toHaveLength(1)
  })
})
