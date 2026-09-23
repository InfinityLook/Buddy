import { describe, it, expect, beforeEach } from 'vitest'
import { useSpanek } from '@/flagships/fitness-room/useSpanek'
import { validateSpanekHodiny, validateSpanekCil } from '@/core/utils/spanekValidation'
import { usePosilovna } from '@/miniapps/posilovna/usePosilovna'
import { validatePosilovnaData } from '@/core/utils/posilovnaValidation'
import { useTelesneMiry } from '@/flagships/fitness-room/useTelesneMiry'
import { spocitejStavCileVahy, spocitejStavCileObvoduPasu } from '@/flagships/fitness-room/telesneMiryStats'
import { usePitnyRezim } from '@/flagships/fitness-room/usePitnyRezim'
import type { ZaznamMiry } from '@/core/utils/telesneMiryValidation'

// ==========================================
// Fitness Roomova "dodělat na 100 %" kontrola — Spánek (nový deník),
// Posilovnovy šablony, cíl váhy/obvodu pasu a Pitného režimu
// posledniPripomenutyDen, testováno stejně jako ostatní malé
// samostatné storey v appce: přímo přes Zustand API, ne přes
// komponentu.
// ==========================================

describe('useSpanek', () => {
  beforeEach(() => {
    useSpanek.setState({ hodiny: {}, cilHod: null })
  })

  it('setHodinySpanku uloží hodiny pro dané datum', () => {
    useSpanek.getState().setHodinySpanku('2024-01-01', 7.5)
    expect(useSpanek.getState().hodiny['2024-01-01']).toBe(7.5)
  })

  it('setHodinySpanku s null nebo 0 zápis pro daný den smaže', () => {
    useSpanek.getState().setHodinySpanku('2024-01-01', 7.5)
    useSpanek.getState().setHodinySpanku('2024-01-01', null)
    expect(useSpanek.getState().hodiny['2024-01-01']).toBeUndefined()

    useSpanek.getState().setHodinySpanku('2024-01-02', 6)
    useSpanek.getState().setHodinySpanku('2024-01-02', 0)
    expect(useSpanek.getState().hodiny['2024-01-02']).toBeUndefined()
  })

  it('setCilHod ukládá jen kladné číslo do 24, jinak null', () => {
    useSpanek.getState().setCilHod(8)
    expect(useSpanek.getState().cilHod).toBe(8)
    useSpanek.getState().setCilHod(0)
    expect(useSpanek.getState().cilHod).toBeNull()
  })
})

describe('validateSpanekHodiny / validateSpanekCil', () => {
  it('platný klíč data a počet hodin 0-24 projdou', () => {
    const vysledek = validateSpanekHodiny({ '2024-01-01': 7.5 })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) expect(vysledek.data['2024-01-01']).toBe(7.5)
  })

  it('neplatný klíč nebo hodnota mimo 0-24 se vyřadí', () => {
    const vysledek = validateSpanekHodiny({ nesmysl: 7, '2024-01-01': 25, '2024-01-02': -1, '2024-01-03': 8 })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) expect(vysledek.data).toEqual({ '2024-01-03': 8 })
  })

  it('cíl hodin spánku je kladné číslo do 24 nebo null', () => {
    expect(validateSpanekCil(8)).toBe(8)
    expect(validateSpanekCil(25)).toBeNull()
    expect(validateSpanekCil(-1)).toBeNull()
    expect(validateSpanekCil('osm')).toBeNull()
    expect(validateSpanekCil(null)).toBeNull()
  })
})

describe('usePosilovna — šablony', () => {
  beforeEach(() => {
    usePosilovna.setState({ sezeni: [], sablony: [] })
  })

  it('ulozitSablonu přidá novou šablonu na začátek', () => {
    usePosilovna.getState().ulozitSablonu('Push Day', ['Bench press', 'Tlak nad hlavu'])
    const sablony = usePosilovna.getState().sablony
    expect(sablony).toHaveLength(1)
    expect(sablony[0].nazev).toBe('Push Day')
    expect(sablony[0].cviky).toEqual(['Bench press', 'Tlak nad hlavu'])
  })

  it('smazatSablonu odebere jen danou šablonu', () => {
    usePosilovna.getState().ulozitSablonu('Push Day', ['Bench press'])
    usePosilovna.getState().ulozitSablonu('Leg Day', ['Dřep s činkou'])
    const idPush = usePosilovna.getState().sablony.find((s) => s.nazev === 'Push Day')!.id
    usePosilovna.getState().smazatSablonu(idPush)
    const sablony = usePosilovna.getState().sablony
    expect(sablony).toHaveLength(1)
    expect(sablony[0].nazev).toBe('Leg Day')
  })
})

describe('validatePosilovnaData — sablony', () => {
  it('poškozená šablona (cviky nejsou pole řetězců) se tiše vyřadí, zbytek zůstane', () => {
    const vysledek = validatePosilovnaData({
      sezeni: [],
      sablony: [
        { id: 'a', nazev: 'Push Day', cviky: ['Bench press'] },
        { id: 'b', nazev: 'Špatně', cviky: [1, 2, 3] },
      ],
    })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) {
      expect(vysledek.data.sablony).toHaveLength(1)
      expect(vysledek.data.sablony[0].id).toBe('a')
    }
  })

  it('chybějící sablony pole spadne na prázdné pole, ne na chybu', () => {
    const vysledek = validatePosilovnaData({ sezeni: [] })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) expect(vysledek.data.sablony).toEqual([])
  })
})

const zaznam = (over: Partial<ZaznamMiry>): ZaznamMiry => ({
  id: over.id ?? 'x',
  datum: over.datum ?? '2024-01-01',
  vahaKg: over.vahaKg ?? null,
  obvodPasuCm: over.obvodPasuCm ?? null,
  hrudnikCm: null,
  bokyCm: null,
  pazeCm: null,
  tukProcent: null,
})

describe('spocitejStavCileVahy / spocitejStavCileObvoduPasu', () => {
  it('bez zadaného cíle vrátí null', () => {
    expect(spocitejStavCileVahy([zaznam({ vahaKg: 80 })], null)).toBeNull()
  })

  it('bez žádného záznamu s vyplněnou váhou vrátí null i s cílem', () => {
    expect(spocitejStavCileVahy([zaznam({ datum: '2024-01-01' })], 75)).toBeNull()
  })

  it('hubnutí (cíl nižší než výchozí váha) počítá procenta správným směrem', () => {
    const zaznamy = [
      zaznam({ id: 'a', datum: '2024-01-01', vahaKg: 90 }),
      zaznam({ id: 'b', datum: '2024-01-15', vahaKg: 85 }),
    ]
    const stav = spocitejStavCileVahy(zaznamy, 80)
    expect(stav).not.toBeNull()
    expect(stav!.vychoziHodnota).toBe(90)
    expect(stav!.aktualniHodnota).toBe(85)
    expect(stav!.cilHodnota).toBe(80)
    // Z 10 kg celkové vzdálenosti (90→80) ušlo 5 kg (90→85) = 50 %.
    expect(stav!.procenta).toBe(50)
  })

  it('přibírání (cíl vyšší než výchozí váha) počítá procenta ve stejném směru', () => {
    const zaznamy = [
      zaznam({ id: 'a', datum: '2024-01-01', vahaKg: 60 }),
      zaznam({ id: 'b', datum: '2024-01-15', vahaKg: 65 }),
    ]
    const stav = spocitejStavCileVahy(zaznamy, 70)
    expect(stav!.procenta).toBe(50)
  })

  it('cíl už dosažen nebo překonán se ořízne na 100 %', () => {
    const zaznamy = [zaznam({ id: 'a', datum: '2024-01-01', vahaKg: 90 }), zaznam({ id: 'b', datum: '2024-01-15', vahaKg: 78 })]
    expect(spocitejStavCileVahy(zaznamy, 80)!.procenta).toBe(100)
  })

  it('vzdálení se od cíle nejde do záporných procent', () => {
    const zaznamy = [zaznam({ id: 'a', datum: '2024-01-01', vahaKg: 80 }), zaznam({ id: 'b', datum: '2024-01-15', vahaKg: 85 })]
    expect(spocitejStavCileVahy(zaznamy, 75)!.procenta).toBe(0)
  })

  it('výchozí hodnota shodná s cílem dá 100 %, dokud se od něj nevzdálí', () => {
    const zaznamy = [zaznam({ id: 'a', datum: '2024-01-01', vahaKg: 80 })]
    expect(spocitejStavCileVahy(zaznamy, 80)!.procenta).toBe(100)
  })

  it('obvod pasu počítá nezávisle na váze', () => {
    const zaznamy = [
      zaznam({ id: 'a', datum: '2024-01-01', obvodPasuCm: 100 }),
      zaznam({ id: 'b', datum: '2024-01-15', obvodPasuCm: 95 }),
    ]
    const stav = spocitejStavCileObvoduPasu(zaznamy, 90)
    expect(stav!.procenta).toBe(50)
  })
})

describe('useTelesneMiry — cíle', () => {
  beforeEach(() => {
    useTelesneMiry.setState({ zaznamy: [], vyskaCm: null, cilVahaKg: null, cilObvodPasuCm: null })
  })

  it('setCilVahaKg/setCilObvodPasuCm ukládají jen kladné číslo, jinak null', () => {
    useTelesneMiry.getState().setCilVahaKg(75)
    expect(useTelesneMiry.getState().cilVahaKg).toBe(75)
    useTelesneMiry.getState().setCilVahaKg(0)
    expect(useTelesneMiry.getState().cilVahaKg).toBeNull()

    useTelesneMiry.getState().setCilObvodPasuCm(90)
    expect(useTelesneMiry.getState().cilObvodPasuCm).toBe(90)
    useTelesneMiry.getState().setCilObvodPasuCm(-5)
    expect(useTelesneMiry.getState().cilObvodPasuCm).toBeNull()
  })
})

describe('usePitnyRezim — posledniPripomenutyDen', () => {
  beforeEach(() => {
    usePitnyRezim.setState({ pocty: {}, cilSklenic: 8, posledniPripomenutyDen: null })
  })

  it('oznacPripomenuto uloží dané datum', () => {
    usePitnyRezim.getState().oznacPripomenuto('2024-01-01')
    expect(usePitnyRezim.getState().posledniPripomenutyDen).toBe('2024-01-01')
  })
})
