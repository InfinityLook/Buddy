import { describe, it, expect } from 'vitest'
import { dalsiStav, jePlatnyStav } from '@/flagships/writer-room/writerRoomStav'
import { najdiUryvek, obsahujeDotaz } from '@/flagships/writer-room/writerRoomSearch'
import { odhadStopazeMinut, ziskejPostavy as ziskejPostavyScenare } from '@/miniapps/screenplay-writer/types'
import type { Scenar } from '@/miniapps/screenplay-writer/types'
import { ziskejPostavy as ziskejPostavyKomiksu } from '@/miniapps/comic-writer/types'
import type { Komiks } from '@/miniapps/comic-writer/types'

// ==========================================
// Pokrývá věci, co Writer's Room dostal v tomhle (třetím) kole
// vylepšení pro "profesionální použití": stav rozpracovanosti,
// fulltextové vyhledávání/úryvky, seznam postav a odhad stopáže
// scénáře — čtyři malé sdílené/pomocné funkce, jedna tenká vrstva
// testů místo čtyř skoro identických souborů.
// ==========================================

describe('dalsiStav', () => {
  it('cykluje Nápad → Rozepsáno → Hotovo → zpátky na Nápad', () => {
    expect(dalsiStav('napad')).toBe('rozepsano')
    expect(dalsiStav('rozepsano')).toBe('hotovo')
    expect(dalsiStav('hotovo')).toBe('napad')
  })
})

describe('jePlatnyStav', () => {
  it('rozezná platné a neplatné hodnoty', () => {
    expect(jePlatnyStav('napad')).toBe(true)
    expect(jePlatnyStav('hotovo')).toBe(true)
    expect(jePlatnyStav('cokoliv')).toBe(false)
    expect(jePlatnyStav(undefined)).toBe(false)
    expect(jePlatnyStav(42)).toBe(false)
  })
})

describe('obsahujeDotaz', () => {
  it('prázdný dotaz odpovídá vždy (appka bez dotazu ukazuje všechno)', () => {
    expect(obsahujeDotaz('cokoliv', '')).toBe(true)
    expect(obsahujeDotaz('cokoliv', '   ')).toBe(true)
  })

  it('hledá bez ohledu na velikost písmen', () => {
    expect(obsahujeDotaz('Bylo nebylo', 'NEBYLO')).toBe(true)
    expect(obsahujeDotaz('Bylo nebylo', 'jinak')).toBe(false)
  })
})

describe('najdiUryvek', () => {
  it('vrátí null, když se dotaz v textu nenajde nebo je prázdný', () => {
    expect(najdiUryvek('Bylo nebylo', '')).toBeNull()
    expect(najdiUryvek('Bylo nebylo', 'jinak')).toBeNull()
  })

  it('vrátí kousek okolí nálezu, ne celý text', () => {
    const dlouhyText = 'a'.repeat(100) + 'poklad' + 'b'.repeat(100)
    const uryvek = najdiUryvek(dlouhyText, 'poklad')
    expect(uryvek).not.toBeNull()
    expect(uryvek).toContain('poklad')
    expect(uryvek!.length).toBeLessThan(dlouhyText.length)
    expect(uryvek).toMatch(/^…/)
    expect(uryvek).toMatch(/…$/)
  })

  it('nepřidá tři tečky, když je nález na samém začátku/konci textu', () => {
    const uryvek = najdiUryvek('poklad', 'poklad')
    expect(uryvek).toBe('poklad')
  })
})

const scenarSPostavami = (): Scenar => ({
  id: 's',
  nazev: 'Scénář',
  createdAt: '1',
  upravenoAt: '1',
  cilScen: null,
  postavyPoznamky: {},  sceny: [
    {
      id: 'sc1',
      typMista: 'INT',
      misto: 'kavárna',
      cas: 'den',
      createdAt: '1',
      stav: 'napad',
      poznamka: '',
      stitky: '',
      prvky: [
        { id: 'p1', typ: 'akce', text: 'Petr vejde dovnitř.' },
        { id: 'p2', typ: 'dialog', postava: 'Petr', text: 'Ahoj.', poznamka: '' },
        { id: 'p3', typ: 'dialog', postava: 'Jana', text: 'Čau.', poznamka: '' },
        { id: 'p4', typ: 'dialog', postava: 'petr', text: 'Jak se máš?', poznamka: '' },
      ],
    },
  ],
})

describe('ziskejPostavy (Scénář)', () => {
  it('vrátí jména postav použitá v dialogu, bez duplicit a abecedně', () => {
    // "Petr" a "petr" jsou dvě různé, doslovně odlišné položky — appka
    // nededuplikuje case-insensitive, jen přesnou shodu řetězce (pořadí
    // "petr" před "Petr" je normální chování localeCompare, ne bug).
    expect(ziskejPostavyScenare(scenarSPostavami())).toEqual(['Jana', 'petr', 'Petr'])
  })

  it('vynechá akční prvky a prázdná jména', () => {
    const scenar: Scenar = {
      id: 's',
      nazev: 'S',
      createdAt: '1',
      upravenoAt: '1',
      cilScen: null,
      postavyPoznamky: {},      sceny: [
        {
          id: 'sc1',
          typMista: 'INT',
          misto: 'M',
          cas: 'den',
          createdAt: '1',
          stav: 'napad',
          poznamka: '',
          stitky: '',
          prvky: [
            { id: 'p1', typ: 'akce', text: 'Něco se děje.' },
            { id: 'p2', typ: 'dialog', postava: '', text: 'Ticho.', poznamka: '' },
          ],
        },
      ],
    }
    expect(ziskejPostavyScenare(scenar)).toEqual([])
  })
})

describe('odhadStopazeMinut', () => {
  it('spočítá hrubý odhad ze slov napříč všemi scénami (~200 slov = 1 minuta)', () => {
    const scenar: Scenar = {
      id: 's',
      nazev: 'S',
      createdAt: '1',
      upravenoAt: '1',
      cilScen: null,
      postavyPoznamky: {},      sceny: [
        {
          id: 'sc1',
          typMista: 'INT',
          misto: 'M',
          cas: 'den',
          createdAt: '1',
          stav: 'napad',
          poznamka: '',
          stitky: '',
          prvky: [{ id: 'p1', typ: 'akce', text: Array(200).fill('slovo').join(' ') }],
        },
        {
          id: 'sc2',
          typMista: 'EXT',
          misto: 'M2',
          cas: 'noc',
          createdAt: '1',
          stav: 'napad',
          poznamka: '',
          stitky: '',
          prvky: [{ id: 'p2', typ: 'akce', text: Array(200).fill('slovo').join(' ') }],
        },
      ],
    }
    expect(odhadStopazeMinut(scenar)).toBe(2)
  })

  it('prázdný scénář má odhad 0 minut', () => {
    const scenar: Scenar = { id: 's', nazev: 'S', createdAt: '1', upravenoAt: '1', cilScen: null, postavyPoznamky: {}, sceny: [] }
    expect(odhadStopazeMinut(scenar)).toBe(0)
  })
})

describe('ziskejPostavy (Komiks)', () => {
  it('vrátí jména postav použitá v dialogových řádcích napříč panely, bez duplicit', () => {
    const komiks: Komiks = {
      id: 'c',
      nazev: 'C',
      createdAt: '1',
      upravenoAt: '1',
      cilStran: null,
      postavyPoznamky: {},      strany: [
        {
          id: 'str1',
          cislo: 1,
          stav: 'napad',
          poznamka: '',
          stitky: '',
          panely: [
            {
              id: 'pan1',
              vizual: 'v',
              createdAt: '1',
              zaber: null,
              radky: [
                { id: 'r1', typ: 'dialog', postava: 'Hrdina', text: 'Letím!' },
                { id: 'r2', typ: 'popisek', postava: '', text: 'O chvíli později...' },
                { id: 'r3', typ: 'dialog', postava: 'Padouch', text: 'Ne!' },
                { id: 'r4', typ: 'dialog', postava: 'Hrdina', text: 'Ano!' },
              ],
            },
          ],
        },
      ],
    }
    expect(ziskejPostavyKomiksu(komiks)).toEqual(['Hrdina', 'Padouch'])
  })
})
