import { describe, it, expect } from 'vitest'
import { novySouboj, tikSouboje, polomerUderu, POLOMER_ENERGETICKE_VLNY, ARENA_STRAZCE_POZICE, type StavSouboje } from '@/buddyworld/data/chramovyBoss'

describe('v4.9 energetická vlna strážce', () => {
  it('začíná základním úderem', () => { expect(novySouboj(0).typUderu).toBe('uder') })
  it('ve druhé fázi střídá typy úderů', () => {
    let s: StavSouboje = { ...novySouboj(0), bossHp: 70 }
    s = tikSouboje(s, 2500, { x: 100, z: 100 })
    expect(s.typUderu).toBe('uder')
    s = tikSouboje(s, 4200, { x: 100, z: 100 })
    expect(s.typUderu).toBe('vlna')
    expect(polomerUderu(s)).toBe(POLOMER_ENERGETICKE_VLNY)
  })
  it('energetická vlna zasáhne na větší vzdálenost', () => {
    const s = { ...novySouboj(0), typUderu: 'vlna' as const, dalsiUtokMs: 1000, cilUderu: ARENA_STRAZCE_POZICE }
    const p = { x: ARENA_STRAZCE_POZICE.x + 4, z: ARENA_STRAZCE_POZICE.z }
    expect(tikSouboje(s, 1000, p).hracHp).toBeLessThan(s.hracHp)
  })
  it('úhyb stále chrání před vlnou', () => {
    const s = { ...novySouboj(0), typUderu: 'vlna' as const, dalsiUtokMs: 1000, uhybDoMs: 1100 }
    expect(tikSouboje(s, 1000, ARENA_STRAZCE_POZICE).hracHp).toBe(s.hracHp)
  })
})
