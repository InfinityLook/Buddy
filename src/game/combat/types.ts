// ==========================================
// Datové typy karetního/soubojového systému. Postava.ts se o tyhle typy
// opírá pro svoje bojové vlastnosti (bojZivel, bojNasobicPoskozeni, …) —
// viz komentář tam.
// ==========================================

export type Zivel = 'svetlo' | 'ohen' | 'vzduch' | 'zeme' | 'voda'

export interface Karta {
  id: string
  nazev: string
  zivel: Zivel
  ikona: string
  /** Rozsah poškození, ze kterého se při zahrání karty losuje jedno číslo. */
  poskozeniOd: number
  poskozeniDo: number
}

export interface Nepritel {
  id: string
  jmeno: string
  ikona: string
  zivoty: number
  poskozeniOd: number
  poskozeniDo: number
  odmenaXp: number
  odmenaKredity: number
}
