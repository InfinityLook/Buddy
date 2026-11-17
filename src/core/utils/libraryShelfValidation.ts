// ==========================================
// Library — validace lokálních dat čtenáře (police a postup čtení).
// Poškozený záznam se tiše vyřadí, ne celý seznam (stejný vzor jako
// ostatní persistované store).
// ==========================================

export const MAX_POLICE = 500
export const MAX_DELKA_ID = 100

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
/** Jen díla z databáze (uuid) se synchronizují; ukázky ne (neexistují v DB). */
export const jeIdDilaZDb = (id: string): boolean => UUID.test(id)

export interface PolicovyZaznam {
  /** id díla */
  id: string
  updatedAt: number
  deletedAt: number | null
}

const cislo = (x: unknown): number | null => (typeof x === 'number' && Number.isFinite(x) && x >= 0 ? x : null)
const platneId = (x: unknown): x is string => typeof x === 'string' && x.length > 0 && x.length <= MAX_DELKA_ID

export const ocistiPolici = (raw: unknown, ted: number = Date.now()): PolicovyZaznam[] => {
  if (!Array.isArray(raw)) return []
  const mapa = new Map<string, PolicovyZaznam>()
  for (const polozka of raw) {
    // Starší tvar (fáze 2): holé textové id → živý záznam s časem "teď".
    if (platneId(polozka)) {
      if (!mapa.has(polozka)) mapa.set(polozka, { id: polozka, updatedAt: ted, deletedAt: null })
      continue
    }
    if (!polozka || typeof polozka !== 'object') continue
    const z = polozka as Record<string, unknown>
    if (!platneId(z.id)) continue
    const updatedAt = cislo(z.updatedAt) ?? ted
    const deletedAt = z.deletedAt === null || z.deletedAt === undefined ? null : cislo(z.deletedAt)
    mapa.set(z.id, { id: z.id, updatedAt, deletedAt })
  }
  const zivych = [...mapa.values()].filter((z) => !z.deletedAt)
  const vsech = [...mapa.values()]
  if (zivych.length <= MAX_POLICE) return vsech
  // Nad limit: nejstarší živé záznamy se zahodí.
  const povolene = new Set(zivych.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_POLICE).map((z) => z.id))
  return vsech.filter((z) => z.deletedAt || povolene.has(z.id))
}

export const validateLibraryShelfData = (raw: unknown, ted: number = Date.now()): { zaznamy: PolicovyZaznam[] } => {
  const o = raw && typeof raw === 'object' ? (raw as { zaznamy?: unknown; ids?: unknown }) : {}
  return { zaznamy: ocistiPolici(o.zaznamy ?? o.ids, ted) }
}

// ---------- Postup čtení ----------

export interface PostupZaznam {
  /** id díla */
  id: string
  updatedAt: number
  /** Postup se nemaže, sloupec existuje jen kvůli společnému rozhraní sync. */
  deletedAt: null
  versionId: string | null
  chapterPos: number
  blockIdx: number
  percent: number
  secondsRead: number
  finishedAt: number | null
}

const celeNezaporne = (x: unknown): number => (typeof x === 'number' && Number.isFinite(x) ? Math.max(0, Math.floor(x)) : 0)

export const ocistiPostup = (raw: unknown): PostupZaznam[] => {
  if (!Array.isArray(raw)) return []
  const mapa = new Map<string, PostupZaznam>()
  for (const polozka of raw) {
    if (!polozka || typeof polozka !== 'object') continue
    const z = polozka as Record<string, unknown>
    if (!platneId(z.id)) continue
    const percent = typeof z.percent === 'number' && Number.isFinite(z.percent) ? Math.min(100, Math.max(0, z.percent)) : 0
    mapa.set(z.id, {
      id: z.id,
      updatedAt: cislo(z.updatedAt) ?? 0,
      deletedAt: null,
      versionId: typeof z.versionId === 'string' && z.versionId.length <= MAX_DELKA_ID ? z.versionId : null,
      chapterPos: celeNezaporne(z.chapterPos),
      blockIdx: celeNezaporne(z.blockIdx),
      percent: Math.round(percent * 100) / 100,
      secondsRead: celeNezaporne(z.secondsRead),
      finishedAt: cislo(z.finishedAt),
    })
  }
  return [...mapa.values()].slice(0, MAX_POLICE)
}

export const validateLibraryPostupData = (raw: unknown): { postupy: PostupZaznam[] } => ({
  postupy: ocistiPostup(raw && typeof raw === 'object' ? (raw as { postupy?: unknown }).postupy : undefined),
})
