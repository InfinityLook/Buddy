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

/** Vylepšení — TV rozešle jednou při přechodu kola do stavu 'konec'
 *  (viz TvHost.tsx), ať si každý telefon může sám připsat XP/kredity
 *  za VLASTNÍ výsledek. Gamifikace je čistě per-zařízení stav
 *  (secureStorage v prohlížeči), TV k ní nemá a nepotřebuje mít
 *  žádný přístup — proto se posílá jen výsledek (kdo vyhrál), ne
 *  žádost "připiš XP", každý telefon si to vyhodnotí sám podle
 *  vlastního slotu. */
export interface KonecZapasuPayload {
  /** 1/2 = vítězný slot, null = remíza. */
  vitezSlot: 1 | 2 | null
}

/** Osmé kolo vylepšení — rychlý emote/škádlení z ovladače na TV. Jde
 *  jen JEDNÍM směrem (telefon → TV), stejně jako `vstup` — appka
 *  nepotřebuje emote posílat zpátky druhému telefonu, TV je jediná
 *  obrazovka, co ho má zobrazit (viz Bojiste.tsx). Čistě kosmetické,
 *  žádný vliv na engine/skóre. */
export interface EmotePayload {
  hracId: string
  emote: string
}

/** Pevná sada emotů, ne libovolný vstup — stejné "pevná sada, ne
 *  libovolný text" omezení, jaké appka už používá pro reakce na
 *  zprávy (social/types.ts's EMOJI_REAKCI) a ikony skupin. */
export const RYCHLE_EMOTE: string[] = ['👍', '😂', '😤']
