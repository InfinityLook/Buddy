// ==========================================
// Vylepšení — výběr arény/scény pro 3D svět (useSoubojScene.ts).
// Čistě vizuální data, žádný vliv na engine ani na síť: aréna se
// vybírá na TV (TvHost.tsx's čekací obrazovka, dokud zápas ještě
// neběží), nikdy se neposílá přes network.ts — postavaId ovladače
// broadcastuje, protože engine potřebuje vědět KDO hraje, ale kulisy
// za bojovníky nejsou nic, co by engine, nebo druhý telefon, kdy
// potřeboval znát.
// ==========================================

export type ArenaId = 'louka' | 'pousty' | 'noc'

export interface Arena {
  id: ArenaId
  nazev: string
  ikona: string
  barvaOblohy: string
  barvaMlhy: string
  mlhaBlizko: number
  mlhaDaleko: number
  barvaZeme: string
  barvaPesiny: string
  /** null = aréna nemá vodu vzadu (poušť/noc). */
  barvaVody: string | null
  /** Co appka rozseje v pásu za pěšinou — stromy+kameny (les), jen
   *  kameny (poušť/noc), nebo nic (holá noční pláň zůstala prázdná
   *  schválně, ať noční aréna nepůsobí jako "louka s vypnutým
   *  světlem", ale jako vlastní, prázdnější místo). */
  dekorace: 'les' | 'kameny' | 'zadne'
  barvaKmene: string
  barvaKoruny: string
  barvaKamene: string
  /** Osmé kolo vylepšení — environmentální hazard. Jen kaňon (pousty)
   *  ho má zapnutý — kraje s propastí dávají skutečný mechanický
   *  smysl, na rozdíl od louky/noční arény, kde by "kraj" byl jen
   *  vizuální fikce s ničím pod ním. Čte engine.ts's krokSouboje přes
   *  combat/types.ts's SoubojMoznosti.hazardOkraju, appka ho sem
   *  kopíruje jen v okamžiku, kdy se zápas vytváří. */
  nebezpeciOkraje: boolean
}

export const ARENY: Record<ArenaId, Arena> = {
  louka: {
    id: 'louka',
    nazev: 'Zelená pláň',
    ikona: '🌲',
    barvaOblohy: '#16241a',
    barvaMlhy: '#16241a',
    mlhaBlizko: 16,
    mlhaDaleko: 42,
    barvaZeme: '#3a6b34',
    barvaPesiny: '#6b5a3f',
    barvaVody: '#1e6091',
    dekorace: 'les',
    barvaKmene: '#3d2a1a',
    barvaKoruny: '#2f5d34',
    barvaKamene: '#5a5248',
    nebezpeciOkraje: false,
  },
  pousty: {
    id: 'pousty',
    nazev: 'Pouštní kaňon',
    ikona: '🏜️',
    barvaOblohy: '#3a2a1a',
    barvaMlhy: '#4a3320',
    mlhaBlizko: 14,
    mlhaDaleko: 40,
    barvaZeme: '#c9a769',
    barvaPesiny: '#a8834a',
    barvaVody: null,
    dekorace: 'kameny',
    barvaKmene: '#3d2a1a',
    barvaKoruny: '#2f5d34',
    barvaKamene: '#8a6b45',
    nebezpeciOkraje: true,
  },
  noc: {
    id: 'noc',
    nazev: 'Půlnoční aréna',
    ikona: '🌙',
    barvaOblohy: '#05070f',
    barvaMlhy: '#05070f',
    mlhaBlizko: 12,
    mlhaDaleko: 34,
    barvaZeme: '#1b2233',
    barvaPesiny: '#242b3d',
    barvaVody: null,
    dekorace: 'zadne',
    barvaKmene: '#20182c',
    barvaKoruny: '#2a2140',
    barvaKamene: '#2c3348',
    nebezpeciOkraje: false,
  },
}

export const VYCHOZI_ARENA: ArenaId = 'louka'

export const SEZNAM_AREN: Arena[] = Object.values(ARENY)

/** Deváté kolo vylepšení — "překvapte mě" tlačítko vedle ruční volby
 *  arény (TvHost.tsx/LocalniZapas.tsx's čekací obrazovka). Stejný
 *  injektovatelný `nahodne` vzor jako combat/ai.ts's nahodnaPostava —
 *  čistě pro determinismus testů, výběr arény samotné totiž není nic,
 *  co by muselo zůstat synchronní mezi dvěma zařízeními (viz Arena
 *  vlastní komentář nahoře, proč se nikdy neposílá po síti). */
export const nahodnaArena = (nahodne: () => number = Math.random): ArenaId =>
  SEZNAM_AREN[Math.min(SEZNAM_AREN.length - 1, Math.floor(nahodne() * SEZNAM_AREN.length))].id
