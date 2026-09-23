import { describe, it, expect } from 'vitest'
import { Citace, sestavBibliografii, sestavCitaci } from '@/miniapps/citace/types'
import { validateCitaceData } from '@/core/utils/citaceValidation'
import { useCitaceStore } from '@/miniapps/citace/useCitace'

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

describe('sestavCitaci — styl MLA', () => {
  it('kniha: název zůstává bez uvozovek, stejně jako u ISO 690', () => {
    const text = sestavCitaci(citace(), 'mla')
    expect(text).toBe('Novák, Jan. Základy fyziky. Academia, 2020.')
    expect(text).not.toContain('„')
  })

  it('článek: název v uvozovkách — MLA rozlišuje část celku od samostatného díla', () => {
    const text = sestavCitaci(citace({ typ: 'clanek', vydavatelNeboWeb: 'Vesmír' }), 'mla')
    expect(text).toContain('„Základy fyziky“')
    expect(text).toContain('Vesmír, 2020.')
  })

  it('web: přístup jde na konec jako věta, ne do hranaté závorky uprostřed', () => {
    const text = sestavCitaci(
      citace({
        typ: 'web',
        vydavatelNeboWeb: 'Wikipedia',
        url: 'https://cs.wikipedia.org',
        datumCitace: '2024-01-01',
      }),
      'mla'
    )
    expect(text).toContain('„Základy fyziky“')
    expect(text).toContain('https://cs.wikipedia.org')
    expect(text).toContain('Přístup 2024-01-01.')
    expect(text).not.toContain('[cit.')
    expect(text).not.toContain('Dostupné z:')
  })

  it('chybějící pole mají stejný čitelný náhradní text jako ISO 690', () => {
    const text = sestavCitaci(citace({ autor: '', nazev: '', rok: '', vydavatelNeboWeb: '' }), 'mla')
    expect(text).toContain('Neuvedený autor')
    expect(text).toContain('b.r.')
  })

  it('bez druhého argumentu appka pořád vykreslí ISO 690, ne MLA', () => {
    expect(sestavCitaci(citace({ typ: 'clanek' }))).not.toContain('„')
  })
})

describe('sestavBibliografii', () => {
  it('seřadí citace abecedně podle autora, ne podle pořadí přidání', () => {
    const text = sestavBibliografii([
      citace({ id: 'a', autor: 'Zima, Petr', nazev: 'Poslední kniha' }),
      citace({ id: 'b', autor: 'Adam, Eva', nazev: 'První kniha' }),
    ])
    expect(text.indexOf('Adam, Eva')).toBeLessThan(text.indexOf('Zima, Petr'))
  })

  it('citaci bez autora seřadí podle názvu', () => {
    const text = sestavBibliografii([
      citace({ id: 'a', autor: '', nazev: 'Zeta' }),
      citace({ id: 'b', autor: '', nazev: 'Alfa' }),
    ])
    expect(text.indexOf('Alfa')).toBeLessThan(text.indexOf('Zeta'))
  })

  it('odděluje jednotlivé citace prázdným řádkem', () => {
    const text = sestavBibliografii([citace({ id: 'a' }), citace({ id: 'b', nazev: 'Druhá kniha' })])
    expect(text).toContain('\n\n')
  })

  it('prázdný seznam vrátí prázdný řetězec', () => {
    expect(sestavBibliografii([])).toBe('')
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

  describe('aktivniStyl', () => {
    it('platný styl projde beze změny', () => {
      const vysledek = validateCitaceData({ citace: [], aktivniStyl: 'mla' })
      expect(vysledek.success).toBe(true)
      if (vysledek.success) expect(vysledek.data.aktivniStyl).toBe('mla')
    })

    it('chybějící styl se doplní jako "iso690" — starší uložený stav druhý styl neznal', () => {
      const vysledek = validateCitaceData({ citace: [] })
      expect(vysledek.success).toBe(true)
      if (vysledek.success) expect(vysledek.data.aktivniStyl).toBe('iso690')
    })

    it('neplatný styl strhne celá data, ne že by se tiše nahradil defaultem', () => {
      expect(validateCitaceData({ citace: [], aktivniStyl: 'chicago' }).success).toBe(false)
    })
  })
})

describe('useCitaceStore.nastavStyl', () => {
  it('přepne aktivní styl a zůstane persistentní hodnota ve storu', () => {
    useCitaceStore.setState({ aktivniStyl: 'iso690' })
    useCitaceStore.getState().nastavStyl('mla')
    expect(useCitaceStore.getState().aktivniStyl).toBe('mla')
  })
})
