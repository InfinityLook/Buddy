import { describe, it, expect } from 'vitest'
import { novyKristalovySouboj, zasahniKristalovehoStrazce, uhniKristalovemuStrazci, tikKristalovehoStrazce, lzeVyzvatKristalovehoStrazce } from '../../src/buddyworld/data/kristalovyStrazce'
describe('Krystalový strážce', () => {
  it('requires third quest and proximity', () => {
    expect(lzeVyzvatKristalovehoStrazce(false, false, {x:0,z:4})).toBe(false)
    expect(lzeVyzvatKristalovehoStrazce(true, true, {x:0,z:4})).toBe(false)
    expect(lzeVyzvatKristalovehoStrazce(true, false, {x:0,z:4})).toBe(true)
  })
  it('prevents remote melee and attack spam', () => {
    const s = novyKristalovySouboj(1000)
    expect(zasahniKristalovehoStrazce(s, 1000, {x:40,z:40})).toBe(s)
    const hit = zasahniKristalovehoStrazce(s, 1000, {x:0,z:4})
    expect(hit.bossHp).toBeLessThan(s.bossHp)
    expect(zasahniKristalovehoStrazce(hit, 1200, {x:0,z:4})).toBe(hit)
  })
  it('allows dodging a telegraphed attack', () => {
    const s = uhniKristalovemuStrazci(novyKristalovySouboj(1000), 3000)
    expect(tikKristalovehoStrazce(s, 3600, {x:0,z:4}).hracHp).toBe(s.hracHp)
  })
  it('switches attack type after half health', () => {
    let s = { ...novyKristalovySouboj(0), bossHp: 75 }
    s = tikKristalovehoStrazce(s, 2600, {x:10,z:10})
    expect(s.utok).toBe('vlna')
  })
})
