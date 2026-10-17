import { describe, it, expect } from 'vitest'
import { CHRAM_POZICE, CHRAM_DOSAH, lzeProzkoumatChram, overDokoncenyChram, vzdalenostOdChramu } from '../../src/buddyworld/data/chramStrazcu'
import { TRI_PECETE_ID } from '../../src/buddyworld/data/triPecete'
describe('Starý chrám strážců', () => {
  it('počítá vzdálenost od oltáře', () => expect(vzdalenostOdChramu(CHRAM_POZICE)).toBe(0))
  it('vyžaduje dokončené pečetě', () => expect(lzeProzkoumatChram([], false, CHRAM_POZICE)).toBe(false))
  it('vyžaduje blízkost hráče', () => expect(lzeProzkoumatChram([TRI_PECETE_ID], false, { x: CHRAM_POZICE.x + CHRAM_DOSAH + 1, z: CHRAM_POZICE.z })).toBe(false))
  it('lze prozkoumat pouze jednou', () => expect(lzeProzkoumatChram([TRI_PECETE_ID], true, CHRAM_POZICE)).toBe(false))
  it('povolí první interakci', () => expect(lzeProzkoumatChram([TRI_PECETE_ID], false, CHRAM_POZICE)).toBe(true))
  it('bezpečně ověřuje uložený stav', () => { expect(overDokoncenyChram(true)).toBe(true); expect(overDokoncenyChram('true')).toBe(false) })
})
