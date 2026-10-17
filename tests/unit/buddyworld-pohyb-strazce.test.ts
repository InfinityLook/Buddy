import { describe, it, expect } from 'vitest'
import { novySouboj, tikSouboje, utokHrace, posunStrazce, ARENA_STRAZCE_POZICE, vzdalenostOdStrazce } from '../../src/buddyworld/data/chramovyBoss'
describe('Chrámový strážce – pohyb v aréně', () => {
  it('nepřekročí povolený krok', () => {
    const p = posunStrazce(ARENA_STRAZCE_POZICE, {x: ARENA_STRAZCE_POZICE.x + 5, z: ARENA_STRAZCE_POZICE.z}, .2)
    expect(p.x - ARENA_STRAZCE_POZICE.x).toBeCloseTo(.33)
  })
  it('zůstává uvnitř arény', () => {
    let p = ARENA_STRAZCE_POZICE
    for (let i=0;i<100;i++) p = posunStrazce(p, {x: p.x+100,z:p.z}, .25)
    expect(p.x - ARENA_STRAZCE_POZICE.x).toBeLessThanOrEqual(3)
  })
  it('pronásleduje hráče před varováním', () => {
    const s = tikSouboje(novySouboj(1000), 1150, {x: ARENA_STRAZCE_POZICE.x+2,z:ARENA_STRAZCE_POZICE.z})
    expect(s.bossPozice!.x).toBeGreaterThan(ARENA_STRAZCE_POZICE.x)
  })
  it('zamkne místo útoku a při varování stojí', () => {
    const p = {x: ARENA_STRAZCE_POZICE.x+2,z:ARENA_STRAZCE_POZICE.z}
    const s = tikSouboje(novySouboj(1000), 3000, p)
    const n = tikSouboje(s, 3100, {x:p.x+3,z:p.z})
    expect(n.bossPozice).toEqual(s.bossPozice)
    expect(n.cilUderu).toEqual(s.cilUderu)
  })
  it('hráč může uniknout ze zamčené oblasti', () => {
    const p = {x: ARENA_STRAZCE_POZICE.x+2,z:ARENA_STRAZCE_POZICE.z}
    const s = tikSouboje(novySouboj(1000), 3000, p)
    const n = tikSouboje(s, 3500, {x:p.x+10,z:p.z})
    expect(n.hracHp).toBe(100)
  })
  it('útok vyžaduje dosah od pohybujícího se bosse', () => {
    const s = {...novySouboj(1000), bossPozice: {x: ARENA_STRAZCE_POZICE.x+3,z: ARENA_STRAZCE_POZICE.z}}
    const p = {x: ARENA_STRAZCE_POZICE.x-3,z:ARENA_STRAZCE_POZICE.z}
    expect(vzdalenostOdStrazce(p,s)).toBe(6)
    expect(utokHrace(s,2000,p)).toBe(s)
  })
})
