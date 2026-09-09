import { describe, it, expect } from 'vitest'
import { bezpecnyNazevSouboru } from '@/core/utils/download'

// ==========================================
// bezpecnyNazevSouboru existuje kvůli reálně ověřenému chování, ne
// teoretickému — Chromium spadl na generické jméno "download" bez
// přípony, jakmile `<a download>` obsahoval znak s diakritikou. Appka
// je celá česká, takže tohle by potkalo skutečné uživatele při
// exportu Writer's Roomova .txt.
// ==========================================

describe('bezpecnyNazevSouboru', () => {
  it('sejme diakritiku, ať zůstane čitelný ASCII název', () => {
    expect(bezpecnyNazevSouboru('Náhledová kniha.txt')).toBe('Nahledova kniha.txt')
    expect(bezpecnyNazevSouboru('Příliš žluťoučký kůň')).toBe('Prilis zlutoucky kun')
  })

  it('nahradí znaky nepřípustné ve jméně souboru na Windows podčítkem', () => {
    expect(bezpecnyNazevSouboru('Scénář: díl 1/2')).toBe('Scenar_ dil 1_2')
  })

  it('prázdný nebo jen z diakritiky/mezer sestávající název nahradí fallbackem', () => {
    expect(bezpecnyNazevSouboru('')).toBe('soubor')
    expect(bezpecnyNazevSouboru('   ')).toBe('soubor')
  })

  it('obyčejný ASCII název nechá beze změny', () => {
    expect(bezpecnyNazevSouboru('Kniha 1.txt')).toBe('Kniha 1.txt')
  })
})
