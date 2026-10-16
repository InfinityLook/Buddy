import { describe, expect, it } from 'vitest'
import { buddyElementPoskozeni, buddySkillCooldown, buddySkillPripraven, buddySkillZasah } from '@/buddyworld/combat/buddySkills'
describe('Čtyři maskoti v souboji', () => {
  it('mají rozdílné poškození', () => {
    expect(buddyElementPoskozeni(10, 'nyx')).toBeGreaterThan(buddyElementPoskozeni(10, 'ember'))
    expect(buddyElementPoskozeni(10, 'ember')).toBeGreaterThan(buddyElementPoskozeni(10, 'moss'))
  })
  it('mají různé cooldowny', () => {
    expect(buddySkillCooldown('moss')).toBeLessThan(buddySkillCooldown('nyx'))
    expect(buddySkillPripraven(10000, 0, 2, true, 'moss')).toBe(true)
    expect(buddySkillPripraven(10000, 0, 2, true, 'nyx')).toBe(false)
  })
  it('neznámý maskot bezpečně použije výchozí profil', () => {
    expect(buddyElementPoskozeni(5, 'invalid')).toBe(buddyElementPoskozeni(5, 'ember'))
  })
  it('neútočí na mrtvé cíle', () => {
    const mrtvy = { hp: 0, faze: 'mrtvy', respawnOdMs: 100 }
    expect(buddySkillZasah(mrtvy, 20000, 10, 'frost').porazen).toBe(false)
  })
})
