import { describe, it, expect } from 'vitest'
import { HodinaRozvrhu, najdiDalsiPripominku, PREDSTIH_MINUT } from '@/miniapps/rozvrh/types'

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
