import { describe, it, expect } from 'vitest'
import { novySouboj, stavVarovani, zbyvaDoUtoku, tikSouboje, DOSAH_BOSS_UTOKU, ARENA_STRAZCE_POZICE } from '../../src/buddyworld/data/chramovyBoss'

describe('Chrámový strážce – varování v4.7', () => {
  it('nevaruje hned po zahájení', () => { const s = novySouboj(10000); expect(stavVarovani(s, 10000)).toBe(false) })
  it('varuje 900 ms před úderem', () => { const s = novySouboj(10000); expect(stavVarovani(s, 11500)).toBe(false); expect(stavVarovani(s, 11600)).toBe(true) })
  it('nevaruje po termínu úderu', () => { const s = novySouboj(10000); expect(stavVarovani(s, 12500)).toBe(false) })
  it('odpočet je nezáporný', () => { const s = novySouboj(0); expect(zbyvaDoUtoku(s, 5000)).toBe(0) })
  it('úder mine hráče mimo červený kruh', () => { const s = novySouboj(0); const dalsi = tikSouboje(s, 2500, { x: ARENA_STRAZCE_POZICE.x + DOSAH_BOSS_UTOKU + 1, z: ARENA_STRAZCE_POZICE.z }); expect(dalsi.hracHp).toBe(s.hracHp) })
  it('úder zasáhne hráče uvnitř kruhu', () => { const s = novySouboj(0); const dalsi = tikSouboje(s, 2500, ARENA_STRAZCE_POZICE); expect(dalsi.hracHp).toBeLessThan(s.hracHp) })
})
