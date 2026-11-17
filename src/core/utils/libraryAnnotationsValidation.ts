// ==========================================
// Library — validace poznámek čtenáře (záložky, zvýraznění, poznámky).
// Poškozený záznam se tiše vyřadí, ne celý seznam (stejný vzor jako
// ostatní persistované store). Rozsah odpovídá CHECK v library_annotations.
// ==========================================

export type DruhAnotace = 'zalozka' | 'zvyrazneni' | 'poznamka'
export type BarvaAnotace = 'zluta' | 'zelena' | 'modra' | 'ruzova' | 'fialova'

export const DRUHY_ANOTACE: readonly DruhAnotace[] = ['zalozka', 'zvyrazneni', 'poznamka']
export const BARVY_ANOTACE: readonly BarvaAnotace[] = ['zluta', 'zelena', 'modra', 'ruzova', 'fialova']

export const MAX_ANOTACI = 3000
export const MAX_ANOTACI_NA_DILO = 500
export const MAX_EXCERPT = 500
export const MAX_POZNAMKA = 2000
export const MAX_DELKA_ID_ANOTACE = 100

export interface AnotaceZaznam {
  id: string
  workId: string
  /** Verze textu, ke které se kotva vztahuje (po nové verzi díla může být neplatná). */
  versionId: string | null
  kind: DruhAnotace
  chapterPos: number
  blockIdx: number
  charStart: number
  charEnd: number
  excerpt: string
  note: string | null
  color: BarvaAnotace | null
  createdAt: number
  updatedAt: number
  deletedAt: number | null
}

const cislo = (x: unknown): number | null => (typeof x === 'number' && Number.isFinite(x) && x >= 0 ? x : null)
const cele = (x: unknown): number => (typeof x === 'number' && Number.isFinite(x) ? Math.max(0, Math.floor(x)) : 0)
const text = (x: unknown, max: number): string => (typeof x === 'string' ? x.slice(0, max) : '')

export const ocistiAnotace = (raw: unknown, ted: number = Date.now()): AnotaceZaznam[] => {
  if (!Array.isArray(raw)) return []
  const mapa = new Map<string, AnotaceZaznam>()
  for (const polozka of raw) {
    if (!polozka || typeof polozka !== 'object') continue
    const z = polozka as Record<string, unknown>
    if (typeof z.id !== 'string' || z.id.length === 0 || z.id.length > MAX_DELKA_ID_ANOTACE) continue
    if (typeof z.workId !== 'string' || z.workId.length === 0 || z.workId.length > MAX_DELKA_ID_ANOTACE) continue
    if (!DRUHY_ANOTACE.includes(z.kind as DruhAnotace)) continue
    const kind = z.kind as DruhAnotace
    const barva = BARVY_ANOTACE.includes(z.color as BarvaAnotace) ? (z.color as BarvaAnotace) : null
    const charStart = cele(z.charStart)
    const charEnd = Math.max(charStart, cele(z.charEnd))
    // Zvýraznění a poznámka bez rozsahu nedávají smysl (zmizelo by z textu).
    if (kind !== 'zalozka' && charEnd <= charStart) continue
    const poznamka = typeof z.note === 'string' && z.note.trim() ? z.note.slice(0, MAX_POZNAMKA) : null
    const updatedAt = cislo(z.updatedAt) ?? ted
    mapa.set(z.id, {
      id: z.id,
      workId: z.workId,
      versionId: typeof z.versionId === 'string' && z.versionId.length <= MAX_DELKA_ID_ANOTACE ? z.versionId : null,
      kind,
      chapterPos: cele(z.chapterPos),
      blockIdx: cele(z.blockIdx),
      charStart: kind === 'zalozka' ? 0 : charStart,
      charEnd: kind === 'zalozka' ? 0 : charEnd,
      excerpt: text(z.excerpt, MAX_EXCERPT),
      note: kind === 'poznamka' ? poznamka : null,
      color: kind === 'zalozka' ? null : (barva ?? 'zluta'),
      createdAt: cislo(z.createdAt) ?? updatedAt,
      updatedAt,
      deletedAt: z.deletedAt === null || z.deletedAt === undefined ? null : cislo(z.deletedAt),
    })
  }
  const vsech = [...mapa.values()]
  const zivych = vsech.filter((a) => !a.deletedAt)
  if (zivych.length <= MAX_ANOTACI) return vsech
  // Nad limit: nejstarší živé záznamy se zahodí.
  const povolene = new Set(zivych.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_ANOTACI).map((a) => a.id))
  return vsech.filter((a) => a.deletedAt || povolene.has(a.id))
}

export const validateLibraryAnnotationsData = (raw: unknown, ted: number = Date.now()): { anotace: AnotaceZaznam[] } => ({
  anotace: ocistiAnotace(raw && typeof raw === 'object' ? (raw as { anotace?: unknown }).anotace : undefined, ted),
})
