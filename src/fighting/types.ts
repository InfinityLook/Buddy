// ==========================================
// Souboj — pracovní název pro druhou hru v rozcestníku her (viz
// pages/games/GamesHubModule.tsx). Sdílené typy pro síťové párování
// telefon-ovladač <-> TV (network.ts) a obě strany spojení
// (components/TvHost.tsx, components/Ovladac.tsx).
// ==========================================

import type { PostavaId } from './combat/postavy'

export type Smer = 'nahoru' | 'dolu' | 'vlevo' | 'vpravo'

export type Tlacitko = 'udar' | 'kop' | 'blok' | 'specialni'

/** Ovladač se hlásí do místnosti — pošle se hned po SUBSCRIBED. Postava
 *  se vybírá LOKÁLNĚ na ovladači ještě před tímhle voláním (viz
 *  VyberPostavy.tsx), takže tu jede rovnou s prvním připojením —
 *  žádný druhý krok navíc. */
export interface PripojitPayload {
  hracId: string
  jmeno: string
  postavaId: PostavaId
}

/** TV odpoví ovladači, na který slot (1/2) ho zařadila. */
export interface PripojenoPayload {
  hracId: string
  slot: 1 | 2
}

/** Jeden vstup z ovladače — směr (d-pad) nebo akční tlačítko. */
export type VstupPayload =
  | { hracId: string; typ: 'smer'; smer: Smer | null }
  | { hracId: string; typ: 'tlacitko'; tlacitko: Tlacitko; stisknuto: boolean }
