import { describe, it, expect } from 'vitest'
import { najdiNaduzivanaSlova } from '@/flagships/writer-room/writerRoomStyl'
import { validateWriterRoomCilData } from '@/core/utils/writerRoomCilValidation'
import { spocitejReplikyPodlePostavy } from '@/miniapps/screenplay-writer/types'
import type { Scenar } from '@/miniapps/screenplay-writer/types'
import { oznaceniZaberu, TYPY_ZABERU } from '@/miniapps/comic-writer/types'

// ==========================================
// Pokrývá věci, co Writer's Room dostal v pátém kole vylepšení pro
// "profesionální použití": kontrolu nadužívaných slov, ověření dat
// psacího cíle, statistiku "kolik kdo mluví" ve Scénáři a typ záběru u
// komiksového panelu — stejná tenká vrstva testů jako u předchozích
// kol (writer-room-professional.test.ts/writer-room-professional2.test.ts).
// DuplikovatKniha/duplikovatScenar/duplikovatKomiks a EPUB export jsou
// ověřené přes docela odlišnou testovou strukturu (store getState()/
// setState() pro duplikaci, resp. přes Blob/JSZip pro EPUB) — viz
// samostatný soubor writer-checkpoints.test.ts's precedent pro store
// testy a temporary Playwright spec pro skutečné UI/stažení chování.
// ==========================================

describe('najdiNaduzivanaSlova', () => {
  it('najde slovo opakující se aspoň min-krát a vrátí ho s počtem výskytů', () => {
    const useky = [Array(6).fill('dobrodružství').join(' text ')]
    const vysledek = najdiNaduzivanaSlova(useky)
    expect(vysledek.find((n) => n.slovo === 'dobrodružství')?.pocet).toBe(6)
  })

  it('vynechá krátká slova a pevnou sadu spojek/předložek/zájmen bez ohledu na počet výskytů', () => {
    const useky = [Array(10).fill('a se na to').join(' ')]
    expect(najdiNaduzivanaSlova(useky)).toEqual([])
  })

  it('slovo pod prahem min se nevrátí vůbec', () => {
    const useky = ['hrdina hrdina hrdina']
    expect(najdiNaduzivanaSlova(useky, 5)).toEqual([])
  })

  it('je case-insensitive — "Drak" a "drak" se sečtou jako jedno slovo', () => {
    const useky = [Array(5).fill('Drak').join(' ')]
    const vysledek = najdiNaduzivanaSlova(useky, 4)
    expect(vysledek).toEqual([{ slovo: 'drak', pocet: 5 }])
  })

  it('řadí od nejčastějšího a omezí na `top` položek', () => {
    const useky = [`${Array(9).fill('castejsi').join(' ')} ${Array(6).fill('mensi').join(' ')} ${Array(20).fill('zridka').join(' ')}`]
    const vysledek = najdiNaduzivanaSlova(useky, 5, 2)
    expect(vysledek).toHaveLength(2)
    expect(vysledek[0].slovo).toBe('zridka')
    expect(vysledek[1].slovo).toBe('castejsi')
  })

  it('prázdný text vrátí prázdný seznam, ne pád', () => {
    expect(najdiNaduzivanaSlova([''])).toEqual([])
    expect(najdiNaduzivanaSlova([])).toEqual([])
  })
})

describe('validateWriterRoomCilData', () => {
  it('projde platná kladná čísla beze změny', () => {
    const vysledek = validateWriterRoomCilData({ cilDenne: 2, cilTydenne: 10 })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) expect(vysledek.data).toEqual({ cilDenne: 2, cilTydenne: 10 })
  })

  it('null zůstává null (žádný cíl nastaven)', () => {
    const vysledek = validateWriterRoomCilData({ cilDenne: null, cilTydenne: null })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) expect(vysledek.data).toEqual({ cilDenne: null, cilTydenne: null })
  })

  it('záporné nebo neplatné číslo spadne na null, ne na shozený celý stav', () => {
    const vysledek = validateWriterRoomCilData({ cilDenne: -5, cilTydenne: 'deset' })
    expect(vysledek.success).toBe(true)
    if (vysledek.success) expect(vysledek.data).toEqual({ cilDenne: null, cilTydenne: null })
  })

  it('chybějící pole spadnou na null', () => {
    const vysledek = validateWriterRoomCilData({})
    expect(vysledek.success).toBe(true)
    if (vysledek.success) expect(vysledek.data).toEqual({ cilDenne: null, cilTydenne: null })
  })
})

describe('spocitejReplikyPodlePostavy', () => {
  const scenarSPostavami = (): Scenar => ({
    id: 's',
    nazev: 'Scénář',
    createdAt: '1',
    upravenoAt: '1',
    cilScen: null,
    postavyPoznamky: {},
    sceny: [
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
          { id: 'p2', typ: 'dialog', postava: 'Petr', text: 'Ahoj, jak se máš?', poznamka: '' },
          { id: 'p3', typ: 'dialog', postava: 'Jana', text: 'Čau.', poznamka: '' },
          { id: 'p4', typ: 'dialog', postava: 'Petr', text: 'Dobře.', poznamka: '' },
        ],
      },
    ],
  })

  it('spočítá počet replik a slov na postavu, seřazené od nejvytíženější', () => {
    const vysledek = spocitejReplikyPodlePostavy(scenarSPostavami())
    expect(vysledek).toEqual([
      { postava: 'Petr', radku: 2, slov: 5 },
      { postava: 'Jana', radku: 1, slov: 1 },
    ])
  })

  it('akční prvky se do počtu vůbec nepočítají', () => {
    const scenar: Scenar = {
      id: 's',
      nazev: 'S',
      createdAt: '1',
      upravenoAt: '1',
      cilScen: null,
      postavyPoznamky: {},
      sceny: [
        {
          id: 'sc1',
          typMista: 'INT',
          misto: 'M',
          cas: 'den',
          createdAt: '1',
          stav: 'napad',
          poznamka: '',
          stitky: '',
          prvky: [{ id: 'p1', typ: 'akce', text: 'Něco se děje dlouho a hodně slov.' }],
        },
      ],
    }
    expect(spocitejReplikyPodlePostavy(scenar)).toEqual([])
  })

  it('prázdný scénář vrátí prázdný seznam', () => {
    const scenar: Scenar = { id: 's', nazev: 'S', createdAt: '1', upravenoAt: '1', cilScen: null, postavyPoznamky: {}, sceny: [] }
    expect(spocitejReplikyPodlePostavy(scenar)).toEqual([])
  })
})

describe('oznaceniZaberu / TYPY_ZABERU (Komiks)', () => {
  it('má čtyři pevné typy záběru', () => {
    expect(TYPY_ZABERU).toHaveLength(4)
    expect(TYPY_ZABERU.map((z) => z.id)).toEqual(['detail', 'polocelek', 'celek', 'celkovy'])
  })

  it('vrátí lidsky čitelné označení pro platný typ', () => {
    expect(oznaceniZaberu('detail')).toBe('Detail')
    expect(oznaceniZaberu('celkovy')).toBe('Celkový záběr')
  })

  it('null (zatím nezadáno) vrátí null, ne prázdný řetězec', () => {
    expect(oznaceniZaberu(null)).toBeNull()
  })
})
