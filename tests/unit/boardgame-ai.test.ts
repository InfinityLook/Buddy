import { describe, it, expect } from 'vitest'
import { pripravSmerBota } from '@/boardgame/ai'
import { vytvorHrace, vytvorTrhStav } from '@/boardgame/engine'

describe('pripravSmerBota', () => {
  it('v rohu mřížky vybere jen z platných směrů', () => {
    const bot = vytvorHrace('bot', 'Bot', 'gros', true, { x: 0, z: 0 })
    const stav = vytvorTrhStav([bot])
    for (const nahodne of [0, 0.3, 0.7, 0.999]) {
      const smer = pripravSmerBota(bot, stav, () => nahodne)
      expect(['dolu', 'vpravo']).toContain(smer)
    }
  })

  it('je deterministický pro stejnou injektovanou náhodu', () => {
    const bot = vytvorHrace('bot', 'Bot', 'gros', true, { x: 3, z: 3 })
    const stav = vytvorTrhStav([bot])
    const a = pripravSmerBota(bot, stav, () => 0.4)
    const b = pripravSmerBota(bot, stav, () => 0.4)
    expect(a).toBe(b)
  })
})
