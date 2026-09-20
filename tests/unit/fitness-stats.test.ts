import { describe, it, expect } from 'vitest'
import {
  spocitatFitnessPrehled,
  formatujRozdil,
  formatujRozdilMesic,
  spocitejOsobniRekordy,
  spocitejSeriiTreninku,
  spocitejTreninkovychDniZaTyden,
  spocitejAktivituPodleDne,
  soucetOdhadKcalZaPosledniDni,
  sestavTydenniShrnutiText,
  sestavFitnessReport,
  spocitatMesicniSrovnaniFitness,
  tydenniKlic,
} from '@/flagships/fitness-room/fitnessStats'
import { KCAL_ZA_OPAKOVANI, sestavCsvSezeni } from '@/miniapps/form-check/types'
import type { Sezeni, TypCviku } from '@/miniapps/form-check/types'

const sezeni = (opakovani: number, trvaniSekund: number, kdy: Date, cvik: TypCviku = 'dřep'): Sezeni => ({
  id: `${Math.random()}`,
  cvik,
  pocetOpakovani: opakovani,
  trvaniSekund,
  createdAt: kdy.toISOString(),
})

describe('spocitatFitnessPrehled', () => {
  it('sečte jen dnešní sezení do "dnes" a včerejší do "vcera"', () => {
    const dnes = new Date()
    const vcera = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const predtim = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)

    const vysledek = spocitatFitnessPrehled([
      sezeni(10, 60, dnes),
      sezeni(5, 30, dnes),
      sezeni(20, 120, vcera),
      sezeni(100, 999, predtim),
    ])

    expect(vysledek.dnes.opakovani).toBe(15)
    expect(vysledek.dnes.minutTreninku).toBe(2) // 90s -> 1.5 -> zaokrouhleno na 2
    expect(vysledek.vcera.opakovani).toBe(20)
    expect(vysledek.vcera.minutTreninku).toBe(2)
  })

  it('bez sezení vrátí nulové shrnutí', () => {
    const vysledek = spocitatFitnessPrehled([])
    expect(vysledek.dnes).toEqual({ minutTreninku: 0, opakovani: 0, odhadKcal: 0 })
    expect(vysledek.vcera).toEqual({ minutTreninku: 0, opakovani: 0, odhadKcal: 0 })
  })

  it('odhad kalorií je opakovani × KCAL_ZA_OPAKOVANI[cvik], zaokrouhlený', () => {
    const vysledek = spocitatFitnessPrehled([sezeni(50, 300, new Date(), 'dřep')])
    expect(vysledek.dnes.odhadKcal).toBe(Math.round(50 * KCAL_ZA_OPAKOVANI.dřep))
  })

  it('různé cviky ve stejném dni se sčítají každý svou vlastní kcal sazbou', () => {
    const dnes = new Date()
    const vysledek = spocitatFitnessPrehled([sezeni(10, 60, dnes, 'dřep'), sezeni(10, 60, dnes, 'klik')])
    const ocekavano = Math.round(10 * KCAL_ZA_OPAKOVANI.dřep + 10 * KCAL_ZA_OPAKOVANI.klik)
    expect(vysledek.dnes.odhadKcal).toBe(ocekavano)
  })
})

describe('formatujRozdil', () => {
  it('kladný rozdíl dostane znaménko plus', () => {
    expect(formatujRozdil(10, 3)).toBe('+7 vs včera')
  })

  it('záporný rozdíl si znaménko mínus nese ze samotného čísla', () => {
    expect(formatujRozdil(3, 10)).toBe('-7 vs včera')
  })

  it('stejná hodnota hlásí "stejně jako včera", ne "+0"', () => {
    expect(formatujRozdil(5, 5)).toBe('stejně jako včera')
  })
})

describe('spocitejOsobniRekordy', () => {
  it('bez sezení vrátí nulové rekordy', () => {
    expect(spocitejOsobniRekordy([])).toEqual({ nejdelsiSezeniSekund: 0, nejvicOpakovaniZaDen: 0 })
  })

  it('nejdelší sezení je maximum trvaniSekund napříč celou historií', () => {
    const rekordy = spocitejOsobniRekordy([
      sezeni(5, 60, new Date('2024-01-01')),
      sezeni(5, 900, new Date('2024-01-02')),
      sezeni(5, 300, new Date('2024-01-03')),
    ])
    expect(rekordy.nejdelsiSezeniSekund).toBe(900)
  })

  it('nejvíc opakování za den sčítá víc sezení stejného dne dohromady', () => {
    const den = new Date('2024-01-05T08:00:00')
    const stejnyDenVecer = new Date('2024-01-05T20:00:00')
    const jinyDen = new Date('2024-01-06T08:00:00')
    const rekordy = spocitejOsobniRekordy([
      sezeni(10, 60, den),
      sezeni(8, 60, stejnyDenVecer),
      sezeni(30, 60, jinyDen),
    ])
    expect(rekordy.nejvicOpakovaniZaDen).toBe(30)
  })
})

describe('spocitejSeriiTreninku', () => {
  it('bez sezení je série 0', () => {
    expect(spocitejSeriiTreninku([])).toBe(0)
  })

  it('počítá po sobě jdoucí dny až po dnešek, pokud dnes už bylo cvičeno', () => {
    const dnes = new Date('2024-06-10T12:00:00')
    const historie = [
      sezeni(5, 60, new Date('2024-06-08T09:00:00')),
      sezeni(5, 60, new Date('2024-06-09T09:00:00')),
      sezeni(5, 60, new Date('2024-06-10T09:00:00')),
    ]
    expect(spocitejSeriiTreninku(historie, dnes)).toBe(3)
  })

  it('když dnešek ještě nemá sezení, počítá od včerejška — rozdělaný den sérii nevynuluje', () => {
    const dnes = new Date('2024-06-10T07:00:00')
    const historie = [
      sezeni(5, 60, new Date('2024-06-08T09:00:00')),
      sezeni(5, 60, new Date('2024-06-09T09:00:00')),
    ]
    expect(spocitejSeriiTreninku(historie, dnes)).toBe(2)
  })

  it('mezera v historii sérii přeruší', () => {
    const dnes = new Date('2024-06-10T12:00:00')
    const historie = [sezeni(5, 60, new Date('2024-06-10T09:00:00')), sezeni(5, 60, new Date('2024-06-07T09:00:00'))]
    expect(spocitejSeriiTreninku(historie, dnes)).toBe(1)
  })
})

describe('spocitejTreninkovychDniZaTyden', () => {
  it('počítá jen dny, ne sezení — víc sezení stejný den je pořád jen jeden den', () => {
    const ted = new Date('2024-06-10T12:00:00').getTime()
    const historie = [
      sezeni(5, 60, new Date('2024-06-10T08:00:00')),
      sezeni(5, 60, new Date('2024-06-10T18:00:00')),
      sezeni(5, 60, new Date('2024-06-08T08:00:00')),
    ]
    expect(spocitejTreninkovychDniZaTyden(historie, ted)).toBe(2)
  })

  it('sezení starší než 7 dní se nepočítá', () => {
    const ted = new Date('2024-06-10T12:00:00').getTime()
    const historie = [sezeni(5, 60, new Date('2024-06-01T08:00:00'))]
    expect(spocitejTreninkovychDniZaTyden(historie, ted)).toBe(0)
  })
})

describe('spocitejAktivituPodleDne', () => {
  it('vrátí přesně požadovaný počet dní, v chronologickém pořadí', () => {
    const dny = spocitejAktivituPodleDne([], 5)
    expect(dny).toHaveLength(5)
    expect(new Date(dny[0].datum).getTime()).toBeLessThan(new Date(dny[4].datum).getTime())
  })

  it('dnešní den v poli má správný součet minut', () => {
    const dnes = new Date()
    const dny = spocitejAktivituPodleDne([sezeni(5, 120, dnes)], 3)
    expect(dny[dny.length - 1].minutTreninku).toBe(2)
  })
})

describe('tydenniKlic', () => {
  it('vrátí stejný klíč pro dva dny stejného ISO týdne', () => {
    // Pondělí a pátek stejného týdne (10.–14. června 2024).
    expect(tydenniKlic(new Date('2024-06-10T08:00:00'))).toBe(tydenniKlic(new Date('2024-06-14T20:00:00')))
  })

  it('vrátí jiný klíč pro sousední týdny', () => {
    expect(tydenniKlic(new Date('2024-06-10T12:00:00'))).not.toBe(tydenniKlic(new Date('2024-06-17T12:00:00')))
  })

  it('má tvar RRRR-Wtt', () => {
    expect(tydenniKlic(new Date('2024-06-10T12:00:00'))).toMatch(/^\d{4}-W\d{2}$/)
  })

  it('přelom roku patří správnému týdnu podle ISO 8601 (první čtvrtek)', () => {
    // 1. leden 2024 je pondělí, takže patří do týdne 1 roku 2024, ne
    // do posledního týdne roku 2023.
    expect(tydenniKlic(new Date('2024-01-01T12:00:00'))).toBe('2024-W01')
  })
})

describe('sestavCsvSezeni', () => {
  it('začíná BOM a hlavičkou s očekávanými sloupci', () => {
    const csv = sestavCsvSezeni([])
    expect(csv.startsWith('﻿')).toBe(true)
    expect(csv).toContain('Datum;Cvik;Opakování / Výdrž (s);Délka (s);Odhad kcal;Náročnost;Poznámka')
  })

  it('obsahuje jeden řádek na sezení s českým názvem cviku', () => {
    const csv = sestavCsvSezeni([sezeni(12, 90, new Date('2024-01-01T10:00:00'), 'klik')])
    const radky = csv.split('\r\n')
    expect(radky).toHaveLength(2)
    expect(radky[1]).toContain('Klik')
    expect(radky[1]).toContain('12')
  })

  it('poznámku s obsaženým středníkem obalí uvozovkami', () => {
    const s = sezeni(5, 30, new Date())
    s.poznamka = 'lehké; v pohodě'
    const csv = sestavCsvSezeni([s])
    expect(csv).toContain('"lehké; v pohodě"')
  })
})

describe('formatujRozdilMesic', () => {
  it('má vlastní "vs minulý měsíc" větu, ne formatujRozdilovo "vs včera"', () => {
    expect(formatujRozdilMesic(120, 100)).toBe('+20 vs minulý měsíc')
    expect(formatujRozdilMesic(80, 100)).toBe('-20 vs minulý měsíc')
    expect(formatujRozdilMesic(100, 100)).toBe('stejně jako minulý měsíc')
  })
})

describe('soucetOdhadKcalZaPosledniDni', () => {
  it('sečte jen sezení v posledních N dnech, ne starší', () => {
    const ted = new Date('2024-06-15T12:00:00').getTime()
    const vPosledniTyden = new Date(ted - 2 * 24 * 60 * 60 * 1000)
    const predTydnem = new Date(ted - 10 * 24 * 60 * 60 * 1000)
    const soucet = soucetOdhadKcalZaPosledniDni(
      [sezeni(10, 60, vPosledniTyden), sezeni(100, 60, predTydnem)],
      7,
      ted
    )
    expect(soucet).toBe(Math.round(10 * KCAL_ZA_OPAKOVANI.dřep))
  })
})

describe('sestavTydenniShrnutiText', () => {
  it('obsahuje počet tréninkových dní a odhad kcal', () => {
    const text = sestavTydenniShrnutiText(4, 6, 850)
    expect(text).toContain('4×')
    expect(text).toContain('série 6 dní v řadě')
    expect(text).toContain('850 kcal')
  })

  it('bez série (0 dní) větu o sérii vynechá', () => {
    const text = sestavTydenniShrnutiText(2, 0, 300)
    expect(text).not.toContain('série')
  })
})

describe('sestavFitnessReport', () => {
  it('obsahuje všechny hlavní hodnoty přehledně, jedna na řádek', () => {
    const report = sestavFitnessReport({
      dnesniKcal: 250,
      dnesniMin: 30,
      tydenniTreninkovychDni: 3,
      cilTreninkuTydne: 4,
      serieDni: 5,
      nejdelsiSezeniSekund: 125,
      nejvicOpakovaniZaDen: 42,
      posledniVahaKg: 78.5,
    })
    expect(report).toContain('250 kcal')
    expect(report).toContain('30 min')
    expect(report).toContain('3 z cíle 4')
    expect(report).toContain('5 dní v řadě')
    expect(report).toContain('2 min 5 s')
    expect(report).toContain('42')
    expect(report).toContain('78.5 kg')
  })

  it('bez zaznamenané váhy ukáže poctivou hlášku, ne "null kg"', () => {
    const report = sestavFitnessReport({
      dnesniKcal: 0,
      dnesniMin: 0,
      tydenniTreninkovychDni: 0,
      cilTreninkuTydne: null,
      serieDni: 0,
      nejdelsiSezeniSekund: 0,
      nejvicOpakovaniZaDen: 0,
      posledniVahaKg: null,
    })
    expect(report).toContain('Váha zatím nezaznamenána')
    expect(report).not.toContain('null')
  })
})

describe('spocitatMesicniSrovnaniFitness', () => {
  it('rozdělí sezení podle měsíce a sečte kcal/min/dny zvlášť pro každý', () => {
    const ted = new Date('2024-06-15T12:00:00')
    const tentoMesic = new Date('2024-06-05T10:00:00')
    const minulyMesic = new Date('2024-05-20T10:00:00')
    const davnoPredtim = new Date('2024-04-01T10:00:00')

    const srovnani = spocitatMesicniSrovnaniFitness(
      [sezeni(10, 120, tentoMesic), sezeni(20, 300, minulyMesic), sezeni(999, 999, davnoPredtim)],
      ted
    )

    expect(srovnani.tentoMesicKcal).toBe(Math.round(10 * KCAL_ZA_OPAKOVANI.dřep))
    expect(srovnani.minulyMesicKcal).toBe(Math.round(20 * KCAL_ZA_OPAKOVANI.dřep))
    expect(srovnani.tentoMesicMin).toBe(2)
    expect(srovnani.minulyMesicMin).toBe(5)
    expect(srovnani.tentoMesicDni).toBe(1)
    expect(srovnani.minulyMesicDni).toBe(1)
  })

  it('leden správně počítá minulý měsíc jako prosinec předchozího roku', () => {
    const ted = new Date('2024-01-10T12:00:00')
    const prosinec = new Date('2023-12-20T10:00:00')
    const srovnani = spocitatMesicniSrovnaniFitness([sezeni(10, 60, prosinec)], ted)
    expect(srovnani.minulyMesicKcal).toBe(Math.round(10 * KCAL_ZA_OPAKOVANI.dřep))
    expect(srovnani.tentoMesicKcal).toBe(0)
  })

  it('bez žádných sezení vrátí samé nuly, ne chybu', () => {
    const srovnani = spocitatMesicniSrovnaniFitness([], new Date('2024-06-15'))
    expect(srovnani).toEqual({
      tentoMesicKcal: 0,
      minulyMesicKcal: 0,
      tentoMesicMin: 0,
      minulyMesicMin: 0,
      tentoMesicDni: 0,
      minulyMesicDni: 0,
    })
  })
})
