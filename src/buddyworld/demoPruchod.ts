import type { KristalovaVyprava } from './kristalovaVyprava'

/** Odvozený průvodce první hratelnou smyčkou; nemění herní stav ani odměny. */
export interface DemoKrok { id: string; nazev: string; splneno: boolean; pokyn: string }
export function krokyPrvniVypravy(stav: KristalovaVyprava): DemoKrok[] {
  const zahajeno = stav.faze !== 'nezahajena'
  const ulomky = new Set(stav.ulomky).size
  const porazeni = new Set(stav.porazeni).size
  return [
    { id: 'start', nazev: 'Přijmi úkol od Elary', splneno: zahajeno, pokyn: 'V Buddyho vesnici promluv se starostkou Elarou a přijmi výpravu Ztracené světlo.' },
    { id: 'shards', nazev: 'Sesbírej tři úlomky', splneno: ulomky >= 3, pokyn: `Prozkoumej Krystalovou mýtinu a seber úlomky (${Math.min(3, ulomky)}/3).` },
    { id: 'combat', nazev: 'Poraz dva nepřátele', splneno: porazeni >= 2, pokyn: `Na mýtině poraz dva různé nepřátele (${Math.min(2, porazeni)}/2).` },
    { id: 'reward', nazev: 'Vrať se pro odměnu', splneno: stav.faze === 'dokoncena' && stav.odmenaPrevzata, pokyn: 'Vrať se do vesnice za Elarou a vyzvedni odměnu.' },
  ]
}
export function dalsiDemoKrok(stav: KristalovaVyprava): DemoKrok | null {
  return krokyPrvniVypravy(stav).find(k => !k.splneno) ?? null
}
