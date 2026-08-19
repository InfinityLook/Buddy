// ==========================================
// Deterministický generátor náhodných čísel.
//
// Město se skládá náhodně, ale musí vypadat pokaždé stejně — jinak by
// se při každém otevření přeskládalo a hráč by ztratil orientaci.
// Math.random() by to nezaručil, proto vlastní generátor se semínkem.
//
// Mulberry32: krátký, rychlý a pro rozmístění domů dost dobrý.
// ==========================================

export const createRandom = (seed: number) => {
  let stav = seed >>> 0

  const dalsi = (): number => {
    stav = (stav + 0x6d2b79f5) >>> 0
    let t = stav
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  return {
    /** Číslo z intervalu <0, 1) */
    dalsi,
    /** Číslo z intervalu <min, max) */
    rozsah: (min: number, max: number): number => min + dalsi() * (max - min),
    /** Celé číslo z intervalu <min, max> */
    cele: (min: number, max: number): number => Math.floor(min + dalsi() * (max - min + 1)),
    /** Náhodná položka ze seznamu */
    vyber: <T>(polozky: readonly T[]): T => polozky[Math.floor(dalsi() * polozky.length)],
    /** Pravda s danou pravděpodobností */
    sance: (pravdepodobnost: number): boolean => dalsi() < pravdepodobnost,
  }
}

export type Random = ReturnType<typeof createRandom>
