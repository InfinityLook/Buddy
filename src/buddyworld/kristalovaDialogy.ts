import type { KristalovaVyprava, VypravaAkce } from './kristalovaVyprava'

export interface ElaraDialog {
  nadpis: string
  zprava: string
  tlacitko: string | null
  akce: VypravaAkce | null
}

/** Dialog is derived from the quest state; it never mutates the quest itself. */
export function dialogElary(stav: KristalovaVyprava, region: string): ElaraDialog {
  if (region !== 'buddy_vesnice') return {
    nadpis: 'Starostka Elara', zprava: 'Elara čeká v Buddyho vesnici.', tlacitko: null, akce: null,
  }
  switch (stav.faze) {
    case 'nezahajena': return {
      nadpis: 'Elara · Ztracené světlo',
      zprava: 'Krystaly, které chrání naši vesnici, ztrácejí sílu. Vydej se na Křišťálovou mýtinu, najdi tři úlomky a poraz strážce, kteří narušují jejich záři.',
      tlacitko: 'Přijmout výpravu', akce: { type: 'zahajit' },
    }
    case 'sber': return {
      nadpis: 'Elara · Ztracené světlo',
      zprava: `Na mýtině ještě zbývají krystalové úlomky (${stav.ulomky.length}/3). Vrať se, až je všechny najdeš.`,
      tlacitko: null, akce: null,
    }
    case 'boj': return {
      nadpis: 'Elara · Ztracené světlo',
      zprava: `Výborně! Teď musíš porazit dva nepřátele na Křišťálové mýtině (${stav.porazeni.length}/2).`,
      tlacitko: null, akce: null,
    }
    case 'navrat': return {
      nadpis: 'Elara · Ztracené světlo',
      zprava: 'Dokázal jsi to! Světlo se vrací. Přijmi poděkování naší vesnice.',
      tlacitko: 'Převzít odměnu', akce: { type: 'prevzit_odmenu', region: 'buddy_vesnice' },
    }
    case 'dokoncena': return {
      nadpis: 'Elara · Ztracené světlo',
      zprava: 'Díky tobě naše vesnice znovu září. Brzy tě čeká další dobrodružství.',
      tlacitko: null, akce: null,
    }
  }
}
