import * as v from 'valibot'

// ==========================================
// Ověření Fitness Roomových časů připomenutí — appka bez validního
// pole spadne na přesně stejný jediný "17:00" výchozí čas, co appka
// používala, než šlo časy vůbec nastavovat, ať se pro nikoho, kdo
// nastavení nikdy neotevře, nic nezmění.
// ==========================================

const VYCHOZI_CASY = ['17:00']

const jePlatnyCas = (x: unknown): x is string => typeof x === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(x)

export const validateFitnessPripomenutiCasy = (data: unknown): string[] => {
  const result = v.safeParse(v.array(v.unknown()), data)
  if (!result.success) return VYCHOZI_CASY
  const casy = result.output.filter(jePlatnyCas)
  return casy.length > 0 ? [...new Set(casy)].sort() : VYCHOZI_CASY
}

export const validateFitnessPripomenutiOdeslane = (data: unknown): string[] => {
  const result = v.safeParse(v.array(v.unknown()), data)
  if (!result.success) return []
  return result.output.filter(jePlatnyCas)
}
