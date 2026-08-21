import { Lokace, Vetev } from './types'

// ==========================================
// Místa na mapě světa. Souřadnice jsou v procentech výškového/šířkového
// pásu mapy (viz MapaSveta.css) — hlavní cesta stoupá od vesnice dole
// až po hlavní město nahoře (pořadí míst bez `vedlejsi`), vedlejší
// místa (`vedlejsi: true`) visí na krátkých odbočkách definovaných
// níže ve VETVE a leží dál do stran — proto se mapa dá posouvat i
// vodorovně, ne jen nahoru/dolů.
//
// Nic z tohohle zatím nikam nevede — každé místo otevře jen list
// "brzy" (kromě arény, viz combat/nepratele.ts). Až vznikne obsah
// (dungeon k probojování, tržiště k nákupu…), mění se otevriLokaci
// v MapaSveta.tsx, ne tenhle seznam.
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

  // Vedlejší místa na odbočkách — dál do stran, objeví se až vodorovným
  // posouváním mapy.
  { id: 'mesto-zlaty-breh', typ: 'mesto', nazev: 'Zlatý Břeh', ikona: '🏛️', barva: '#35c4f0', x: 92, y: 77, vedlejsi: true },
  { id: 'dungeon-krvava-sluj', typ: 'dungeon', nazev: 'Krvavá sluj', ikona: '🕳️', barva: '#7c3aed', x: 6, y: 62, vedlejsi: true },
  { id: 'dungeon-ztracena-kobka', typ: 'dungeon', nazev: 'Ztracená kobka', ikona: '🕳️', barva: '#7c3aed', x: 6, y: 40, vedlejsi: true },
  { id: 'mesto-mlzny-vrch', typ: 'mesto', nazev: 'Mlžný Vrch', ikona: '🏛️', barva: '#35c4f0', x: 92, y: 28, vedlejsi: true },
]

/** Odbočky z hlavní cesty k vedlejším místům výše. */
export const VETVE: Vetev[] = [
  { z: 'trziste-brodu', do: 'mesto-zlaty-breh' },
  { z: 'dungeon-stinne-jeskyne', do: 'dungeon-krvava-sluj' },
  { z: 'arena-krvavy-kruh', do: 'dungeon-ztracena-kobka' },
  { z: 'vesnice-lesni-mytina', do: 'mesto-mlzny-vrch' },
]

export const POPIS_TYPU: Record<Lokace['typ'], string> = {
  mesto: 'Město',
  dungeon: 'Dungeon',
  arena: 'Aréna',
  vesnice: 'Vesnice',
  trziste: 'Tržiště',
  'hlavni-mesto': 'Hlavní město',
}
