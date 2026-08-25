import { Zivel } from './combat/types'

export type PostavaId = 'kael' | 'lyra' | 'rayen' | 'elara' | 'drakon'

export interface Postava {
  id: PostavaId
  jmeno: string
  /** Krátký podtitul pod jménem na kartě. */
  popis: string
  /** Emoji odznak — malá značka používaná mimo kartu výběru (top bar
   *  mapy, souboj, obchod, dovednosti). Samostatné od portrét, který
   *  je jen na kartě samotné. */
  ikona: string
  /** Cesta k portrétní ilustraci postavy (public/postavy/<id>.jpg),
   *  280×764 px — viz komentář v postavy.ts o zdroji obrázků. */
  portret: string
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

export type LokaceTyp = 'mesto' | 'dungeon' | 'arena' | 'vesnice' | 'trziste' | 'hlavni-mesto' | 'explorace'

export interface Lokace {
  id: string
  typ: LokaceTyp
  nazev: string
  ikona: string
  barva: string
  /** Pozice pinu v procentech (0–100) šířky/výšky obrázku mapy — viz
   *  komentář v lokace.ts o tom, jak se tahle čísla odečítají. */
  x: number
  y: number
}
