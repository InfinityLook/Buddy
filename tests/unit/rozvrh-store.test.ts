import { describe, it, expect, beforeEach } from 'vitest'
import { useRozvrhStore } from '@/miniapps/rozvrh/useRozvrh'

// ==========================================
// useRozvrhStore je exportovaný přímo (viz jeho vlastní komentář v
// useRozvrh.ts), takže se dá testovat rovnou přes .getState()/
// .setState() — stejný vzor jako gamification.test.ts/app-store.test.ts.
// Store je sdílený singleton, proto se hodiny/dochazka před každým
// testem vrací na prázdný stav.
// ==========================================

const resetStore = () => {
  useRozvrhStore.setState({
    hodiny: [],
    dochazkaZaznamy: [],
    prazdniny: [],
    zruseneHodiny: [],
    presuny: [],
    semestry: [],
  })
}

beforeEach(resetStore)

describe('updateHodinu', () => {
  it('ořízne předmět/místnost/vyučujícího stejně jako pridatHodinu — dřív jen slepě sloučilo patch', () => {
    useRozvrhStore.getState().pridatHodinu(1, '08:00', '09:40', 'Matematika', 'A1', 'Dr. Novák')
    const hodina = useRozvrhStore.getState().hodiny[0]

    useRozvrhStore.getState().updateHodinu(hodina.id, {
      predmet: '  Fyzika  ',
      mistnost: '  B2  ',
      vyucujici: '  Dr. Svoboda  ',
    })

    const upravena = useRozvrhStore.getState().hodiny[0]
    expect(upravena.predmet).toBe('Fyzika')
    expect(upravena.mistnost).toBe('B2')
    expect(upravena.vyucujici).toBe('Dr. Svoboda')
  })

  it('patch bez predmet/mistnost/vyucujici nezasáhne pole, co appka vůbec neposlala', () => {
    useRozvrhStore.getState().pridatHodinu(1, '08:00', '09:40', 'Matematika', 'A1', 'Dr. Novák')
    const hodina = useRozvrhStore.getState().hodiny[0]

    useRozvrhStore.getState().updateHodinu(hodina.id, { casOd: '09:00' })

    const upravena = useRozvrhStore.getState().hodiny[0]
    expect(upravena.casOd).toBe('09:00')
    expect(upravena.predmet).toBe('Matematika')
  })
})

describe('pridatHodinu — sudý/lichý cyklus', () => {
  it('bez zadaného cyklu uloží "kazdy" (výchozí)', () => {
    useRozvrhStore.getState().pridatHodinu(1, '08:00', '09:40', 'Matematika', 'A1', 'Dr. Novák')
    expect(useRozvrhStore.getState().hodiny[0].tyden).toBe('kazdy')
  })

  it('se zadaným cyklem uloží přesně ten', () => {
    useRozvrhStore.getState().pridatHodinu(1, '08:00', '09:40', 'Matematika', 'A1', 'Dr. Novák', 'sudy')
    expect(useRozvrhStore.getState().hodiny[0].tyden).toBe('sudy')
  })
})

describe('prázdniny', () => {
  it('pridatPrazdniny přidá novou položku', () => {
    useRozvrhStore.getState().pridatPrazdniny('Podzimní prázdniny', '2024-10-28', '2024-10-29')
    const p = useRozvrhStore.getState().prazdniny[0]
    expect(p.nazev).toBe('Podzimní prázdniny')
    expect(p.datumOd).toBe('2024-10-28')
    expect(p.datumDo).toBe('2024-10-29')
    expect(p.deletedAt).toBeNull()
  })

  it('bez názvu nebo s datumOd > datumDo je no-op', () => {
    useRozvrhStore.getState().pridatPrazdniny('  ', '2024-10-28', '2024-10-29')
    useRozvrhStore.getState().pridatPrazdniny('Jarní', '2024-10-29', '2024-10-28')
    expect(useRozvrhStore.getState().prazdniny).toHaveLength(0)
  })

  it('smazatPrazdniny měkce smaže (deletedAt se nastaví, položka zůstává v poli)', () => {
    useRozvrhStore.getState().pridatPrazdniny('Letní', '2024-07-01', '2024-08-31')
    const id = useRozvrhStore.getState().prazdniny[0].id
    useRozvrhStore.getState().smazatPrazdniny(id)
    const p = useRozvrhStore.getState().prazdniny.find((p) => p.id === id)
    expect(p?.deletedAt).not.toBeNull()
  })
})

describe('zrušení/obnovení konkrétního výskytu', () => {
  it('zrusitVyskyt vytvoří ZrusenaHodina záznam', () => {
    useRozvrhStore.getState().zrusitVyskyt('h1', '2024-01-08')
    const z = useRozvrhStore.getState().zruseneHodiny[0]
    expect(z.hodinaId).toBe('h1')
    expect(z.datum).toBe('2024-01-08')
    expect(z.deletedAt).toBeNull()
  })

  it('opakované zrušení téhož výskytu nevytvoří duplicitní záznam', () => {
    useRozvrhStore.getState().zrusitVyskyt('h1', '2024-01-08')
    useRozvrhStore.getState().zrusitVyskyt('h1', '2024-01-08')
    expect(useRozvrhStore.getState().zruseneHodiny).toHaveLength(1)
  })

  it('zrušením dne se zpětně odznačí už zapsaná docházka pro TENHLE výskyt (zrušená hodina se nepočítá jako zameškaná)', () => {
    useRozvrhStore.getState().oznacitDochazku('h1', '2024-01-08', false)
    useRozvrhStore.getState().zrusitVyskyt('h1', '2024-01-08')
    const zaznam = useRozvrhStore.getState().dochazkaZaznamy.find((z) => z.hodinaId === 'h1' && z.datum === '2024-01-08')
    expect(zaznam?.deletedAt).not.toBeNull()
  })

  it('zrušení jiného data stejné hodiny nezasáhne docházku jindy zapsanou', () => {
    useRozvrhStore.getState().oznacitDochazku('h1', '2024-01-01', true)
    useRozvrhStore.getState().zrusitVyskyt('h1', '2024-01-08')
    const zaznam = useRozvrhStore.getState().dochazkaZaznamy.find((z) => z.hodinaId === 'h1' && z.datum === '2024-01-01')
    expect(zaznam?.deletedAt).toBeNull()
  })

  it('obnovitVyskyt vrátí zrušený výskyt zpět (měkce smaže ZrusenaHodina)', () => {
    useRozvrhStore.getState().zrusitVyskyt('h1', '2024-01-08')
    useRozvrhStore.getState().obnovitVyskyt('h1', '2024-01-08')
    const z = useRozvrhStore.getState().zruseneHodiny.find((z) => z.hodinaId === 'h1' && z.datum === '2024-01-08')
    expect(z?.deletedAt).not.toBeNull()
  })
})

describe('přesun konkrétního výskytu', () => {
  it('presunoutVyskyt vytvoří Presun záznam', () => {
    useRozvrhStore.getState().presunoutVyskyt('h1', '2024-01-08', '2024-01-10', '14:00', '15:00')
    const p = useRozvrhStore.getState().presuny[0]
    expect(p).toMatchObject({
      hodinaId: 'h1',
      puvodniDatum: '2024-01-08',
      novyDatum: '2024-01-10',
      novyCasOd: '14:00',
      novyCasDo: '15:00',
    })
  })

  it('bez novyDatum/novyCasOd/novyCasDo je no-op', () => {
    useRozvrhStore.getState().presunoutVyskyt('h1', '2024-01-08', '', '14:00', '15:00')
    expect(useRozvrhStore.getState().presuny).toHaveLength(0)
  })

  it('zrusitPresun měkce smaže přesun', () => {
    useRozvrhStore.getState().presunoutVyskyt('h1', '2024-01-08', '2024-01-10', '14:00', '15:00')
    const id = useRozvrhStore.getState().presuny[0].id
    useRozvrhStore.getState().zrusitPresun(id)
    expect(useRozvrhStore.getState().presuny.find((p) => p.id === id)?.deletedAt).not.toBeNull()
  })
})

describe('archivovatSemestr', () => {
  it('vytvoří zmrzlý snímek viditelných hodin s NOVÝMI id', () => {
    useRozvrhStore.getState().pridatHodinu(1, '08:00', '09:40', 'Matematika', 'A1', 'Dr. Novák')
    const puvodniId = useRozvrhStore.getState().hodiny[0].id

    useRozvrhStore.getState().archivovatSemestr('Zimní semestr 2024', '2024-09-01', '2024-12-31', false)

    const semestr = useRozvrhStore.getState().semestry[0]
    expect(semestr.nazev).toBe('Zimní semestr 2024')
    expect(semestr.hodiny).toHaveLength(1)
    expect(semestr.hodiny[0].predmet).toBe('Matematika')
    expect(semestr.hodiny[0].id).not.toBe(puvodniId)
    // Živý rozvrh zůstává nedotčený, protože vycistitRozvrh je false.
    expect(useRozvrhStore.getState().hodiny).toHaveLength(1)
    expect(useRozvrhStore.getState().hodiny[0].deletedAt).toBeNull()
  })

  it('s vycistitRozvrh=true zároveň měkce smaže živé hodiny', () => {
    useRozvrhStore.getState().pridatHodinu(1, '08:00', '09:40', 'Matematika', 'A1', 'Dr. Novák')

    useRozvrhStore.getState().archivovatSemestr('Zimní semestr 2024', '2024-09-01', '2024-12-31', true)

    expect(useRozvrhStore.getState().semestry[0].hodiny).toHaveLength(1)
    expect(useRozvrhStore.getState().hodiny[0].deletedAt).not.toBeNull()
  })

  it('pozdější úprava/smazání živé hodiny nezasáhne archivovaný snímek', () => {
    useRozvrhStore.getState().pridatHodinu(1, '08:00', '09:40', 'Matematika', 'A1', 'Dr. Novák')
    useRozvrhStore.getState().archivovatSemestr('Zimní semestr 2024', '2024-09-01', '2024-12-31', false)
    const ziveId = useRozvrhStore.getState().hodiny[0].id

    useRozvrhStore.getState().updateHodinu(ziveId, { predmet: 'Fyzika' })

    expect(useRozvrhStore.getState().semestry[0].hodiny[0].predmet).toBe('Matematika')
  })

  it('bez názvu nebo dat je no-op', () => {
    useRozvrhStore.getState().archivovatSemestr('', '2024-09-01', '2024-12-31', false)
    expect(useRozvrhStore.getState().semestry).toHaveLength(0)
  })

  it('smazatSemestr měkce smaže archivovaný semestr', () => {
    useRozvrhStore.getState().archivovatSemestr('Zimní semestr', '2024-09-01', '2024-12-31', false)
    const id = useRozvrhStore.getState().semestry[0].id
    useRozvrhStore.getState().smazatSemestr(id)
    expect(useRozvrhStore.getState().semestry.find((s) => s.id === id)?.deletedAt).not.toBeNull()
  })
})
