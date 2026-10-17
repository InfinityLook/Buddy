import { describe, expect, it } from 'vitest'
import { novySouboj, utokHrace, tikSouboje, kryjSe, lzeVyzvatStrazce, overPorazenehoStrazce } from '../../src/buddyworld/data/chramovyBoss'
import { CHRAM_POZICE } from '../../src/buddyworld/data/chramStrazcu'
describe('chrámový strážce v4.4', () => {
  it('vyžaduje dokončení zkoušky a blízkost', () => { expect(lzeVyzvatStrazce(false,false,CHRAM_POZICE)).toBe(false); expect(lzeVyzvatStrazce(true,false,CHRAM_POZICE)).toBe(true); expect(lzeVyzvatStrazce(true,true,CHRAM_POZICE)).toBe(false) })
  it('neumožní spam útoku', () => { const s=novySouboj(1000); const a=utokHrace(s,1000); expect(utokHrace(a,1200)).toEqual(a) })
  it('útok ubírá HP', () => expect(utokHrace(novySouboj(0),1000).bossHp).toBe(164))
  it('strážce útočí až po čase', () => {
    const s=novySouboj(1000)
    // tikSouboje() před dalsiUtokMs nedá žádné poškození ani nezmění fázi — appka ale
    // legitimně aktualizuje posledniTikMs/cilUderu i před útokem, protože boss se
    // má nepřetržitě pohybovat (viz komentář funkce); plná `.toEqual(s)` by to
    // (nesprávně) vyžadovala jako kompletní no-op, proto appka ověří jen skutečný slib
    // jména testu — žádné poškození, žádná změna fáze, dokud neuplyne čas na útok.
    const predUtokem = tikSouboje(s,2000)
    expect(predUtokem.hracHp).toBe(s.hracHp)
    expect(predUtokem.faze).toBe(s.faze)
    expect(tikSouboje(s,3500).hracHp).toBe(86)
  })
  it('kryt snižuje poškození', () => { const s=kryjSe(novySouboj(0),2400); expect(tikSouboje(s,2500).hracHp).toBe(96) })
  it('prohra zastaví další útoky', () => { const s={...novySouboj(0),hracHp:1}; const d=tikSouboje(s,2500); expect(d.faze).toBe('prohra'); expect(tikSouboje(d,5000)).toEqual(d) })
  it('validuje trvalý příznak', () => { expect(overPorazenehoStrazce(true)).toBe(true); expect(overPorazenehoStrazce('true')).toBe(false) })
})
