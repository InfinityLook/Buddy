import { useSoubojStatistikyStore } from './useSoubojStatistikyStore'
import type { PostavaId } from './combat/postavy'

// ==========================================
// Osmé kolo vylepšení — odemykání kosmetické varianty barvy postavy
// (viz combat/postavy.ts's VariantaPostavy, PostavaGrafika.tsx pro
// samotnou paletu). Podmínka odemčení čte přímo z už existujícího
// useSoubojStatistikyStore (výhry+prohry+remízy za KONKRÉTNÍ postavu)
// — appka nepotřebuje žádný nový store ani žádné nové počítadlo,
// "kolikrát jsem tuhle postavu hrál" je jen součet tří čísel, co se
// tak jako tak zaznamenávají po každém zápase.
//
// Schválně jen JEDNA sdílená "prestižní" varianta (černo-zlatá) pro
// všechny čtyři postavy místo čtyř bespoke palet — stejný silueta/
// doplněk rozdíl mezi postavami zůstává (ty se kreslí podle postavaId
// uvnitř PostavaGrafika.tsx), jen přebarvený jednotně, ať appka
// nemusí navrhovat čtyři samostatné palety pro čistě kosmetický bonus.
//
// Volba varianty je schválně jen PREVIEW v samotném výběru postavy
// (VyberPostavy.tsx) — appka ji nikam dál neprovlíká (ne do zápasu, ne
// na síť, ne do arény) — přidat ji tam by znamenalo měnit
// PripojitPayload/network.ts a překreslovat token ve všech dalších
// komponentách (Bojiste.tsx, SoubojArena2D/3D.tsx) kvůli čistě
// dekorativní volbě, což nebylo součástí zadání a je to zbytečná
// šíře pro to, co je ve skutečnosti "odemkni a podívej se, jak to
// vypadá".
// ==========================================

/** Kolik zápasů (výhra+prohra+remíza dohromady) appka vyžaduje s
 *  KONKRÉTNÍ postavou, než se jí odemkne zlatá varianta. */
export const ZAPASU_PRO_ODEMKNUTI_ZLATE = 5

export const pocetOdehranychZapasu = (postavaId: PostavaId): number => {
  const zaznam = useSoubojStatistikyStore.getState().vysledky[postavaId]
  if (!zaznam) return 0
  return zaznam.vyhry + zaznam.prohry + zaznam.remizy
}

export const jeZlataOdemcena = (postavaId: PostavaId): boolean =>
  pocetOdehranychZapasu(postavaId) >= ZAPASU_PRO_ODEMKNUTI_ZLATE
