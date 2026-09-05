// Skloňování počtu v češtině (1 / 2–4 / 5+) — Writer's Room je první
// místo, kde tenhle vzorec potřebují tři různá počítadla najednou
// (kapitoly, scény, panely), takže se to tady vyplatilo sdílet místo
// trojího opakování stejné ternární věty. Starší appky (Music Room,
// Kalendář) mají svoje vlastní inline ternáry beze změny — retrofitovat
// je jen kvůli sjednocení nebylo požádáno.
export const plural = (n: number, jeden: string, malo: string, hodne: string): string =>
  n === 1 ? jeden : n >= 2 && n <= 4 ? malo : hodne
