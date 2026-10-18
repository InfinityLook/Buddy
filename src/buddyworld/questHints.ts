import type {Pokrok} from './milestones'
export function dalsiNapoveda(p:Pokrok):string {if(!p.ruiny)return 'Prozkoumej Zapomenuté ruiny a vyřeš runovou hádanku.';if(p.fragmenty<3)return `Najdi zbývající fragmenty (${Math.max(0,3-p.fragmenty)}).`;if(!p.hlidac)return 'Hlídač ruin čeká: sleduj červenou oblast a uhýbej.';return 'Zkouška ruin dokončena. Pokračuj v průzkumu světa.'}
