import { Zivel } from './combat/types'

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

  /** Živel, jehož karty postava hraje s bonusem (bojNasobicPoskozeni). */
  bojZivel: Zivel
  /** Násobič poškození karet vlastního živlu, např. 1.3 = +30 %. */
  bojNasobicPoskozeni: number
  /** Šance na kritický zásah (0–1), zahrnuje i postavin bonus. */
  bojKriticka: number
  /** Násobič poškození při kritickém zásahu. */
  bojKritickyNasobic: number
  /** Výdrž — životy v souboji. */
  bojVydrz: number
  /** Násobič cen v budoucím herním obchodě — 1 = beze změny, 1.2 = Angel. */
  obchodNasobicCeny: number
}

export type LokaceTyp = 'mesto' | 'dungeon' | 'arena' | 'vesnice' | 'trziste' | 'hlavni-mesto'

export interface Lokace {
  id: string
  typ: LokaceTyp
  nazev: string
  ikona: string
  barva: string
  /** Pozice na mapě v procentech (0–100) šířky/výšky "světa" (viz
   *  MapaSveta.css) — proto se piny přeuspořádají stejně na jakkoli
   *  širokém plátně, ne podle pevných pixelů. */
  x: number
  y: number
  /** Odbočka mimo hlavní cestu (viz VETVE v lokace.ts) — hlavní cesta a
   *  řeka ji přeskočí, spojí se s ní jen krátká vedlejší stezka. */
  vedlejsi?: boolean
}

/** Krátká odbočka z hlavní cesty k vedlejšímu místu — `z` a `do` jsou id
 *  z LOKACE. Hlavní cesta zůstává tvořená pořadím v LOKACE (jen míst bez
 *  `vedlejsi`); tohle jsou samostatné spojnice navíc. */
export interface Vetev {
  z: string
  do: string
}
