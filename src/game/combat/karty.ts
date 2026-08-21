import { Karta } from './types'

// ==========================================
// Sdílený balíček karet — každá postava umí zahrát libovolnou z nich,
// ale ta, jejíž živel odpovídá postavině bonusu (viz postavy.ts), dá
// navíc poškození. Dvě karty na živel: slabší a silnější varianta.
// ==========================================

export const KARTY: Karta[] = [
  { id: 'paprsek', nazev: 'Paprsek', zivel: 'svetlo', ikona: '✨', poskozeniOd: 8, poskozeniDo: 14 },
  { id: 'zar', nazev: 'Zář', zivel: 'svetlo', ikona: '🌟', poskozeniOd: 12, poskozeniDo: 18 },
  { id: 'plaminek', nazev: 'Plamínek', zivel: 'ohen', ikona: '🔥', poskozeniOd: 8, poskozeniDo: 14 },
  { id: 'ohniva-koule', nazev: 'Ohnivá koule', zivel: 'ohen', ikona: '☄️', poskozeniOd: 12, poskozeniDo: 18 },
  { id: 'vanek', nazev: 'Vánek', zivel: 'vzduch', ikona: '🍃', poskozeniOd: 8, poskozeniDo: 14 },
  { id: 'vichr', nazev: 'Vichr', zivel: 'vzduch', ikona: '🌪️', poskozeniOd: 12, poskozeniDo: 18 },
  { id: 'kamenna-pest', nazev: 'Kamenná pěst', zivel: 'zeme', ikona: '🪨', poskozeniOd: 8, poskozeniDo: 14 },
  { id: 'zemetres', nazev: 'Zemětřes', zivel: 'zeme', ikona: '⛰️', poskozeniOd: 12, poskozeniDo: 18 },
  { id: 'vlnka', nazev: 'Vlnka', zivel: 'voda', ikona: '💧', poskozeniOd: 8, poskozeniDo: 14 },
  { id: 'priliv', nazev: 'Příliv', zivel: 'voda', ikona: '🌊', poskozeniOd: 12, poskozeniDo: 18 },
]

/** Barva živlu pro kartu i pro zvýraznění bonusového živlu postavy. */
export const BARVA_ZIVLU: Record<Karta['zivel'], string> = {
  svetlo: '#fbbf24',
  ohen: '#ef4444',
  vzduch: '#67e8f9',
  zeme: '#22c55e',
  voda: '#3b82f6',
}

export const NAZEV_ZIVLU: Record<Karta['zivel'], string> = {
  svetlo: 'Světlo',
  ohen: 'Oheň',
  vzduch: 'Vzduch',
  zeme: 'Země',
  voda: 'Voda',
}
