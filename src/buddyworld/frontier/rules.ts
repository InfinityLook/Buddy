import type {Position} from './store'
export const distance=(a:Position,b:Position)=>Math.hypot(a.x-b.x,a.z-b.z)
export function advanceSequence(progress:number,index:number,order:readonly number[]){return index===order[progress]?progress+1:index===order[0]?1:0}
export function puzzleSolved(values:readonly number[],target:readonly number[]){return values.length===target.length&&values.every((v,i)=>v===target[i])}
export function withinWorld(p:Position,dungeon=false){return Math.abs(p.x)<(dungeon?16:33)&&p.z<(dungeon?15:33)&&p.z>-31}
export function blocked(p:Position,boxes:readonly {x:number;z:number;w:number;d:number}[]){return boxes.some(b=>Math.abs(p.x-b.x)<b.w/2+.3&&Math.abs(p.z-b.z)<b.d/2+.3)}
export function shieldDamage(base:number,front:boolean,exposed:boolean){return Math.max(1,Math.round(base*(front&&!exposed?.3:1)))}
export function incomingDamage(base:number,armor:number,storyMode:boolean,shield:boolean){return Math.max(1,Math.round((base-armor*.7)*(storyMode?.55:1)*(shield?.3:1)))}
