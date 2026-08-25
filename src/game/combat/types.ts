// ==========================================
// Datové typy karetního/soubojového systému. Postava.ts se o tyhle typy
// opírá pro svoje bojové vlastnosti (bojZivel, bojNasobicPoskozeni, …) —
// viz komentář tam.
// ==========================================

// arkana/tma přibyly s výměnou hrdinů (postavy.ts) za Lyru a Drakona —
// jejich živly (Arcane/Dark) nešly poctivě namapovat na žádný z
// původních pěti, byla by to jen lež v UI. svetlo a vzduch teď nemá
// žádná postava jako svůj bonusový živel (obě dřívější postavy s nimi
// zmizely), ale karty samotné zůstávají — kdokoli je pořád může hrát,
// jen bez násobiče poškození.
export type Zivel = 'svetlo' | 'ohen' | 'vzduch' | 'zeme' | 'voda' | 'arkana' | 'tma'

export interface Karta {
  id: string
  nazev: string
  zivel: Zivel
  ikona: string
  /** Rozsah poškození, ze kterého se při zahrání karty losuje jedno číslo. */
  poskozeniOd: number
  poskozeniDo: number
  /** Volitelný vedlejší efekt (Fáze 5, cards) — flat léčení vlastní
   *  výdrže navrch k poškození. Jen pár silnějších karet u živlů se
   *  "podpůrnou" flavor (světlo/voda/příroda) ho má — oheň/vzduch/
   *  arkána/tma zůstávají čistě útočné, to je záměrný rozdíl v
   *  charakteru živlů, ne nedopatření. Nepřítomné/undefined = 0. */
  vlastniLeceni?: number
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
  /** Volitelný loot (Fáze 6, inventory) — id z game/data/items.ts a
   *  šance 0–1, že ho poražený nepřítel upustí. Nepřítomné/undefined =
   *  žádný loot z tohohle nepřítele. */
  lupId?: string
  sanceNaLup?: number
  /** Boss (Fáze 8) — jen kosmetika a zdroj pro odznak, dokud nepřítel
   *  nemá i zuriPodHp/zuriNasobicPoskozeni níž. Odděleno od "má hodně
   *  životů", protože ne každý silný nepřítel má být boss (a naopak by
   *  boss teoreticky mohl mít málo životů, kdyby to jeho zuřivá fáze
   *  vykompenzovala). */
  jeBoss?: boolean
  /** Práh (podíl max. životů, 0–1), pod který boss "zuří" — od tý
   *  chvíle do konce souboje násobí svůj protiútok zuriNasobicPoskozeni.
   *  Nepřítomné = boss žádnou zuřivou fázi nemá (zatím jen kosmetický
   *  jeBoss, žádná druhá fáze). */
  zuriPodHp?: number
  zuriNasobicPoskozeni?: number
  /** Vybavení (Fáze 9), co tenhle nepřítel garantovaně upustí při
   *  výhře — id z game/data/equipment.ts. Na rozdíl od lupId/sanceNaLup
   *  žádná náhoda: signální relikvii bosse hráč dostane vždycky, ne že
   *  by mu ji smůla mohla upřít. */
  vybaveniId?: string
}
