import { describe, it, expect } from 'vitest'
import { HodinaRozvrhu, Presun, Prazdniny, ZrusenaHodina, najdiDalsiPripominku, PREDSTIH_MINUT } from '@/miniapps/rozvrh/types'

// ==========================================
// Pure jádro připomínky před hodinou — samotný setTimeout/Notification
// se netestuje (žádný browser), jen "kterou hodinu a za kolik ms" appka
// spočítá, stejná disciplína jako Souboj's combat/loop.ts.
// ==========================================

const hodina = (over: Partial<HodinaRozvrhu> = {}): HodinaRozvrhu => ({
  id: 'h1',
  den: 3, // středa
  casOd: '10:00',
  casDo: '11:00',
  predmet: 'Matematika',
  mistnost: 'A1',
  vyucujici: '',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: 0,
  deletedAt: null,
  ...over,
})

describe('najdiDalsiPripominku', () => {
  it('najde nejbližší dnešní hodinu a spočítá čas do připomínky', () => {
    const ted = new Date('2024-01-03T09:00:00') // středa 9:00
    const vysledek = najdiDalsiPripominku([hodina()], ted)
    expect(vysledek?.hodina.id).toBe('h1')
    // Hodina začíná v 10:00, předstih 10 min → připomínka v 9:50,
    // tj. za 50 minut od 9:00.
    expect(vysledek?.zaMs).toBe(50 * 60_000)
  })

  it('vybere hodinu s nejbližším začátkem, ne první v poli', () => {
    const ted = new Date('2024-01-03T09:00:00')
    const pozdejsi = hodina({ id: 'pozdejsi', casOd: '14:00', casDo: '15:00' })
    const drivejsi = hodina({ id: 'drivejsi', casOd: '11:00', casDo: '12:00' })
    const vysledek = najdiDalsiPripominku([pozdejsi, drivejsi], ted)
    expect(vysledek?.hodina.id).toBe('drivejsi')
  })

  it('žádná další hodina dnes vrátí null', () => {
    const ted = new Date('2024-01-03T12:00:00') // po konci jediné hodiny
    expect(najdiDalsiPripominku([hodina()], ted)).toBeNull()
  })

  it('o víkendu (žádné hodiny) vrátí null', () => {
    const ted = new Date('2024-01-06T09:00:00') // sobota
    expect(najdiDalsiPripominku([hodina()], ted)).toBeNull()
  })

  it('otevření appky až v posledních minutách před hodinou vrátí záporné/nulové zaMs', () => {
    const ted = new Date('2024-01-03T09:55:00') // 5 min před začátkem, předstih je 10 min
    const vysledek = najdiDalsiPripominku([hodina()], ted)
    expect(vysledek?.zaMs).toBeLessThanOrEqual(0)
  })

  it('vlastní předstih se respektuje místo výchozích 10 minut', () => {
    const ted = new Date('2024-01-03T09:00:00')
    const vysledek = najdiDalsiPripominku([hodina()], ted, 5)
    expect(vysledek?.zaMs).toBe(55 * 60_000)
  })

  it('výchozí předstih je 10 minut', () => {
    expect(PREDSTIH_MINUT).toBe(10)
  })
})

describe('najdiDalsiPripominku — prázdniny/zrušení/přesuny', () => {
  it('v prázdninový den nenajde žádnou připomínku, i když by jinak hodina seděla', () => {
    const ted = new Date('2024-01-03T09:00:00') // středa 9:00
    const prazdniny: Prazdniny[] = [
      {
        id: 'p1',
        nazev: 'Pololetní',
        datumOd: '2024-01-03',
        datumDo: '2024-01-03',
        createdAt: '',
        updatedAt: 0,
        deletedAt: null,
      },
    ]
    expect(najdiDalsiPripominku([hodina()], ted, PREDSTIH_MINUT, prazdniny)).toBeNull()
  })

  it('zrušenou dnešní hodinu nepřipomene, i když zbývá do jejího začátku dost času', () => {
    const ted = new Date('2024-01-03T09:00:00')
    const zruseneHodiny: ZrusenaHodina[] = [
      { id: 'z1', hodinaId: 'h1', datum: '2024-01-03', createdAt: '', updatedAt: 0, deletedAt: null },
    ]
    expect(najdiDalsiPripominku([hodina()], ted, PREDSTIH_MINUT, [], zruseneHodiny)).toBeNull()
  })

  it('zruší jen tuhle konkrétní hodinu — pozdější nezrušená ve stejný den se připomene normálně', () => {
    const ted = new Date('2024-01-03T09:00:00')
    const zrusena = hodina({ id: 'h1', casOd: '10:00', casDo: '11:00' })
    const dalsi = hodina({ id: 'h2', casOd: '13:00', casDo: '14:00' })
    const zruseneHodiny: ZrusenaHodina[] = [
      { id: 'z1', hodinaId: 'h1', datum: '2024-01-03', createdAt: '', updatedAt: 0, deletedAt: null },
    ]
    const vysledek = najdiDalsiPripominku([zrusena, dalsi], ted, PREDSTIH_MINUT, [], zruseneHodiny)
    expect(vysledek?.hodina.id).toBe('h2')
  })

  it('hodinu přesunutou z dneška pryč dneska nepřipomene', () => {
    const ted = new Date('2024-01-03T09:00:00')
    const presuny: Presun[] = [
      {
        id: 'pr1',
        hodinaId: 'h1',
        puvodniDatum: '2024-01-03',
        novyDatum: '2024-01-04',
        novyCasOd: '10:00',
        novyCasDo: '11:00',
        createdAt: '',
        updatedAt: 0,
        deletedAt: null,
      },
    ]
    expect(najdiDalsiPripominku([hodina()], ted, PREDSTIH_MINUT, [], [], presuny)).toBeNull()
  })

  it('hodinu přesunutou NA dnešek připomene v jejím novém čase, ne v původním', () => {
    const ted = new Date('2024-01-03T09:00:00') // středa
    // Hodina má svůj týdenní den v pondělí (den: 1), takže ve středu by
    // se jinak vůbec nekonala — jediný důvod, proč se dnes objeví, je ten
    // přesun. To appku donutí skutečně použít synteticky přidaný výskyt,
    // ne jen náhodou trefit přirozený týdenní termín se stejným dnem.
    const presuny: Presun[] = [
      {
        id: 'pr1',
        hodinaId: 'h1',
        puvodniDatum: '2024-01-08', // pondělí
        novyDatum: '2024-01-03',
        novyCasOd: '15:00',
        novyCasDo: '16:00',
        createdAt: '',
        updatedAt: 0,
        deletedAt: null,
      },
    ]
    const vysledek = najdiDalsiPripominku([hodina({ den: 1 })], ted, PREDSTIH_MINUT, [], [], presuny)
    expect(vysledek?.casOd).toBe('15:00')
    // Hodina začíná v 15:00, předstih 10 min → připomínka v 14:50,
    // tj. za 5 hodin 50 minut od 9:00.
    expect(vysledek?.zaMs).toBe((5 * 60 + 50) * 60_000)
  })
})
