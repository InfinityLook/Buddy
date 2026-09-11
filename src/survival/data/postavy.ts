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
  rychlost: 4.2,
  kritickaSance: 0.05,
}

export const POSTAVY: PostavaDef[] = [RANGER]
export const VYCHOZI_POSTAVA = RANGER
