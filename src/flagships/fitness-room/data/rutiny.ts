import type { TypCviku } from '@/miniapps/form-check/types'

export interface KrokRutiny {
  cvik: TypCviku
  cil: number
}

export interface Rutina {
  id: string
  nazev: string
  popis: string
  kroky: KrokRutiny[]
}

// ==========================================
// Pevná sada předpřipravených tréninků. Appka je nespouští přes druhý,
// nový mechanismus — "Spustit" jen předvyplní Form Checkův už existující
// okruhový builder (viz FormCheck.tsx's rezimOkruh/okruhKroky a
// useFormCheck.ts's nastavPredvyberOkruhu/vezmiPredvyberOkruhu), takže
// od kliknutí na rutinu k běžícímu tréninku stačí ve Form Checku jediné
// další klepnutí na "Spustit okruh" — appka nic z okruhového mechanismu
// neduplikuje.
// ==========================================
export const RUTINY: Rutina[] = [
  {
    id: 'ranni-boost',
    nazev: 'Ranní boost',
    popis: 'Dřep, klik a výpad — rychlé nastartování dne',
    kroky: [
      { cvik: 'dřep', cil: 15 },
      { cvik: 'klik', cil: 10 },
      { cvik: 'výpad', cil: 12 },
    ],
  },
  {
    id: 'core-a-sila',
    nazev: 'Core & síla',
    popis: 'Klik, prkno a dřep — zaměřeno na střed těla',
    kroky: [
      { cvik: 'klik', cil: 12 },
      { cvik: 'prkno', cil: 30 },
      { cvik: 'dřep', cil: 15 },
    ],
  },
  {
    id: 'rychly-celotelovy',
    nazev: 'Rychlý celotělový',
    popis: 'Všechny čtyři cviky za sebou, kratší dávky',
    kroky: [
      { cvik: 'dřep', cil: 10 },
      { cvik: 'klik', cil: 10 },
      { cvik: 'výpad', cil: 10 },
      { cvik: 'prkno', cil: 20 },
    ],
  },
  {
    id: 'nozni-den',
    nazev: 'Nožní den',
    popis: 'Dřep a výpad ve dvou delších sériích',
    kroky: [
      { cvik: 'dřep', cil: 20 },
      { cvik: 'výpad', cil: 15 },
      { cvik: 'dřep', cil: 15 },
      { cvik: 'výpad', cil: 15 },
    ],
  },
]
