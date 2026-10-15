import type { VillageProgress } from './villageProgress'

export type VyrobniBudova = 'farma' | 'sklad' | 'kovarna'
export const INTERVAL_PRODUKCE_MS = 5 * 60 * 1000
export const MAX_CYKLU = 12

/** Produkce vyžaduje odemčenou budovu; počítá jen celé pětiminutové cykly. */
export function vyzvedniProdukci(stav: VillageProgress, posledni: number, ted: number): { stav: VillageProgress; cas: number; cyklu: number } {
  if (stav.uroven < 2 || !Number.isFinite(ted) || !Number.isFinite(posledni) || ted < posledni) {
    return { stav, cas: posledni, cyklu: 0 }
  }
  const cyklu = Math.min(MAX_CYKLU, Math.floor((ted - posledni) / INTERVAL_PRODUKCE_MS))
  if (cyklu < 1) return { stav, cas: posledni, cyklu: 0 }
  return {
    stav: {
      ...stav,
      drevo: Math.min(1_000_000, stav.drevo + cyklu * 2),
      kamen: Math.min(1_000_000, stav.kamen + cyklu * (stav.uroven >= 3 ? 2 : 1)),
    },
    cas: posledni + cyklu * INTERVAL_PRODUKCE_MS,
    cyklu,
  }
}

export type ObchodniAkce = 'prodej_dreva' | 'prodej_kamene' | 'nakup_dreva' | 'nakup_kamene'
export function obchoduj(stav: VillageProgress, akce: ObchodniAkce): VillageProgress {
  if (stav.uroven < 3) return stav
  switch (akce) {
    case 'prodej_dreva': return stav.drevo >= 5 ? { ...stav, drevo: stav.drevo - 5, krystaly: Math.min(1_000_000, stav.krystaly + 1) } : stav
    case 'prodej_kamene': return stav.kamen >= 4 ? { ...stav, kamen: stav.kamen - 4, krystaly: Math.min(1_000_000, stav.krystaly + 1) } : stav
    case 'nakup_dreva': return stav.krystaly >= 2 ? { ...stav, drevo: Math.min(1_000_000, stav.drevo + 5), krystaly: stav.krystaly - 2 } : stav
    case 'nakup_kamene': return stav.krystaly >= 2 ? { ...stav, kamen: Math.min(1_000_000, stav.kamen + 4), krystaly: stav.krystaly - 2 } : stav
  }
}
