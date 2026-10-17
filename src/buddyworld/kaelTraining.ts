/** Kaelův osobní výcvik: rozhodnutí odemyká cíl, odměna se nepřiděluje. */
export type StavVycviku = 'zamceno' | 'aktivni' | 'splneno'
export const KAEL_VYCVIK_CIL = 3
export function stavKaelovaVycviku(volba: string | undefined, porazeni: number): StavVycviku {
  if (volba !== 'vycvik') return 'zamceno'
  if (!Number.isFinite(porazeni) || porazeni < 0) return 'aktivni'
  return porazeni >= KAEL_VYCVIK_CIL ? 'splneno' : 'aktivni'
}
export function popisKaelovaVycviku(volba: string | undefined, porazeni: number): string {
  const stav = stavKaelovaVycviku(volba, porazeni)
  if (stav === 'zamceno') return 'Zeptej se Kaela, jak se připravit na boj, aby ti nabídl výcvik.'
  if (stav === 'splneno') return '✓ Kaelův výcvik: porazil jsi alespoň 3 nepřátele.'
  return `Kaelův výcvik: poraz 3 nepřátele (${Math.min(3, Math.max(0, Math.floor(Number.isFinite(porazeni) ? porazeni : 0)))}/3).`
}
