import type {Pokrok} from './milestones'
export function shrnutiPostupu(p:Pokrok):string {const fragmenty=Math.min(3,Math.max(0,Math.floor(p.fragmenty||0)));return `Ruiny: ${p.ruiny?'vyřešeny':'nevyřešeny'} · Fragmenty: ${fragmenty}/3 · Lesní objevy: ${Math.max(0,Math.floor(p.lesniObjevy||0))} · Hlídač: ${p.hlidac?'poražen':'čeká'}`}
