import { Lokace } from './types'

// ==========================================
// Místa na mapě světa. Souřadnice jsou v procentech výškového pásu
// mapy (viz MapaSveta.css) — od vesnice dole až po hlavní město nahoře,
// jako stoupání po cestě, ne volně rozmístěná mřížka.
//
// Nic z tohohle zatím nikam nevede — každé místo otevře jen list
// "brzy". Až vznikne obsah (dungeon k probojování, tržiště k nákupu…),
// mění se otevriLokaci v MapaSveta.tsx, ne tenhle seznam.
// ==========================================

export const LOKACE: Lokace[] = [
  { id: 'vesnice-travov', typ: 'vesnice', nazev: 'Vesnice Trávov', ikona: '🏘️', barva: '#22c55e', x: 30, y: 92 },
  { id: 'trziste-brodu', typ: 'trziste', nazev: 'Tržiště Brodů', ikona: '🏪', barva: '#f59e0b', x: 68, y: 80 },
  { id: 'dungeon-stinne-jeskyne', typ: 'dungeon', nazev: 'Stínné jeskyně', ikona: '🕳️', barva: '#7c3aed', x: 25, y: 68 },
  { id: 'mesto-kamenny-pristav', typ: 'mesto', nazev: 'Kamenný Přístav', ikona: '🏛️', barva: '#35c4f0', x: 70, y: 56 },
  { id: 'arena-krvavy-kruh', typ: 'arena', nazev: 'Krvavý kruh', ikona: '⚔️', barva: '#ef4444', x: 30, y: 44 },
  { id: 'vesnice-lesni-mytina', typ: 'vesnice', nazev: 'Lesní Mýtina', ikona: '🏘️', barva: '#22c55e', x: 68, y: 32 },
  { id: 'dungeon-zapomenuta-hrobka', typ: 'dungeon', nazev: 'Zapomenutá hrobka', ikona: '🕳️', barva: '#7c3aed', x: 28, y: 20 },
  { id: 'mesto-stribrne-udoli', typ: 'mesto', nazev: 'Stříbrné Údolí', ikona: '🏛️', barva: '#35c4f0', x: 62, y: 10 },
  { id: 'buddyheim', typ: 'hlavni-mesto', nazev: 'Buddyheim', ikona: '🏰', barva: '#fbbf24', x: 45, y: 4 },
]

export const POPIS_TYPU: Record<Lokace['typ'], string> = {
  mesto: 'Město',
  dungeon: 'Dungeon',
  arena: 'Aréna',
  vesnice: 'Vesnice',
  trziste: 'Tržiště',
  'hlavni-mesto': 'Hlavní město',
}
