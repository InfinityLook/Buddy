import { describe, expect, it } from 'vitest'
import { jsouPeceteAktivni, lzeProbuditStrazce, overUdalostiPeceti, TRI_PECETE_ID } from '../../src/buddyworld/data/triPecete'
import { RELIKVIE } from '../../src/buddyworld/data/relikvie'
const vsechny = RELIKVIE.map(r => r.id)
describe('událost tří pečetí', () => {
  it('vyžaduje všechny tři relikvie', () => {
    expect(jsouPeceteAktivni(vsechny.slice(0, 2))).toBe(false)
    expect(jsouPeceteAktivni(vsechny)).toBe(true)
  })
  it('umožní událost právě jednou', () => {
    expect(lzeProbuditStrazce(vsechny, [])).toBe(true)
    expect(lzeProbuditStrazce(vsechny, [TRI_PECETE_ID])).toBe(false)
  })
  it('validuje staré a poškozené uložené hodnoty', () => {
    expect(overUdalostiPeceti(null)).toEqual([])
    expect(overUdalostiPeceti(['neznama', TRI_PECETE_ID, TRI_PECETE_ID])).toEqual([TRI_PECETE_ID])
  })
})
