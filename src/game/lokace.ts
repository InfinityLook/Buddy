import { Lokace } from './types'

// ==========================================
// Místa na mapě světa. Souřadnice jsou v procentech šířky/výšky obrázku
// mapy (public/backgrounds/mapa-sveta.jpg, 1536×1024 px) — odpovídají
// přímo pixelové pozici pojmenovaného města/místa na téhle konkrétní
// ilustraci, takže při výměně obrázku za jiný je potřeba je přepočítat
// znovu (žádný vzorec, jen odečtené souřadnice).
//
// Dřív měla mapa vlastní kreslenou cestu + řeku + odbočky (viz historie
// MapaSveta.tsx) — tahle ilustrace už silnice i krajinu má namalované
// v sobě, takže žádná overlay grafika navíc není potřeba. Piny leží
// přímo na obrázku, nic se nedokresluje.
//
// Nic z tohohle zatím nikam nevede — každé místo otevře jen list
// "brzy" (kromě arény a jednoho dungeonu, viz combat/nepratele.ts).
// Až vznikne obsah, mění se otevriLokaci v MapaSveta.tsx, ne tenhle
// seznam.
// ==========================================

export const LOKACE: Lokace[] = [
  { id: 'solace', typ: 'hlavni-mesto', nazev: 'Solace', ikona: '🏰', barva: '#fbbf24', x: 47.7, y: 41.8 },

  { id: 'frostheim', typ: 'mesto', nazev: 'Frostheim', ikona: '🏛️', barva: '#7dd3fc', x: 38.3, y: 24.0 },
  { id: 'voidspire', typ: 'mesto', nazev: 'Voidspire', ikona: '🏛️', barva: '#a78bfa', x: 63.0, y: 27.1 },
  { id: 'greenhaven', typ: 'mesto', nazev: 'Greenhaven', ikona: '🏛️', barva: '#22c55e', x: 31.1, y: 43.7 },
  { id: 'stonehaven', typ: 'mesto', nazev: 'Stonehaven', ikona: '🏛️', barva: '#94a3b8', x: 73.6, y: 57.1 },
  { id: 'sunfall', typ: 'mesto', nazev: 'Sunfall', ikona: '🏛️', barva: '#f59e0b', x: 51.8, y: 77.4 },

  { id: 'mysteria', typ: 'vesnice', nazev: 'Mysteria', ikona: '🏘️', barva: '#2dd4bf', x: 86.6, y: 74.2 },
  { id: 'skyreach-isles', typ: 'vesnice', nazev: 'Skyreach Isles', ikona: '🏘️', barva: '#38bdf8', x: 16.6, y: 82.5 },

  { id: 'windport', typ: 'trziste', nazev: 'Windport', ikona: '🏪', barva: '#f59e0b', x: 32.9, y: 71.6 },

  // Id zůstávají beze změny oproti starým místům se stejnou rolí —
  // NEPRATELE_PODLE_LOKACE (combat/nepratele.ts) na ně klíčuje, a
  // přejmenování id by tichem přerušilo jediný obsah, co v aréně/
  // dungeonu doopravdy je.
  { id: 'arena-krvavy-kruh', typ: 'arena', nazev: 'Aréna Solace', ikona: '⚔️', barva: '#ef4444', x: 62.7, y: 41.8 },
  { id: 'dungeon-stinne-jeskyne', typ: 'dungeon', nazev: 'Molten Core', ikona: '🕳️', barva: '#ef4444', x: 13.9, y: 65.0 },
  { id: 'draconis-peak', typ: 'dungeon', nazev: 'Draconis Peak', ikona: '🕳️', barva: '#f97316', x: 88.4, y: 34.3 },
]

export const POPIS_TYPU: Record<Lokace['typ'], string> = {
  mesto: 'Město',
  dungeon: 'Dungeon',
  arena: 'Aréna',
  vesnice: 'Vesnice',
  trziste: 'Tržiště',
  'hlavni-mesto': 'Hlavní město',
}
