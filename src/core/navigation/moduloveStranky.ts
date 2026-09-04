// ==========================================
// Fáze 5 Social nav reworku (viz CLAUDE.md) — jediný zdroj pravdy pro
// pořadí čtyř stránek se sdílenou lištou (AppBottomNav, Fáze 4), mezi
// kterými appka umí swipovat/šipkovat. Social se schválně nezapočítává
// — má vlastní lištu a Domů's vlastní svislý scroll-snap feed, se
// kterým by se vodorovné gesto jen prala.
// ==========================================

export interface ModulovaStranka {
  cesta: string
  popis: string
}

export const MODULOVE_STRANKY: ModulovaStranka[] = [
  { cesta: '/hub', popis: 'Hub' },
  { cesta: '/apps', popis: 'Aplikace' },
  { cesta: '/profil', popis: 'Profil' },
  { cesta: '/nastaveni', popis: 'Nastavení' },
]

/** Sousední stránky podle aktuální cesty — null na kterémkoli konci
 *  (appka schválně nekrouží dokola, "další" po Nastavení nic není). */
export const sousedniStranky = (
  pathname: string
): { predchozi: ModulovaStranka | null; dalsi: ModulovaStranka | null } => {
  const index = MODULOVE_STRANKY.findIndex((s) => s.cesta === pathname)
  return {
    predchozi: index > 0 ? MODULOVE_STRANKY[index - 1] : null,
    dalsi: index !== -1 && index < MODULOVE_STRANKY.length - 1 ? MODULOVE_STRANKY[index + 1] : null,
  }
}
