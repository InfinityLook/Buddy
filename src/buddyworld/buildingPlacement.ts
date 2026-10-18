export type StavitelnyTyp = 'lucerna' | 'prkna' | 'kamenny_blok'
export interface UmistenaStavba { id: string; typ: StavitelnyTyp; x: number; z: number; rotace?: number }
export const MAX_STAVEB = 80
export const jeVolneMisto = (stavby: readonly UmistenaStavba[], x: number, z: number): boolean =>
  Number.isFinite(x) && Number.isFinite(z) && Math.hypot(x, z) < 24 &&
  Math.hypot(x, z) > 4 && stavby.length < MAX_STAVEB &&
  stavby.every((s) => Math.hypot(s.x - x, s.z - z) >= 2.3)
export const jeVolneProPresun = (stavby: readonly UmistenaStavba[], id: string, x: number, z: number): boolean =>
  Number.isFinite(x) && Number.isFinite(z) && Math.hypot(x, z) < 24 &&
  Math.hypot(x, z) > 4 &&
  stavby.some((s) => s.id === id) &&
  stavby.every((s) => s.id === id || Math.hypot(s.x - x, s.z - z) >= 2.3)

export const presunStavbu = (stavby: readonly UmistenaStavba[], id: string, x: number, z: number, rotace?: number): UmistenaStavba[] =>
  jeVolneProPresun(stavby, id, x, z)
    ? stavby.map((s) => s.id === id ? { ...s, x, z, ...(rotace !== undefined && Number.isFinite(rotace) ? {rotace: ((rotace % (2*Math.PI))+2*Math.PI)%(2*Math.PI)} : {}) } : s)
    : [...stavby]

export const odstranStavbu = (stavby: readonly UmistenaStavba[], id: string): UmistenaStavba[] =>
  stavby.filter((s) => s.id !== id)

export const overStavby = (value: unknown): UmistenaStavba[] => {
  if (!Array.isArray(value)) return []
  const result: UmistenaStavba[] = []
  for (const s of value.slice(0, MAX_STAVEB)) {
    if (!s || typeof s !== 'object') continue
    if (!['lucerna', 'prkna', 'kamenny_blok'].includes(s.typ)) continue
    if (typeof s.id !== 'string' || s.id.length > 60 || !jeVolneMisto(result, s.x, s.z)) continue
    result.push({ id: s.id, typ: s.typ, x: s.x, z: s.z, ...(typeof s.rotace==='number'&&Number.isFinite(s.rotace)?{rotace:((s.rotace%(2*Math.PI))+2*Math.PI)%(2*Math.PI)}:{}) })
  }
  return result
}
