import { describe, it, expect } from 'vitest'
import { Citace, sestavCitaci } from '@/miniapps/citace/types'
import { validateCitaceData } from '@/core/utils/citaceValidation'

// ==========================================
// Sestavení citace (ISO 690/APA-blízký formát) a ověření uložených dat
// — pure funkce, žádný store.
// ==========================================

const citace = (over: Partial<Citace> = {}): Citace => ({
  id: 'c1',
  typ: 'kniha',
  autor: 'Novák, Jan',
  nazev: 'Základy fyziky',
  rok: '2020',
  vydavatelNeboWeb: 'Academia',
  url: '',
  datumCitace: '',
  createdAt: '',
  ...over,
})

describe('sestavCitaci', () => {
  it('kniha: autor, název, nakladatelství, rok', () => {
    expect(sestavCitaci(citace())).toBe('Novák, Jan. Základy fyziky. Academia, 2020.')
  })

  it('článek: autor, název, časopis, rok', () => {
    expect(
      sestavCitaci(citace({ typ: 'clanek', vydavatelNeboWeb: 'Vesmír' }))
    ).toBe('Novák, Jan. Základy fyziky. Vesmír, 2020.')
  })

  it('web: zahrne url a datum navštívení', () => {
    const text = sestavCitaci(
      citace({
        typ: 'web',
        vydavatelNeboWeb: 'Wikipedia',
        url: 'https://cs.wikipedia.org',
        datumCitace: '2024-01-01',
      })
    )
    expect(text).toContain('Dostupné z: https://cs.wikipedia.org')
    expect(text).toContain('[cit. 2024-01-01]')
  })

  it('chybějící autor/název/rok mají čitelný náhradní text, ne prázdno', () => {
    const text = sestavCitaci(citace({ autor: '', nazev: '', rok: '', vydavatelNeboWeb: '' }))
    expect(text).toContain('Neuvedený autor')
    expect(text).toContain('Bez názvu')
    expect(text).toContain('b.r.')
  })
})

describe('validateCitaceData', () => {
  it('projde platná data beze změny', () => {
    const vysledek = validateCitaceData({ citace: [citace()] })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) expect(vysledek.data.citace).toHaveLength(1)
  })

  it('citace s neplatným typem se tiše vyřadí', () => {
    const vysledek = validateCitaceData({ citace: [citace({ typ: 'neco-neexistujici' as any })] })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) expect(vysledek.data.citace).toHaveLength(0)
  })

  it('data, co vůbec neodpovídají tvaru, se odmítnou', () => {
    expect(validateCitaceData('nesmysl').success).toBe(false)
  })
})
