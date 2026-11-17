import type { AnotaceZaznam, BarvaAnotace } from '@/core/utils/libraryAnnotationsValidation'

// ==========================================
// Library — čisté pomocné funkce pro poznámky ve čtečce (bez Reactu a
// Supabase, ať jdou testovat samostatně).
// ==========================================

export const POPIS_BARVY: Record<BarvaAnotace, string> = {
  zluta: 'Žlutá',
  zelena: 'Zelená',
  modra: 'Modrá',
  ruzova: 'Růžová',
  fialova: 'Fialová',
}

export const vytvorIdAnotace = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

/** Anotace díla seřazené podle pozice v textu (kapitola, blok, znak). */
export const seradPodlePozice = (anotace: readonly AnotaceZaznam[]): AnotaceZaznam[] =>
  [...anotace].sort(
    (a, b) => a.chapterPos - b.chapterPos || a.blockIdx - b.blockIdx || a.charStart - b.charStart || a.createdAt - b.createdAt,
  )

export interface UsekBloku {
  text: string
  /** Id zvýraznění/poznámky, ke které úsek patří; null = obyčejný text. */
  anotaceId: string | null
  barva: BarvaAnotace | null
  maPoznamku: boolean
}

/**
 * Rozdělí text bloku na úseky podle zvýraznění. Překryv se řeší tak, že
 * pozdější zvýraznění začíná až tam, kde předchozí končí; rozsahy mimo
 * text se ořežou a prázdné zahodí. Spojení úseků vždy dá původní text.
 */
export const rozdelBlok = (text: string, zvyrazneni: readonly AnotaceZaznam[]): UsekBloku[] => {
  const rozsahy = zvyrazneni
    .filter((a) => a.kind !== 'zalozka')
    .map((a) => ({ a, od: Math.min(a.charStart, text.length), do: Math.min(a.charEnd, text.length) }))
    .filter((r) => r.do > r.od)
    .sort((x, y) => x.od - y.od || y.do - x.do)
  const useky: UsekBloku[] = []
  let kurzor = 0
  for (const r of rozsahy) {
    const od = Math.max(r.od, kurzor)
    if (r.do <= od) continue
    if (od > kurzor) useky.push({ text: text.slice(kurzor, od), anotaceId: null, barva: null, maPoznamku: false })
    useky.push({ text: text.slice(od, r.do), anotaceId: r.a.id, barva: r.a.color, maPoznamku: r.a.kind === 'poznamka' })
    kurzor = r.do
  }
  if (kurzor < text.length) useky.push({ text: text.slice(kurzor), anotaceId: null, barva: null, maPoznamku: false })
  return useky.length > 0 ? useky : [{ text, anotaceId: null, barva: null, maPoznamku: false }]
}

/** Krátký výřez pro seznam poznámek (jednořádkový, bez dlouhých mezer). */
export const zkratVyrez = (text: string, max = 160): string => {
  const cisty = text.replace(/\s+/g, ' ').trim()
  return cisty.length <= max ? cisty : `${cisty.slice(0, max - 1).trimEnd()}…`
}

/** Je na dané pozici (kapitola + blok) už záložka? Vrací ji, ať jde odebrat. */
export const najdiZalozku = (
  anotace: readonly AnotaceZaznam[],
  kapitolaPos: number,
  blockIdx: number,
): AnotaceZaznam | undefined =>
  anotace.find((a) => a.kind === 'zalozka' && !a.deletedAt && a.chapterPos === kapitolaPos && a.blockIdx === blockIdx)
