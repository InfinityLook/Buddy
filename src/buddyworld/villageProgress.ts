// Buddy World: první rozšiřování osady. Čistá logika bez závislosti na Reactu.
export interface VillageProgress {
  uroven: number
  drevo: number
  kamen: number
  krystaly: number
  porazeniNepratele: number
  porazeniBossove: number
}

export const VYCHOZI_OSADA: VillageProgress = {
  uroven: 1, drevo: 0, kamen: 0, krystaly: 0,
  porazeniNepratele: 0, porazeniBossove: 0,
}

export const MAX_UROVEN_OSADY = 5

export const cenaRozsireni = (uroven: number) => ({
  drevo: 4 * uroven,
  kamen: 3 * uroven,
  krystaly: uroven >= 3 ? uroven - 2 : 0,
})

export const lzeRozsirit = (stav: VillageProgress): boolean => {
  if (stav.uroven >= MAX_UROVEN_OSADY) return false
  const cena = cenaRozsireni(stav.uroven)
  return stav.drevo >= cena.drevo &&
    stav.kamen >= cena.kamen &&
    stav.krystaly >= cena.krystaly
}

export const odmenaZaSouboj = (stav: VillageProgress, boss: boolean): VillageProgress => ({
  ...stav,
  drevo: stav.drevo + (boss ? 8 : 2),
  kamen: stav.kamen + (boss ? 6 : 1),
  krystaly: stav.krystaly + (boss ? 2 : 0),
  porazeniNepratele: stav.porazeniNepratele + (boss ? 0 : 1),
  porazeniBossove: stav.porazeniBossove + (boss ? 1 : 0),
})

export const rozsiritOsadu = (stav: VillageProgress): VillageProgress => {
  if (!lzeRozsirit(stav)) return stav
  const cena = cenaRozsireni(stav.uroven)
  return {
    ...stav, uroven: stav.uroven + 1,
    drevo: stav.drevo - cena.drevo,
    kamen: stav.kamen - cena.kamen,
    krystaly: stav.krystaly - cena.krystaly,
  }
}

export const overVillageProgress = (data: unknown): VillageProgress => {
  if (!data || typeof data !== 'object') return VYCHOZI_OSADA
  const d = data as Record<string, unknown>
  const cely = (v: unknown, min: number, max: number) =>
    typeof v === 'number' && Number.isSafeInteger(v) && v >= min && v <= max ? v : min
  return {
    uroven: cely(d.uroven, 1, MAX_UROVEN_OSADY),
    drevo: cely(d.drevo, 0, 1_000_000),
    kamen: cely(d.kamen, 0, 1_000_000),
    krystaly: cely(d.krystaly, 0, 1_000_000),
    porazeniNepratele: cely(d.porazeniNepratele, 0, 1_000_000),
    porazeniBossove: cely(d.porazeniBossove, 0, 1_000_000),
  }
}

/** Sběr ve světě: suroviny se připisují jen za úspěšnou interakci. */
export type Surovina = 'drevo' | 'kamen' | 'krystaly'
export const pridejSurovinu = (stav: VillageProgress, typ: Surovina, pocet = 1): VillageProgress => {
  if (!Number.isSafeInteger(pocet) || pocet < 1 || pocet > 10) return stav
  return { ...stav, [typ]: Math.min(1_000_000, stav[typ] + pocet) }
}
