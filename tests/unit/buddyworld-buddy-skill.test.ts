import { describe, expect, it } from 'vitest'
import { buddySkillPripraven, buddySkillPoskozeniProLevel, buddySkillZasah } from '@/buddyworld/combat/buddySkills'

describe('Buddyho bojová schopnost', () => {
  it('škáluje poškození podle levelu', () => {
    expect(buddySkillPoskozeniProLevel(1)).toBe(18)
    expect(buddySkillPoskozeniProLevel(5)).toBe(26)
    expect(buddySkillPoskozeniProLevel(60)).toBe(136)
  })
  it('odmítne neplatné a extrémní levely', () => {
    expect(buddySkillPoskozeniProLevel(NaN)).toBe(18)
    expect(buddySkillPoskozeniProLevel(1000000)).toBe(136)
  })
  it('nezasáhne mimo dosah ani během cooldownu', () => {
    expect(buddySkillPripraven(12000, 1000, 2, true)).toBe(false)
    // appčin výchozí maskotId je 'ember' (BUDDY_ELEMENTY.ember.cooldownMs
    // = 14000) — tenhle test dřív počítal se starým plošným appčiným
    // BUDDY_SKILL_COOLDOWN_MS = 12000, co appka v scene/useBuddyWorldScene.ts
    // ani jinde v src/ doopravdy nepoužívá (ověřeno grepem), jen
    // buddySkillCooldown(maskotId) z téhle tabulky — appka tím ověřuje
    // skutečné, dnes platné chování, ne zastaralé.
    expect(buddySkillPripraven(15000, 1000, 6, true)).toBe(false)
    expect(buddySkillPripraven(15000, 1000, 2, true)).toBe(true)
  })
  it('udělí škálované poškození a neútočí na mrtvý cíl', () => {
    const cil = { hp: 24, faze: 'klid', respawnOdMs: -Infinity }
    const zasah = buddySkillZasah(cil, 20000, 5)
    expect(zasah.porazen).toBe(true)
    expect(zasah.cil.hp).toBe(0)
    expect(zasah.cil.respawnOdMs).toBe(28000)
    expect(buddySkillZasah(zasah.cil, 20001, 5).porazen).toBe(false)
    expect(cil.hp).toBe(24)
  })
})
