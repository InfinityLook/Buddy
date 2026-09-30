import { PostavaDef } from '../types'

// ==========================================
// Playable postavy (bod 9 zadání). Ranger je jediná hratelná postava
// první verze — statistiky přesně podle zadání. Tank/Warrior/Mage/
// Hunter/Cyber jsou architektura na později (nová PostavaDef stačí,
// engine i scéna čtou postavu obecně, ne natvrdo "Ranger").
// ==========================================

export const RANGER: PostavaDef = {
  id: 'ranger',
  jmeno: 'Ranger',
  emoji: '🏹',
  hp: 100,
  damage: 20,
  // Appka snížila appčinu vlastní chůzi z 4.2 na 3.6 (appčino přímé
  // "spomal chůzi hráče" zadání) — appka záměrně NEšla níž: appčin
  // nejrychlejší pozemní nepřítel (wolf, data/monsters.ts, rychlost
  // 3.4) by hráče při ještě pomalejší chůzi dokázal v přímé pronásledovací
  // AI (posunKCili appka nemá žádné vyhýbání ani reakční zpoždění)
  // dohnat a nikdy pustit — appka chce hru citelně pomalejší, ne
  // rozbitou proti jednomu z prvních dostupných monster.
  rychlost: 3.6,
  kritickaSance: 0.05,
}

export const POSTAVY: PostavaDef[] = [RANGER]
export const VYCHOZI_POSTAVA = RANGER
