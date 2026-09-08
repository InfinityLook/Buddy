import type { Pole2D } from './types'

// ==========================================
// Buddyho Trh — Fáze 1: obchody na desce. Otevřená mřížka nemá jednu
// pevnou dráhu jako klasický Monopoly, takže obchody jsou rozeseté po
// celé ploše, ne na jedné smyčce — hráč na ně narazí podle toho, kudy
// se sám rozhodne jít, ne v pevném pořadí. Tři cenové úrovně (levnější
// prstenec, dražší střed) dávají hře přirozenou gradaci bez skutečné
// trasy.
// ==========================================

export interface DefiniceObchodu {
  klic: string
  pozice: Pole2D
  nazev: string
  cena: number
  najem: number
}

export const klicPole = (p: Pole2D): string => `${p.x},${p.z}`

const OBCHODY_SUROVE: Omit<DefiniceObchodu, 'klic'>[] = [
  { pozice: { x: 1, z: 1 }, nazev: 'Pekárna', cena: 150, najem: 20 },
  { pozice: { x: 5, z: 1 }, nazev: 'Řeznictví', cena: 150, najem: 20 },
  { pozice: { x: 1, z: 5 }, nazev: 'Lékárna', cena: 150, najem: 20 },
  { pozice: { x: 5, z: 5 }, nazev: 'Květinářství', cena: 150, najem: 20 },
  { pozice: { x: 3, z: 0 }, nazev: 'Kavárna', cena: 250, najem: 35 },
  { pozice: { x: 0, z: 3 }, nazev: 'Knihkupectví', cena: 250, najem: 35 },
  { pozice: { x: 6, z: 3 }, nazev: 'Cukrárna', cena: 250, najem: 35 },
  { pozice: { x: 3, z: 6 }, nazev: 'Krejčovství', cena: 250, najem: 35 },
  { pozice: { x: 2, z: 2 }, nazev: 'Klenotnictví', cena: 400, najem: 60 },
  { pozice: { x: 4, z: 2 }, nazev: 'Hodinářství', cena: 400, najem: 60 },
  { pozice: { x: 2, z: 4 }, nazev: 'Antikvariát', cena: 400, najem: 60 },
  { pozice: { x: 4, z: 4 }, nazev: 'Galerie', cena: 400, najem: 60 },
]

export const OBCHODY: DefiniceObchodu[] = OBCHODY_SUROVE.map((o) => ({ ...o, klic: klicPole(o.pozice) }))

export const OBCHODY_PODLE_KLICE: Record<string, DefiniceObchodu> = Object.fromEntries(
  OBCHODY.map((o) => [o.klic, o])
)

/** Najde definici obchodu na daném políčku, pokud tam nějaký je —
 *  nejvyšší většina mřížky je prázdná cesta, jen 12 z 49 políček je
 *  koupitelných. */
export const najdiObchodNaPoli = (p: Pole2D): DefiniceObchodu | undefined => OBCHODY_PODLE_KLICE[klicPole(p)]
