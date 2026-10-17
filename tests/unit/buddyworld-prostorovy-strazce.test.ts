import { describe, expect, it } from 'vitest'
import { ARENA_STRAZCE_POZICE as p, vzdalenostOdAreny, novySouboj, utokHrace, tikSouboje, uhni, lzeVyzvatStrazce } from '../../src/buddyworld/data/chramovyBoss'

describe('chrámový strážce – prostorový boj v4.6', () => {
  it('vzdálenost od středu arény je nulová', () => expect(vzdalenostOdAreny(p)).toBe(0))
  it('výzva se aktivuje u skutečného modelu', () => expect(lzeVyzvatStrazce(true, false, p)).toBe(true))
  it('útok z dálky nepoškodí strážce', () => { const s=novySouboj(0); expect(utokHrace(s,1000,{x:p.x+10,z:p.z})).toEqual(s) })
  it('útok zblízka strážce poškodí', () => expect(utokHrace(novySouboj(0),1000,p).bossHp).toBe(164))
  it('ústup z dosahu zabrání poškození', () => expect(tikSouboje(novySouboj(0),2500,{x:p.x+10,z:p.z}).hracHp).toBe(100))
  it('úhyb zabrání zásahu v aktivním okně', () => expect(tikSouboje(uhni(novySouboj(0),2200),2500,p).hracHp).toBe(100))
  it('úhyb má cooldown', () => { const s=uhni(novySouboj(0),1000); expect(uhni(s,1100)).toEqual(s) })
  it('po úhybu opět hrozí zásah', () => expect(tikSouboje(uhni(novySouboj(0),1000),2500,p).hracHp).toBe(86))
})
