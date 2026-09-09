// ==========================================
// Zobrazovací formátování sdílené napříč Writer's Roomovými třemi
// appkami — schválně oddělené od writerRoomStats.ts (ten agreguje
// čísla přes všechny knihy/scénáře/komiksy najednou pro dashboard,
// tohle jen otextuje jeden konkrétní časový údaj v seznamu appky
// samotné) — dva různé druhy práce s daty, ne jeden soubor pro obojí.
//
// Denní zrnitost, ne minutová jako ChatyPanel.tsx's casKratce — úpravy
// knihy/scénáře/komiksu jsou typicky rozestrčené po hodinách/dnech, ne
// po minutách, takže "před 5 min" by tu bylo skoro nikdy vidět a
// "dnes"/"včera"/"před N dny" je čitelnější zrnitost pro tenhle případ.
// ==========================================

export const formatujNaposledyUpraveno = (iso: string, ted: Date = new Date()): string => {
  const kdy = new Date(iso)
  const kdyDen = new Date(kdy.getFullYear(), kdy.getMonth(), kdy.getDate())
  const tedDen = new Date(ted.getFullYear(), ted.getMonth(), ted.getDate())
  const rozdilDni = Math.round((tedDen.getTime() - kdyDen.getTime()) / 86_400_000)

  if (rozdilDni <= 0) return 'Upraveno dnes'
  if (rozdilDni === 1) return 'Upraveno včera'
  // "před 2 dny" i "před 5 dny" mají v češtině stejný tvar (instrumentál
  // množného čísla) — jen "před 1 dnem" má vlastní, ale ten už pokrývá
  // větev výš, takže tady stačí prosté dvoucestné rozlišení.
  if (rozdilDni <= 6) return `Upraveno před ${rozdilDni} dny`

  const stejnyRok = kdy.getFullYear() === ted.getFullYear()
  return `Upraveno ${kdy.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: stejnyRok ? undefined : 'numeric' })}`
}
