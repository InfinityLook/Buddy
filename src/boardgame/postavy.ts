// ==========================================
// Buddyho Trh — vlastní roster maskotů, nezávislý na Buddyheimových
// hrdinech i na Souboj's čtyřce (stejná "nová hra, nový roster" volba
// jako u Souboje samotného). Zatím jen data pro Fázi 0 — jméno/emoji/
// barva/popis, žádná mechanická čísla (ta nemá ani Souboj do Fáze 2,
// kdy mu naskočil skutečný card/combat systém). Skutečná grafika
// (Kenney nízkopolygonové modely, viz CLAUDE.md's Souboj Fáze 13)
// přijde až v pozdější fázi — do té doby appka ukazuje jen barevný
// token + emoji.
//
// Šest postav, ne čtyři jako Souboj — Buddyho Trh má povolených
// 2–6 hráčů najednou, takže i v plné šestici musí mít každý svoji
// vlastní.
// ==========================================

export type PostavaId = 'gros' | 'cihla' | 'vozka' | 'banker' | 'kupec' | 'sova'

export interface Postava {
  id: PostavaId
  jmeno: string
  emoji: string
  barva: string
  popis: string
}

export const POSTAVY: Record<PostavaId, Postava> = {
  gros: {
    id: 'gros',
    jmeno: 'Groš',
    emoji: '💰',
    barva: '#f5c451',
    popis: 'Miluje peníze víc než cokoli jiného na trhu.',
  },
  cihla: {
    id: 'cihla',
    jmeno: 'Cihla',
    emoji: '🧱',
    barva: '#c2694b',
    popis: 'Stavitel — kde je Cihla, tam brzy stojí obchod.',
  },
  vozka: {
    id: 'vozka',
    jmeno: 'Vozka',
    emoji: '🛒',
    barva: '#4bb3c2',
    popis: 'Nejrychlejší na trhu — vždycky první u dobré nabídky.',
  },
  banker: {
    id: 'banker',
    jmeno: 'Bankéř',
    emoji: '🏦',
    barva: '#6b5bd6',
    popis: 'Počítá každou korunu — dvakrát.',
  },
  kupec: {
    id: 'kupec',
    jmeno: 'Kupec',
    emoji: '🏪',
    barva: '#4caf6a',
    popis: 'Vyjedná cokoli s kýmkoli.',
  },
  sova: {
    id: 'sova',
    jmeno: 'Sova',
    emoji: '🦉',
    barva: '#8a5cf6',
    popis: 'Vidí příležitost tam, kde ostatní vidí jen prázdné pole.',
  },
}

export const VSECHNY_POSTAVY: Postava[] = Object.values(POSTAVY)

export const VYCHOZI_POSTAVA: PostavaId = 'gros'
