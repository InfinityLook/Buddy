import type { VillageProgress } from './villageProgress'
import type { IdOblasti } from './data/objevovani'
import { jeNpcUdalostId } from './npcUdalosti'

export interface Vyprava {
  id: 'elara' | 'kael' | 'mira'
  nazev: string
  popis: string
  oblast: IdOblasti
  podminka: string
  odmena: { drevo: number; kamen: number; krystaly: number }
}

/** Výpravy navazují na osobní příběhy, ale nikdy se nevyplácejí automaticky. */
export const NPC_VYPRAVY: readonly Vyprava[] = [
  { id: 'elara', nazev: 'Pečeť světelného krystalu', popis: 'Prozkoumej Krystalovou mýtinu a vrať se za Elarou.', oblast: 'kristalova-mytina', podminka: 'Objev Krystalovou mýtinu.', odmena: { drevo: 2, kamen: 3, krystaly: 8 } },
  { id: 'kael', nazev: 'Hlídka zapomenutého ohniště', popis: 'Prozkoumej Stíny lesa a poraz alespoň 10 nepřátel.', oblast: 'stiny-lesa', podminka: 'Objev Stíny lesa a poraz 10 nepřátel.', odmena: { drevo: 8, kamen: 6, krystaly: 4 } },
  { id: 'mira', nazev: 'Kameny dávných stavitelů', popis: 'Prozkoumej Háj strážce a nasbírej alespoň 15 kamenů.', oblast: 'haj-strazce', podminka: 'Objev Háj strážce a měj 15 kamenů.', odmena: { drevo: 8, kamen: 5, krystaly: 5 } },
]
export type VypravaId = Vyprava['id']
export function overSplneneVypravy(hodnota: unknown): VypravaId[] {
  return Array.isArray(hodnota) ? [...new Set(hodnota.filter((id): id is VypravaId => typeof id === 'string' && jeNpcUdalostId(id)))] : []
}
export function stavVypravy(id: string, udalosti: readonly string[], objevene: readonly string[], splnene: readonly string[], stav: Pick<VillageProgress, 'porazeniNepratele' | 'kamen'>): 'zamceno' | 'probíhá' | 'pripraveno' | 'splneno' {
  const vyprava = NPC_VYPRAVY.find(v => v.id === id)
  if (!vyprava) return 'zamceno'
  if (splnene.includes(id)) return 'splneno'
  if (!udalosti.includes(id)) return 'zamceno'
  if (!objevene.includes(vyprava.oblast)) return 'probíhá'
  if (id === 'kael' && stav.porazeniNepratele < 10) return 'probíhá'
  if (id === 'mira' && stav.kamen < 15) return 'probíhá'
  return 'pripraveno'
}
