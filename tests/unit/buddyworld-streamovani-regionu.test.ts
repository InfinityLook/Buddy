import { describe, expect, it } from 'vitest'
import { regionyVDosahu } from '../../src/buddyworld/scene/streamovaniRegionu'

describe('streamování regionů', () => {
  it('načte startovní vesnici', () => {
    expect(regionyVDosahu({ x: 0, z: 13 }, new Set())).toContain('vesnice')
  })
  it('vzdálené oblasti nejsou načtené', () => {
    expect(regionyVDosahu({ x: 0, z: 24 }, new Set())).not.toContain('stiny-lesa')
  })
  it('hystereze brání blikání při překročení hranice', () => {
    const pozice = { x: 0, z: 13 + 8.5 + 16 }
    expect(regionyVDosahu(pozice, new Set())).not.toContain('vesnice')
    expect(regionyVDosahu(pozice, new Set(['vesnice']))).toContain('vesnice')
  })
})
