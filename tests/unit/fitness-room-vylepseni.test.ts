import { describe, it, expect, beforeEach } from 'vitest'
import { useJidelnicek } from '@/flagships/fitness-room/useJidelnicek'
import { spocitejKalorieDne } from '@/flagships/fitness-room/jidelnicekStats'
import { validateJidelnicekData } from '@/core/utils/jidelnicekValidation'
import { usePitnyRezim } from '@/flagships/fitness-room/usePitnyRezim'
import { validatePitnyRezimPocty, validatePitnyRezimCil } from '@/core/utils/pitnyRezimValidation'
import { useFitnessPripomenuti } from '@/flagships/fitness-room/useFitnessPripomenuti'
import { validateFitnessPripomenutiCasy, validateFitnessPripomenutiOdeslane } from '@/core/utils/fitnessPripomenutiValidation'
import { nejblizsiJidelnicek, DOPORUCENE_JIDELNICKY } from '@/flagships/fitness-room/data/doporuceneJidelnicky'
import { RUTINY } from '@/flagships/fitness-room/data/rutiny'

// ==========================================
// Fitness Roomovo třetí kolo vylepšení — Jídelníček/Pitný režim/víc
// časů připomenutí/VIP doporučené jídelníčky, testováno stejně jako
// ostatní malé samostatné storey v appce (useFitnessCil.ts apod.):
// přímo přes Zustand API, ne přes komponentu.
// ==========================================

describe('useJidelnicek', () => {
  beforeEach(() => {
    useJidelnicek.setState({ zaznamy: [] })
  })

  it('pridatJidlo přidá záznam s ořezaným názvem', () => {
    useJidelnicek.getState().pridatJidlo('2024-01-01', '  Banán  ', 105)
    const zaznamy = useJidelnicek.getState().zaznamy
    expect(zaznamy).toHaveLength(1)
    expect(zaznamy[0].nazev).toBe('Banán')
    expect(zaznamy[0].kcal).toBe(105)
  })

  it('prázdný název nebo nekladné kcal se vůbec nepřidá', () => {
    useJidelnicek.getState().pridatJidlo('2024-01-01', '   ', 100)
    useJidelnicek.getState().pridatJidlo('2024-01-01', 'Něco', 0)
    expect(useJidelnicek.getState().zaznamy).toHaveLength(0)
  })

  it('smazatJidlo odebere jen dané id', () => {
    useJidelnicek.getState().pridatJidlo('2024-01-01', 'Vejce', 78)
    const id = useJidelnicek.getState().zaznamy[0].id
    useJidelnicek.getState().smazatJidlo(id)
    expect(useJidelnicek.getState().zaznamy).toHaveLength(0)
  })
})

describe('spocitejKalorieDne', () => {
  it('sečte jen záznamy daného dne', () => {
    const zaznamy = [
      { id: 'a', datum: '2024-01-01', nazev: 'Banán', kcal: 105 },
      { id: 'b', datum: '2024-01-01', nazev: 'Vejce', kcal: 78 },
      { id: 'c', datum: '2024-01-02', nazev: 'Jiný den', kcal: 500 },
    ]
    expect(spocitejKalorieDne(zaznamy, '2024-01-01')).toBe(183)
  })

  it('den bez žádného záznamu dá 0', () => {
    expect(spocitejKalorieDne([], '2024-01-01')).toBe(0)
  })
})

describe('validateJidelnicekData', () => {
  it('poškozená položka (chybějící kcal) se tiše vyřadí, zbytek zůstane', () => {
    const vysledek = validateJidelnicekData([
      { id: 'a', datum: '2024-01-01', nazev: 'Banán', kcal: 105 },
      { id: 'b', datum: '2024-01-01', nazev: 'Špatně' },
    ])
    expect(vysledek.success).toBe(true)
    if (vysledek.success) {
      expect(vysledek.data).toHaveLength(1)
      expect(vysledek.data[0].id).toBe('a')
    }
  })

  it('neplatný tvar dat (ne pole) se odmítne', () => {
    expect(validateJidelnicekData('nesmysl').success).toBe(false)
  })
})

describe('usePitnyRezim', () => {
  beforeEach(() => {
    usePitnyRezim.setState({ pocty: {}, cilSklenic: 8 })
  })

  it('pridatSklenici zvýší počet pro dané datum, jiné datum nedotkne', () => {
    usePitnyRezim.getState().pridatSklenici('2024-01-01')
    usePitnyRezim.getState().pridatSklenici('2024-01-01')
    expect(usePitnyRezim.getState().pocty['2024-01-01']).toBe(2)
    expect(usePitnyRezim.getState().pocty['2024-01-02']).toBeUndefined()
  })

  it('odebratSklenici nikdy nejde do záporu', () => {
    usePitnyRezim.getState().odebratSklenici('2024-01-01')
    expect(usePitnyRezim.getState().pocty['2024-01-01'] ?? 0).toBe(0)

    usePitnyRezim.getState().pridatSklenici('2024-01-01')
    usePitnyRezim.getState().odebratSklenici('2024-01-01')
    usePitnyRezim.getState().odebratSklenici('2024-01-01')
    expect(usePitnyRezim.getState().pocty['2024-01-01']).toBe(0)
  })

  it('setCilSklenic ukládá jen kladné číslo, jinak null', () => {
    usePitnyRezim.getState().setCilSklenic(10)
    expect(usePitnyRezim.getState().cilSklenic).toBe(10)
    usePitnyRezim.getState().setCilSklenic(0)
    expect(usePitnyRezim.getState().cilSklenic).toBeNull()
  })
})

describe('validatePitnyRezimPocty / validatePitnyRezimCil', () => {
  it('platný klíč data a kladné celé číslo projdou', () => {
    const vysledek = validatePitnyRezimPocty({ '2024-01-01': 5 })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) expect(vysledek.data['2024-01-01']).toBe(5)
  })

  it('neplatný klíč (ne datum) nebo záporné/necelé číslo se vyřadí', () => {
    const vysledek = validatePitnyRezimPocty({ 'nesmysl': 5, '2024-01-01': -2, '2024-01-02': 1.5, '2024-01-03': 3 })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) {
      expect(vysledek.data).toEqual({ '2024-01-03': 3 })
    }
  })

  it('cíl sklenic je kladné číslo nebo null, nikdy nic jiného', () => {
    expect(validatePitnyRezimCil(8)).toBe(8)
    expect(validatePitnyRezimCil(-1)).toBeNull()
    expect(validatePitnyRezimCil('osm')).toBeNull()
    expect(validatePitnyRezimCil(null)).toBeNull()
  })
})

describe('useFitnessPripomenuti', () => {
  beforeEach(() => {
    useFitnessPripomenuti.setState({ casy: ['17:00'], odeslaneDatum: null, odeslaneCasy: [] })
  })

  it('pridatCas přidá nový čas a udrží pole seřazené', () => {
    useFitnessPripomenuti.getState().pridatCas('08:00')
    expect(useFitnessPripomenuti.getState().casy).toEqual(['08:00', '17:00'])
  })

  it('pridatCas se stejným časem znovu nic nezdvojí', () => {
    useFitnessPripomenuti.getState().pridatCas('17:00')
    expect(useFitnessPripomenuti.getState().casy).toEqual(['17:00'])
  })

  it('odebratCas nikdy nesmaže úplně poslední zbývající čas', () => {
    useFitnessPripomenuti.getState().odebratCas('17:00')
    expect(useFitnessPripomenuti.getState().casy).toEqual(['17:00'])
  })

  it('odeslaneCasy se resetují, jakmile se datum liší od odeslaneDatum', () => {
    useFitnessPripomenuti.getState().oznacOdeslano('2024-01-01', '17:00')
    expect(useFitnessPripomenuti.getState().odeslaneCasy).toEqual(['17:00'])

    useFitnessPripomenuti.getState().oznacOdeslano('2024-01-02', '08:00')
    expect(useFitnessPripomenuti.getState().odeslaneDatum).toBe('2024-01-02')
    expect(useFitnessPripomenuti.getState().odeslaneCasy).toEqual(['08:00'])
  })
})

describe('validateFitnessPripomenutiCasy / validateFitnessPripomenutiOdeslane', () => {
  it('platné časy projdou seřazené a bez duplicit', () => {
    expect(validateFitnessPripomenutiCasy(['18:00', '08:00', '08:00'])).toEqual(['08:00', '18:00'])
  })

  it('bez žádného platného času spadne na výchozí ["17:00"]', () => {
    expect(validateFitnessPripomenutiCasy(['nesmysl', '25:99'])).toEqual(['17:00'])
    expect(validateFitnessPripomenutiCasy('nesmysl')).toEqual(['17:00'])
    expect(validateFitnessPripomenutiCasy(undefined)).toEqual(['17:00'])
  })

  it('odeslané časy jen filtrují platný tvar, prázdné pole je v pořádku', () => {
    expect(validateFitnessPripomenutiOdeslane(['17:00', 'nesmysl'])).toEqual(['17:00'])
    expect(validateFitnessPripomenutiOdeslane(undefined)).toEqual([])
  })
})

describe('nejblizsiJidelnicek', () => {
  it('vybere jídelníček s cilovouKcal nejblíž zadanému cíli', () => {
    expect(nejblizsiJidelnicek(1550).id).toBe('nizkokaloricky')
    expect(nejblizsiJidelnicek(2100).id).toBe('vyvazeny')
    expect(nejblizsiJidelnicek(2700).id).toBe('objemovy')
  })

  it('bez cíle (null) vrátí prostřední (vyvážený)', () => {
    expect(nejblizsiJidelnicek(null).id).toBe('vyvazeny')
  })

  it('cíl přesně mezi dvěma jídelníčky vybere ten dřívější v katalogu (reduce)', () => {
    // 1750 je přesně uprostřed mezi 1500 a 2000 — appka bere první z obou.
    expect(nejblizsiJidelnicek(1750).id).toBe(DOPORUCENE_JIDELNICKY[0].id)
  })
})

describe('RUTINY (cvičební rutiny)', () => {
  it('každá rutina má aspoň jeden krok s platným cílem', () => {
    RUTINY.forEach((r) => {
      expect(r.kroky.length).toBeGreaterThan(0)
      r.kroky.forEach((k) => expect(k.cil).toBeGreaterThan(0))
    })
  })

  it('id rutin jsou navzájem unikátní', () => {
    const ids = RUTINY.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
