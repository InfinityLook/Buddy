// ==========================================
// Stav rozpracovanosti kapitoly/scény/strany — sdílené napříč všemi
// třemi appkami Writer's Roomu (Kniha/Scénář/Komiks), na rozdíl od
// serazenoPodleUpravy/sestavText* funkcí, které si každá appka drží
// zvlášť ve svém vlastním types.ts (ty pracují s appce vlastním typem
// dokumentu). Tohle je naopak jeden a týž koncept se stejným třem
// hodnotami a stejným cyklováním bez ohledu na to, jestli jde o
// kapitolu, scénu nebo stranu — proto žije tady, ne trojmo duplikovaný.
// ==========================================

export type StavPolozky = 'napad' | 'rozepsano' | 'hotovo'

export const STAVY_POLOZEK: { id: StavPolozky; label: string; emoji: string }[] = [
  { id: 'napad', label: 'Nápad', emoji: '💡' },
  { id: 'rozepsano', label: 'Rozepsáno', emoji: '✍️' },
  { id: 'hotovo', label: 'Hotovo', emoji: '✅' },
]

export const oznaceniStavu = (stav: StavPolozky): string =>
  STAVY_POLOZEK.find((s) => s.id === stav)?.label ?? 'Nápad'

export const emojiStavu = (stav: StavPolozky): string => STAVY_POLOZEK.find((s) => s.id === stav)?.emoji ?? '💡'

// Cyklus jedním tlačítkem místo výběrového seznamu — Nápad → Rozepsáno
// → Hotovo → zpátky na Nápad, ať se dá stav přepínat na jedno klepnutí
// jak přímo v editoru dané položky, tak z Osnovy při procházení celého
// díla.
export const dalsiStav = (stav: StavPolozky): StavPolozky => {
  const index = STAVY_POLOZEK.findIndex((s) => s.id === stav)
  return STAVY_POLOZEK[(index + 1) % STAVY_POLOZEK.length].id
}

export const jePlatnyStav = (hodnota: unknown): hodnota is StavPolozky =>
  typeof hodnota === 'string' && STAVY_POLOZEK.some((s) => s.id === hodnota)
