import type { NepritelDef, Pozice2D } from '../types'
import { nepritelPodleId } from './nepratele'
import { OBLASTI_SVETA } from './oblasti'

/** Běžní protivníci se objevují v příslušných nebezpečných oblastech.
 * Vesnice a krystalová mýtina jsou zatím bezpečné; boss má vlastní spawn. */
export const OBLASTNI_NEPRATELE = [
  { oblastId: 'stiny-lesa', nepritelId: 'stinovy-vlcek' },
  { oblastId: 'stiny-lesa', nepritelId: 'lesni-bludicka' },
  { oblastId: 'stiny-lesa', nepritelId: 'lesni-slizena' },
  { oblastId: 'stiny-lesa', nepritelId: 'krystalovy-brouk' },
] as const

export interface OblastniSpawn { def: NepritelDef; oblastId: string; pozice: Pozice2D }

/** Náhodný bod uvnitř oblasti, s rezervou pro obvod a hráče.
 * Deterministický zdroj náhody umožňuje jednoduché jednotkové testy. */
export function poziceVOblasti(oblastId: string, nahodne: () => number = Math.random): Pozice2D {
  const oblast = OBLASTI_SVETA.find(o => o.id === oblastId)
  if (!oblast) throw new Error(`Neznámá oblast: ${oblastId}`)
  const n = () => Math.min(0.999999, Math.max(0, Number.isFinite(nahodne()) ? nahodne() : 0))
  const uhel = n() * Math.PI * 2
  const polomer = Math.sqrt(n()) * Math.max(0, oblast.polomer - 1)
  return { x: oblast.stred.x + Math.cos(uhel) * polomer, z: oblast.stred.z + Math.sin(uhel) * polomer }
}

export function vytvorOblastniSpawny(pocet: number, nahodne: () => number = Math.random): OblastniSpawn[] {
  const polozky = [...OBLASTNI_NEPRATELE]
  for (let i = polozky.length - 1; i > 0; i--) {
    const r = nahodne()
    const j = Math.min(i, Math.max(0, Math.floor((Number.isFinite(r) ? r : 0) * (i + 1))))
    ;[polozky[i], polozky[j]] = [polozky[j], polozky[i]]
  }
  return polozky.slice(0, Math.max(0, Math.floor(pocet))).map(p => ({
    def: nepritelPodleId(p.nepritelId), oblastId: p.oblastId, pozice: poziceVOblasti(p.oblastId, nahodne),
  }))
}
