import { describe, it, expect } from 'vitest'
import { formatujNaposledyUpraveno } from '@/flagships/writer-room/writerRoomFormat'

const TED = new Date('2026-06-15T12:00:00.000Z')

describe('formatujNaposledyUpraveno', () => {
  it('dnešní úpravu popíše jako "dnes"', () => {
    expect(formatujNaposledyUpraveno('2026-06-15T08:00:00.000Z', TED)).toBe('Upraveno dnes')
  })

  it('včerejší úpravu popíše jako "včera"', () => {
    expect(formatujNaposledyUpraveno('2026-06-14T20:00:00.000Z', TED)).toBe('Upraveno včera')
  })

  it('úpravu starou 2–6 dní popíše jako "před N dny"', () => {
    expect(formatujNaposledyUpraveno('2026-06-13T12:00:00.000Z', TED)).toBe('Upraveno před 2 dny')
    expect(formatujNaposledyUpraveno('2026-06-09T12:00:00.000Z', TED)).toBe('Upraveno před 6 dny')
  })

  it('starší než týden ukáže konkrétní datum, ne "před N dny"', () => {
    const vysledek = formatujNaposledyUpraveno('2026-06-01T12:00:00.000Z', TED)
    expect(vysledek).toContain('Upraveno')
    expect(vysledek).not.toContain('před')
    expect(vysledek).toContain('1. 6.')
  })

  it('jiný rok přidá do data i rok', () => {
    const vysledek = formatujNaposledyUpraveno('2025-01-15T12:00:00.000Z', TED)
    expect(vysledek).toContain('2025')
  })
})
