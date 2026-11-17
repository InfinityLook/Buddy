// ==========================================
// Library — formát textového díla (library_chapters.blocks) a čisté
// pomocné funkce čtečky. Tohle je SMLOUVA: import EPUB (fáze 4) i
// vydávání z Writer's Room (fáze 7) musí do `blocks` zapisovat přesně
// tenhle tvar. Obsah se vykresluje jako holý text (nikdy HTML), takže
// nepřijatá položka je jen přeskočená, ne bezpečnostní riziko.
// ==========================================

export type TypBloku = 'odstavec' | 'nadpis' | 'citat' | 'oddelovac'

export interface Blok {
  typ: TypBloku
  text: string
}

export interface Kapitola {
  position: number
  title: string
  bloky: Blok[]
}

const TYPY: readonly TypBloku[] = ['odstavec', 'nadpis', 'citat', 'oddelovac']
export const MAX_DELKA_BLOKU = 20000

export const ocistiBloky = (raw: unknown): Blok[] => {
  if (!Array.isArray(raw)) return []
  const vysledek: Blok[] = []
  for (const b of raw) {
    if (!b || typeof b !== 'object') continue
    const { typ, text } = b as { typ?: unknown; text?: unknown }
    if (typeof typ !== 'string' || !TYPY.includes(typ as TypBloku)) continue
    if (typ === 'oddelovac') {
      vysledek.push({ typ: 'oddelovac', text: '' })
      continue
    }
    if (typeof text !== 'string' || text.trim().length === 0) continue
    vysledek.push({ typ: typ as TypBloku, text: text.slice(0, MAX_DELKA_BLOKU) })
  }
  return vysledek
}

/** Váha kapitoly pro výpočet procent = počet znaků (min. 1, ať prázdná kapitola neláme dělení). */
const vaha = (k: Kapitola): number => Math.max(1, k.bloky.reduce((s, b) => s + b.text.length, 0))

/** Celkový postup 0..100 podle znaků: dokončené kapitoly + zlomek aktuální. */
export const spoctiProcenta = (kapitoly: readonly Kapitola[], kapitolaIdx: number, zlomek: number): number => {
  if (kapitoly.length === 0) return 0
  const celkem = kapitoly.reduce((s, k) => s + vaha(k), 0)
  const idx = Math.min(Math.max(kapitolaIdx, 0), kapitoly.length - 1)
  const pred = kapitoly.slice(0, idx).reduce((s, k) => s + vaha(k), 0)
  const z = Math.min(1, Math.max(0, zlomek))
  return Math.round(((pred + z * vaha(kapitoly[idx])) / celkem) * 10000) / 100
}

/** Zbývající minuty čtení při ~200 slovech za minutu (průměrné tiché čtení). */
export const odhadMinut = (kapitoly: readonly Kapitola[], kapitolaIdx: number, zlomek: number): number => {
  const slov = (k: Kapitola) => k.bloky.reduce((s, b) => s + (b.text.trim() ? b.text.trim().split(/\s+/).length : 0), 0)
  const idx = Math.min(Math.max(kapitolaIdx, 0), Math.max(0, kapitoly.length - 1))
  if (kapitoly.length === 0) return 0
  const zbyva = slov(kapitoly[idx]) * (1 - Math.min(1, Math.max(0, zlomek))) +
    kapitoly.slice(idx + 1).reduce((s, k) => s + slov(k), 0)
  return Math.max(0, Math.ceil(zbyva / 200))
}

export const formatCas = (sekundy: number): string => {
  const min = Math.floor(sekundy / 60)
  if (min < 1) return 'méně než minutu'
  if (min < 60) return `${min} min`
  return `${Math.floor(min / 60)} h ${min % 60} min`
}
