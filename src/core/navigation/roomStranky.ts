import type { ModulovaStranka } from './moduloveStranky'

// ==========================================
// Šipky mezi vlajkovými Roomy (School/Fitness/Economy/Growth/Music/
// Writer's Room) — samostatná řada, oddělená od
// moduloveStranky.ts's Hub/Apps/Profil/Nastavení (uživatelovo
// rozhodnutí přes AskUserQuestion: Roomy jsou navzájem rovnocenné
// destinace bez přirozeného "začátku"/"konce", takže na rozdíl od
// sousedniStranky() appka tady ZACYKLUJE — poslední Room -> první
// a naopak.
//
// Pořadí odpovídá tomu, v jakém appka Roomy postupně stavěla (viz
// CLAUDE.md) — žádný jiný kanonický řád neexistuje, tenhle je aspoň
// odněkud odvozený, ne libovolný.
// ==========================================

export const ROOM_STRANKY: ModulovaStranka[] = [
  { cesta: '/skola', popis: 'School Room' },
  { cesta: '/fitness', popis: 'Fitness Room' },
  { cesta: '/economy', popis: 'Economy Room' },
  { cesta: '/growth', popis: 'Growth Room' },
  { cesta: '/music', popis: 'Music Room' },
  { cesta: '/spisovatel', popis: "Writer's Room" },
]

/** Sousední Room podle aktuální cesty — zacykluje na obou koncích.
 *  Vrací null/null mimo hlavní stránku Roomu (např. podstránky jako
 *  /skola/statistiky nejsou v seznamu, ale ty FlagshipShell/
 *  AppBottomNav vůbec nevykreslují, takže se to nikdy neprojeví). */
export const sousedniRoom = (
  pathname: string
): { predchozi: ModulovaStranka | null; dalsi: ModulovaStranka | null } => {
  const index = ROOM_STRANKY.findIndex((s) => s.cesta === pathname)
  if (index === -1) return { predchozi: null, dalsi: null }
  const pocet = ROOM_STRANKY.length
  return {
    predchozi: ROOM_STRANKY[(index - 1 + pocet) % pocet],
    dalsi: ROOM_STRANKY[(index + 1) % pocet],
  }
}
