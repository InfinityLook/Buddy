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
  useRozvrhStore.setState({ hodiny: [], dochazka: {} })
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
