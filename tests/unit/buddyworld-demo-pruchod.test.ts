import { describe, it, expect } from 'vitest'
import { novaKristalovaVyprava, zpracujVypravu } from '../../src/buddyworld/kristalovaVyprava'
import { krokyPrvniVypravy, dalsiDemoKrok } from '../../src/buddyworld/demoPruchod'

describe('první hratelná smyčka – průvodce', () => {
 it('starts with accepting quest', () => {
   const stav = novaKristalovaVyprava()
   expect(dalsiDemoKrok(stav)?.id).toBe('start')
   expect(krokyPrvniVypravy(stav).filter(k => k.splneno)).toHaveLength(0)
 })
 it('tracks collection and combat using actual quest state', () => {
   let s = zpracujVypravu(novaKristalovaVyprava(), {type:'zahajit'})
   expect(dalsiDemoKrok(s)?.id).toBe('shards')
   for (let i=1;i<=3;i++) s=zpracujVypravu(s,{type:'sebrat_ulomek',id:`shard-${i}`,region:'kristalova_mytina'})
   expect(dalsiDemoKrok(s)?.id).toBe('combat')
   for (let i=1;i<=2;i++) s=zpracujVypravu(s,{type:'porazit_nepritele',id:`enemy-${i}`,region:'kristalova_mytina'})
   expect(dalsiDemoKrok(s)?.id).toBe('reward')
   s=zpracujVypravu(s,{type:'prevzit_odmenu',region:'buddy_vesnice'})
   expect(dalsiDemoKrok(s)).toBeNull()
   expect(krokyPrvniVypravy(s).every(k=>k.splneno)).toBe(true)
 })
 it('does not count duplicate shards or kills', () => {
   let s=zpracujVypravu(novaKristalovaVyprava(),{type:'zahajit'})
   s=zpracujVypravu(s,{type:'sebrat_ulomek',id:'a',region:'kristalova_mytina'})
   s=zpracujVypravu(s,{type:'sebrat_ulomek',id:'a',region:'kristalova_mytina'})
   expect(dalsiDemoKrok(s)?.id).toBe('shards')
   expect(krokyPrvniVypravy(s)[1].pokyn).toContain('1/3')
 })
})
