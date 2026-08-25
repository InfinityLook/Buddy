import { Karta } from './types'

// ==========================================
// Sdílený balíček karet — každá postava umí zahrát libovolnou z nich,
// ale ta, jejíž živel odpovídá postavině bonusu (viz postavy.ts), dá
// navíc poškození. Dvě karty na živel: slabší a silnější varianta.
//
// zeme se s výměnou hrdinů přeznačilo z "kámen/zemětřesení" na
// "trny/kořeny" — Elařin živel je Nature (bylinkářka-léčitelka), ne
// horník, a "Zemětřes" by k ní neseděl. Id karet zůstávají beze
// změny, mění se jen zobrazený název a ikona.
//
// Fáze 5 (cards): tři silnější karty u "podpůrných" živlů (světlo/
// voda/příroda) navíc léčí vlastní výdrž (vlastniLeceni) — oheň/
// vzduch/arkána/tma zůstávají čistě útočné, živly mají odlišný
// charakter, ne že by na zbytek dojde "později". Slabší varianta
// stejného živlu efekt nemá, ať mezi dvěma kartami stejného živlu
// zůstává reálný rozdíl kromě čísla poškození.
// ==========================================

export const KARTY: Karta[] = [
  { id: 'paprsek', nazev: 'Paprsek', zivel: 'svetlo', ikona: '✨', poskozeniOd: 8, poskozeniDo: 14 },
  { id: 'zar', nazev: 'Zář', zivel: 'svetlo', ikona: '🌟', poskozeniOd: 12, poskozeniDo: 18, vlastniLeceni: 3 },
  { id: 'plaminek', nazev: 'Plamínek', zivel: 'ohen', ikona: '🔥', poskozeniOd: 8, poskozeniDo: 14 },
  { id: 'ohniva-koule', nazev: 'Ohnivá koule', zivel: 'ohen', ikona: '☄️', poskozeniOd: 12, poskozeniDo: 18 },
  { id: 'vanek', nazev: 'Vánek', zivel: 'vzduch', ikona: '🍃', poskozeniOd: 8, poskozeniDo: 14 },
  { id: 'vichr', nazev: 'Vichr', zivel: 'vzduch', ikona: '🌪️', poskozeniOd: 12, poskozeniDo: 18 },
  { id: 'kamenna-pest', nazev: 'Trnitý spár', zivel: 'zeme', ikona: '🌿', poskozeniOd: 8, poskozeniDo: 14 },
  { id: 'zemetres', nazev: 'Kořenový úder', zivel: 'zeme', ikona: '🌳', poskozeniOd: 12, poskozeniDo: 18, vlastniLeceni: 4 },
  { id: 'vlnka', nazev: 'Vlnka', zivel: 'voda', ikona: '💧', poskozeniOd: 8, poskozeniDo: 14 },
  { id: 'priliv', nazev: 'Příliv', zivel: 'voda', ikona: '🌊', poskozeniOd: 12, poskozeniDo: 18, vlastniLeceni: 4 },
  { id: 'arkanni-jiskra', nazev: 'Arkánní jiskra', zivel: 'arkana', ikona: '🔮', poskozeniOd: 8, poskozeniDo: 14 },
  { id: 'arkanni-vyboj', nazev: 'Arkánní výboj', zivel: 'arkana', ikona: '💫', poskozeniOd: 12, poskozeniDo: 18 },
  { id: 'stin', nazev: 'Stín', zivel: 'tma', ikona: '🌑', poskozeniOd: 8, poskozeniDo: 14 },
  { id: 'propast', nazev: 'Propast', zivel: 'tma', ikona: '🌌', poskozeniOd: 12, poskozeniDo: 18 },
]

/** Barva živlu pro kartu i pro zvýraznění bonusového živlu postavy. */
export const BARVA_ZIVLU: Record<Karta['zivel'], string> = {
  svetlo: '#fbbf24',
  ohen: '#ef4444',
  vzduch: '#67e8f9',
  zeme: '#22c55e',
  voda: '#3b82f6',
  arkana: '#a78bfa',
  tma: '#7e22ce',
}

export const NAZEV_ZIVLU: Record<Karta['zivel'], string> = {
  svetlo: 'Světlo',
  ohen: 'Oheň',
  vzduch: 'Vzduch',
  zeme: 'Příroda',
  voda: 'Voda',
  arkana: 'Arkána',
  tma: 'Temnota',
}
