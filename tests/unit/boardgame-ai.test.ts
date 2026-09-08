import { describe, it, expect } from 'vitest'
import { melByBotKoupit, pripravSmerBota } from '@/boardgame/ai'
import { vytvorHrace, vytvorTrhStav } from '@/boardgame/engine'
import { OBCHODY_PODLE_KLICE } from '@/boardgame/obchody'

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

describe('melByBotKoupit (Fáze 1)', () => {
  const pekarna = OBCHODY_PODLE_KLICE['1,1'] // cena 150

  it('koupí, pokud mu po zaplacení zbyde dost rezervy', () => {
    const bot = { ...vytvorHrace('bot', 'Bot', 'gros', true, { x: 0, z: 1 }), penize: 1000 }
    expect(melByBotKoupit(bot, pekarna)).toBe(true)
  })

  it('nekoupí, pokud by po zaplacení klesl pod rezervu', () => {
    const bot = { ...vytvorHrace('bot', 'Bot', 'gros', true, { x: 0, z: 1 }), penize: 200 }
    expect(melByBotKoupit(bot, pekarna)).toBe(false)
  })
})
