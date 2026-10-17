import { urovenDůvěry } from './npcVztahy'
import type { ObyvatelId } from './npcInteractions'

/** Krátké volitelné příběhové epizody odemčené vztahem 2/2. */
export const NPC_UDALOSTI = {
  elara: {
    id: 'elara', nazev: 'Kronika světla',
    uvod: 'Elara rozvine na stole zažloutlou mapu údolí.',
    radky: [
      'Elara: První strážci přísahali, že krystal nikdy nepoužijí k vládnutí.',
      'Elara: Na mapě jsou tři pečetě. Jednu ukrývá vesnice, další les a poslední starý háj.',
      'Elara: Než se vydáme po jejich stopách, musíme udržet naše lidi v bezpečí.',
    ],
    zaver: 'Do deníku sis zapsal zmínku o třech pečetích.',
  },
  kael: {
    id: 'kael', nazev: 'Stopy v temném lese',
    uvod: 'Kael ti ukáže šrámy na starém štítu.',
    radky: [
      'Kael: Tyhle stopy nezanechalo obyčejné zvíře. Viděl jsem je za soumraku.',
      'Kael: Stíny se stahují k místům, kde kdysi stávala strážní ohniště.',
      'Kael: Až budeš v lese, sleduj světlo svého Buddyho. Varuje tě dřív než meč.',
    ],
    zaver: 'Získal jsi Kaelovu zprávu o stínech.',
  },
  mira: {
    id: 'mira', nazev: 'Ztracená stezka stavitelů',
    uvod: 'Mira rozloží náčrt starého kamenného mostu.',
    radky: [
      'Mira: Základy domů mají stejný znak jako kameny u severní stezky.',
      'Mira: Staří stavitelé používali krystaly, aby ukázali bezpečný směr v mlze.',
      'Mira: Jednou cestu obnovíme. Zatím si zapamatuj symbol na tomto plánu.',
    ],
    zaver: 'Do deníku sis zapsal znak dávných stavitelů.',
  },
} as const

export type NpcUdalostId = keyof typeof NPC_UDALOSTI
export function jeNpcUdalostId(id: string): id is NpcUdalostId {
  return Object.prototype.hasOwnProperty.call(NPC_UDALOSTI, id)
}
export function lzeZaznamenatUdalost(id: string, splnene: readonly string[], zaznamenane: readonly string[]): boolean {
  return jeNpcUdalostId(id) && urovenDůvěry(id, splnene) >= 2 && !zaznamenane.includes(id)
}
export function overZaznamenaneUdalosti(hodnota: unknown): NpcUdalostId[] {
  return Array.isArray(hodnota)
    ? [...new Set(hodnota.filter((id): id is NpcUdalostId => typeof id === 'string' && jeNpcUdalostId(id)))]
    : []
}
export function udalostProObyvatele(id: string, splnene: readonly string[]) {
  return jeNpcUdalostId(id) && urovenDůvěry(id as ObyvatelId, splnene) >= 2 ? NPC_UDALOSTI[id] : null
}
