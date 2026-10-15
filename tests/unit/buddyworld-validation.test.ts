import { describe, expect, it } from 'vitest'
import { validateBuddyWorldData } from '@/core/utils/buddyWorldValidation'
import { MAX_LEVEL } from '@/buddyworld/leveling'
import { VYCHOZI_MASKOT_ID } from '@/buddyworld/data/maskoti'

describe('validateBuddyWorldData', () => {
  it('propustí platná data beze změny', () => {
    const vysledek = validateBuddyWorldData({
      level: 4,
      xp: 12,
      aktivniMaskotId: 'ember',
      odemceneMaskoty: ['ember'],
    })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) {
      expect(vysledek.data.level).toBe(4)
      expect(vysledek.data.xp).toBe(12)
      expect(vysledek.data.aktivniMaskotId).toBe('ember')
      expect(vysledek.data.odemceneMaskoty).toEqual(['ember'])
    }
  })

  it('vrátí bezpečný výchozí stav pro úplně prázdná data', () => {
    const vysledek = validateBuddyWorldData({})
    expect(vysledek.success).toBe(true)
    if (vysledek.success) {
      expect(vysledek.data.level).toBe(1)
      expect(vysledek.data.xp).toBe(0)
      expect(vysledek.data.aktivniMaskotId).toBe(VYCHOZI_MASKOT_ID)
      expect(vysledek.data.odemceneMaskoty).toEqual([VYCHOZI_MASKOT_ID])
    }
  })

  it('level mimo rozsah 1..MAX_LEVEL spadne na výchozí 1', () => {
    const vysledek = validateBuddyWorldData({ level: 999 })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) expect(vysledek.data.level).toBe(1)
  })

  it('platný level na stropu MAX_LEVEL se zachová', () => {
    const vysledek = validateBuddyWorldData({ level: MAX_LEVEL })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) expect(vysledek.data.level).toBe(MAX_LEVEL)
  })

  it('záporné nebo necelé XP spadne na 0', () => {
    const vysledek = validateBuddyWorldData({ xp: -50 })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) expect(vysledek.data.xp).toBe(0)
  })

  it('neznámé aktivniMaskotId spadne na výchozího maskota', () => {
    const vysledek = validateBuddyWorldData({ aktivniMaskotId: 'tohle-neexistuje' })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) expect(vysledek.data.aktivniMaskotId).toBe(VYCHOZI_MASKOT_ID)
  })

  it('odemceneMaskoty vyfiltruje neznámá id a vždy zachová jedinečné hodnoty', () => {
    const vysledek = validateBuddyWorldData({ odemceneMaskoty: ['ember', 'ember', 'tohle-neexistuje', 'moss'] })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) {
      expect(vysledek.data.odemceneMaskoty).toContain('ember')
      expect(vysledek.data.odemceneMaskoty).toContain('moss')
      expect(vysledek.data.odemceneMaskoty.filter((id) => id === 'ember')).toHaveLength(1)
      expect(vysledek.data.odemceneMaskoty).not.toContain('tohle-neexistuje')
    }
  })

  it('odemceneMaskoty vždy obsahuje výchozího maskota, i když v uložených datech chybí', () => {
    const vysledek = validateBuddyWorldData({ odemceneMaskoty: ['moss'] })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) expect(vysledek.data.odemceneMaskoty).toContain(VYCHOZI_MASKOT_ID)
  })

  it('odmítne data úplně jiného tvaru (ne objekt)', () => {
    const vysledek = validateBuddyWorldData('toto neni objekt')
    expect(vysledek.success).toBe(false)
  })
})
