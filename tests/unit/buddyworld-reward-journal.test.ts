import { describe, it, expect } from 'vitest'
import { rezervujOdmenu, dokonceniOdmeny, stavOdmeny } from '../../src/buddyworld/rewardJournal'
const make = () => {
 const m = new Map<string,string>()
 return { getItem: (k:string) => m.get(k) ?? null, setItem: (k:string,v:string) => { m.set(k,v) } }
}
describe('reward journal', () => {
 it('reserves once and finishes', () => { const s=make(); expect(rezervujOdmenu(s,'r')).toBe(true); expect(rezervujOdmenu(s,'r')).toBe(false); expect(stavOdmeny(s,'r')).toBe('rezervovano'); expect(dokonceniOdmeny(s,'r')).toBe(true); expect(stavOdmeny(s,'r')).toBe('dokonceno') })
 it('does not replay pending rewards after restart', () => { const s=make(); s.setItem('r','pending:v1'); expect(rezervujOdmenu(s,'r')).toBe(false) })
 it('recognizes legacy markers', () => { const s=make(); s.setItem('r','claimed'); expect(stavOdmeny(s,'r')).toBe('dokonceno'); expect(rezervujOdmenu(s,'r')).toBe(false) })
 it('fails closed on denied writes', () => { const s={getItem:()=>null,setItem:()=>{throw Error('quota')}}; expect(rezervujOdmenu(s,'r')).toBe(false) })
 it('rejects unknown markers', () => { const s=make(); s.setItem('r','corrupt'); expect(stavOdmeny(s,'r')).toBe('neznamy'); expect(rezervujOdmenu(s,'r')).toBe(false) })
})
