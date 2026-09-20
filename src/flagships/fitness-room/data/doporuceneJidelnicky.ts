export interface PolozkaJidelnicku {
  nazev: string
  kcal: number
}

export interface DoporucenyJidelnicek {
  id: string
  nazev: string
  // Celkový součet položek níž — appka ho nepočítá odvozeně za běhu ze
  // seznamu (i když by šlo), protože jde o zaokrouhlené "cílové" číslo
  // dne (1500/2000/2800), ne o přesný matematický součet — appka podle
  // něj řadí, který jídelníček je nejblíž uživatelovu cíli kalorií.
  cilovaKcal: number
  polozky: PolozkaJidelnicku[]
}

// ==========================================
// VIP-exkluzivní pevná sada doporučených denních jídelníčků. Appka nemá
// žádnou skutečnou nutriční databázi ani generátor — jde o tři ručně
// sestavené, reálně vypadající dny s reálným součtem kcal, stejná
// "pevná sada, ne libovolný vstup" zásada jako appčiny ostatní
// katalogy (RUTINY vedle, Kalendářovy BARVY_DNE). Appka je nabízí, ne
// vnucuje — jsou to jen tři konkrétní příklady, ne jediný správný plán.
// ==========================================
export const DOPORUCENE_JIDELNICKY: DoporucenyJidelnicek[] = [
  {
    id: 'nizkokaloricky',
    nazev: 'Nízkokalorický den',
    cilovaKcal: 1500,
    polozky: [
      { nazev: 'Snídaně: Bílý jogurt s ovocem', kcal: 250 },
      { nazev: 'Svačina: Jablko', kcal: 95 },
      { nazev: 'Oběd: Kuřecí prsa s brokolicí', kcal: 420 },
      { nazev: 'Svačina: Ořechy (30 g)', kcal: 180 },
      { nazev: 'Večeře: Tvaroh se zeleninou', kcal: 300 },
      { nazev: 'Doplněk: Proteinový nápoj', kcal: 120 },
    ],
  },
  {
    id: 'vyvazeny',
    nazev: 'Vyvážený den',
    cilovaKcal: 2000,
    polozky: [
      { nazev: 'Snídaně: Ovesná kaše s banánem', kcal: 300 },
      { nazev: 'Svačina: Vejce', kcal: 156 },
      { nazev: 'Oběd: Rýže s kuřecím prsem', kcal: 550 },
      { nazev: 'Svačina: Jogurt s ořechy', kcal: 260 },
      { nazev: 'Večeře: Losos s brokolicí', kcal: 400 },
      { nazev: 'Doplněk: Chléb a sýr', kcal: 300 },
    ],
  },
  {
    id: 'objemovy',
    nazev: 'Objemový den',
    cilovaKcal: 2800,
    polozky: [
      { nazev: 'Snídaně: Ovesná kaše, vejce, banán', kcal: 480 },
      { nazev: 'Svačina: Proteinový nápoj s ořechy', kcal: 300 },
      { nazev: 'Oběd: Těstoviny s kuřecím prsem', kcal: 700 },
      { nazev: 'Svačina: Tvaroh s jogurtem', kcal: 260 },
      { nazev: 'Večeře: Losos, rýže, brokolice', kcal: 620 },
      { nazev: 'Doplněk: Chléb, sýr, ořechy', kcal: 440 },
    ],
  },
]

/** Nejbližší doporučený jídelníček uživatelovu kalorickému cíli — appka
 *  vždycky ukáže všechny tři, ale tenhle se zvýrazní jako "pro tebe".
 *  Bez cíle (null) vrací prostřední (vyvážený). */
export const nejblizsiJidelnicek = (cilKcal: number | null): DoporucenyJidelnicek => {
  if (cilKcal === null) return DOPORUCENE_JIDELNICKY[1]
  return DOPORUCENE_JIDELNICKY.reduce((nejlepsi, j) =>
    Math.abs(j.cilovaKcal - cilKcal) < Math.abs(nejlepsi.cilovaKcal - cilKcal) ? j : nejlepsi
  )
}
