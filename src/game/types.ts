export type PostavaId = 'andel' | 'aryn' | 'gron' | 'mya' | 'loxen'

export interface Postava {
  id: PostavaId
  jmeno: string
  /** Krátký podtitul pod jménem na kartě. */
  popis: string
  ikona: string
  barva: string
  /** Kladné vlastnosti — vypisují se jako seznam na kartě i v detailu. */
  bonusy: string[]
  /** Nevýhoda, pokud nějakou postava má. Zatím jen Angel. */
  nevyhoda: string | null
}

export type LokaceTyp = 'mesto' | 'dungeon' | 'arena' | 'vesnice' | 'trziste' | 'hlavni-mesto'

export interface Lokace {
  id: string
  typ: LokaceTyp
  nazev: string
  ikona: string
  barva: string
  /** Pozice na mapě v procentech (0–100) šířky/výšky viewboxu — proto se
   *  mapa přeuspořádá stejně na jakkoli širokém displeji, ne podle
   *  pevných pixelů. */
  x: number
  y: number
}
