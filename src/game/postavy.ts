import { Postava } from './types'

// ==========================================
// Pět postav na výběr při vstupu do hry. Karetní systém, souboje ani
// obchod ještě neexistují — bonusy jsou zatím jen popis, ne čísla, která
// by se do něčeho počítala. Až vznikne karetní/soubojový systém, bude
// se opírat o tahle data, ne vymýšlet nová.
// ==========================================

export const POSTAVY: Postava[] = [
  {
    id: 'andel',
    jmeno: 'Angel',
    popis: 'Světlo a výdrž, za cenu plného měšce',
    ikona: '👼',
    barva: '#fbbf24',
    bonusy: ['Bonus na světelné kartičky', 'Dobrá výdrž'],
    nevyhoda: 'Všechno v obchodě je o 20 % dražší',
  },
  {
    id: 'aryn',
    jmeno: 'Aryn',
    popis: 'Plamen a nejostřejší kritický zásah',
    ikona: '🔥',
    barva: '#ef4444',
    bonusy: ['Bonus na ohnivé kartičky', 'Největší kritický bonus ze všech postav'],
    nevyhoda: null,
  },
  {
    id: 'gron',
    jmeno: 'Gron',
    popis: 'Vítr a nezdolná výdrž',
    ikona: '🌪️',
    barva: '#67e8f9',
    bonusy: ['Velká výdrž', 'Bonus na vzdušné kartičky'],
    nevyhoda: null,
  },
  {
    id: 'mya',
    jmeno: 'Mya',
    popis: 'Zem a nezdolná výdrž',
    ikona: '🌿',
    barva: '#22c55e',
    bonusy: ['Bonus na zemní kartičky', 'Velká výdrž'],
    nevyhoda: null,
  },
  {
    id: 'loxen',
    jmeno: 'Loxen',
    popis: 'Voda a přesný kritický zásah',
    ikona: '🌊',
    barva: '#3b82f6',
    bonusy: ['Bonus na vodní kartičky', 'Kritický bonus'],
    nevyhoda: null,
  },
]
