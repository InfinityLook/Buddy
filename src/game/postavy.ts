import { Postava } from './types'

// ==========================================
// Pět postav na výběr při vstupu do hry. Bojové vlastnosti (bojZivel,
// bojNasobicPoskozeni, bojKriticka, bojKritickyNasobic, bojVydrz) teď
// skutečně krmí souboj v combat/useSouboj.ts — přesně podle zadání:
// Angel bonus na světlo a dobrá výdrž (za cenu dražšího obchodu), Aryn
// bonus na oheň a největší kritický bonus ze všech, Gron a Mya mají
// obě nejvyšší výdrž (vzduch, resp. země), Loxen bonus na vodu a
// solidní kritiku. obchodNasobicCeny čeká na budoucí herní obchod —
// číslo je hotové, jen ho zatím nemá co použít.
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
    bojZivel: 'svetlo',
    bojNasobicPoskozeni: 1.3,
    bojKriticka: 0.1,
    bojKritickyNasobic: 1.5,
    bojVydrz: 130,
    obchodNasobicCeny: 1.2,
  },
  {
    id: 'aryn',
    jmeno: 'Aryn',
    popis: 'Plamen a nejostřejší kritický zásah',
    ikona: '🔥',
    barva: '#ef4444',
    bonusy: ['Bonus na ohnivé kartičky', 'Největší kritický bonus ze všech postav'],
    nevyhoda: null,
    bojZivel: 'ohen',
    bojNasobicPoskozeni: 1.3,
    bojKriticka: 0.3,
    bojKritickyNasobic: 2,
    bojVydrz: 100,
    obchodNasobicCeny: 1,
  },
  {
    id: 'gron',
    jmeno: 'Gron',
    popis: 'Vítr a nezdolná výdrž',
    ikona: '🌪️',
    barva: '#67e8f9',
    bonusy: ['Velká výdrž', 'Bonus na vzdušné kartičky'],
    nevyhoda: null,
    bojZivel: 'vzduch',
    bojNasobicPoskozeni: 1.3,
    bojKriticka: 0.1,
    bojKritickyNasobic: 1.5,
    bojVydrz: 150,
    obchodNasobicCeny: 1,
  },
  {
    id: 'mya',
    jmeno: 'Mya',
    popis: 'Zem a nezdolná výdrž',
    ikona: '🌿',
    barva: '#22c55e',
    bonusy: ['Bonus na zemní kartičky', 'Velká výdrž'],
    nevyhoda: null,
    bojZivel: 'zeme',
    bojNasobicPoskozeni: 1.3,
    bojKriticka: 0.1,
    bojKritickyNasobic: 1.5,
    bojVydrz: 150,
    obchodNasobicCeny: 1,
  },
  {
    id: 'loxen',
    jmeno: 'Loxen',
    popis: 'Voda a přesný kritický zásah',
    ikona: '🌊',
    barva: '#3b82f6',
    bonusy: ['Bonus na vodní kartičky', 'Kritický bonus'],
    nevyhoda: null,
    bojZivel: 'voda',
    bojNasobicPoskozeni: 1.3,
    bojKriticka: 0.2,
    bojKritickyNasobic: 1.75,
    bojVydrz: 100,
    obchodNasobicCeny: 1,
  },
]
