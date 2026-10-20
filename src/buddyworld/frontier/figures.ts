import * as T from 'three'
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js'
import type {Species} from './content'
import {createSoftShadow} from '../scene/characters'
const material=(color:string|number)=>new T.MeshStandardMaterial({color,roughness:.94,flatShading:false})
function part(g:T.Object3D,geometry:T.BufferGeometry,color:string|number,x:number,y:number,z:number,sx=1,sy=1,sz=1){const m=new T.Mesh(geometry,material(color));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=m.receiveShadow=true;g.add(m);return m}
function mergeParts(g:T.Group,exclude?:T.Object3D){g.updateMatrixWorld(true);const buckets=new Map<string,{geos:T.BufferGeometry[];material:T.Material}>();for(const o of [...g.children]){if(o===exclude||!(o instanceof T.Mesh)||!(o.material instanceof T.MeshStandardMaterial))continue;let geo=o.geometry.clone().applyMatrix4(o.matrix);geo.deleteAttribute('uv');if(geo.index)geo=geo.toNonIndexed();const key=o.material.color.getHexString();if(!buckets.has(key))buckets.set(key,{geos:[],material:o.material});buckets.get(key)!.geos.push(geo);g.remove(o);o.geometry.dispose();}for(const b of buckets.values()){const geo=mergeGeometries(b.geos);if(geo){const combined=new T.Mesh(geo,b.material);combined.castShadow=combined.receiveShadow=true;g.add(combined);}b.geos.forEach(x=>x.dispose())}}
/** Original v46 fox companions, with animated fluffy tail and individual elemental details. */
export function createCompanion(id:string){
 const colors:Record<string,string>={ember:'#d98335',moss:'#83a45c',nyx:'#87719f',frost:'#83becb'},c=colors[id]??colors.ember,g=new T.Group(),cream='#f4dfb5';
 const fur=(r:number,color:string,x:number,y:number,z:number,sx=1,sy=1,sz=1)=>part(g,new T.SphereGeometry(r,14,10),color,x,y,z,sx,sy,sz);
 fur(.39,c,0,.52,-.05,1,.95,1.35);fur(.29,cream,0,.49,.24,.85,.95,.6);
 const head=fur(.36,c,0,.96,.38,1.08,.93,.92);
 for(const side of[-1,1]){
  const ear=part(g,new T.ConeGeometry(.16,.43,5),c,side*.23,1.30,.31);ear.rotation.z=-side*.22;
  const inner=part(g,new T.ConeGeometry(.092,.27,5),'#d9ae88',side*.23,1.32,.36);inner.rotation.z=-side*.22;
  fur(.20,cream,side*.17,.85,.58,1.15,.65,.7);
  fur(.070,'#273a33',side*.13,1.00,.68,.8,1.1,.4);
  fur(.018,'#fff5da',side*.13-.012,1.024,.705);
  const brow=part(g,new T.CapsuleGeometry(.017,.10,2,6),cream,side*.15,1.105,.65);brow.rotation.z=side*.15+Math.PI/2;
 }
 fur(.085,cream,0,.86,.69,1.1,.7,1);fur(.045,'#2c3932',0,.90,.756,1,.7,.6);
 for(const x of[-.20,.20])for(const z of[-.29,.24]){part(g,new T.CapsuleGeometry(.065,.18,3,8),c,x,.20,z);fur(.085,cream,x,.095,z+.035,1,.7,1.15)}
 const tail=new T.Group();tail.position.set(0,.59,-.43);g.add(tail);
 const tuft=(r:number,color:string,x:number,y:number,z:number,sx:number,sy:number,sz:number)=>part(tail,new T.SphereGeometry(r,12,8),color,x,y,z,sx,sy,sz);
 tuft(.25,c,0,.10,-.20,1,.9,1.6);tuft(.26,c,.12,.29,-.47,1.15,1.1,1.4);tuft(.23,cream,.23,.46,-.66,1.05,1.15,1.2);
 if(id==='moss')for(const x of[-.18,.18]){const leaf=fur(.10,'#bfce75',x,1.24,.25,.5,1.5,.25);leaf.rotation.z=x>0?-.4:.4}
 if(id==='nyx')part(g,new T.OctahedronGeometry(.075),'#e2d4aa',0,1.14,.69);
 if(id==='frost')for(const x of[-.09,0,.09])part(g,new T.OctahedronGeometry(.07),'#d9eee4',x,1.26,.32);
 mergeParts(g,tail);mergeParts(tail);g.add(createSoftShadow(.56,.25));void head;
 return {group:g,tail}
}
/** v47: complete original bestiary. Silhouettes distinguish species and bosses,
 * not only their colors. AI / hit boxes remain in the existing game system. */
export function createMonster(s:Species){
 const g=new T.Group(),c=s.color,cream='#eee0ba',dark='#34423d',gold='#d6b57b';
 const ball=(r:number,col:string,x:number,y:number,z:number,sx=1,sy=1,sz=1)=>part(g,new T.SphereGeometry(r,12,8),col,x,y,z,sx,sy,sz);
 const rod=(col:string,a:T.Vector3,b:T.Vector3,r=.06)=>{const v=b.clone().sub(a),p=a.clone().add(b).multiplyScalar(.5),m=part(g,new T.CylinderGeometry(r*.75,r,v.length(),7),col,p.x,p.y,p.z);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return m;};
 const eyes=(y:number,z:number,span=.14,col=cream)=>{for(const x of[-span,span]){ball(.065,dark,x,y,z,.8,1,.5);ball(.026,col,x-.014,y+.018,z+.035);}};
 const crystal=(x:number,y:number,z:number,r=.15,col='#9cddd1')=>part(g,new T.OctahedronGeometry(r),col,x,y,z,1,1.6,1);
 const leaf=(x:number,y:number,z:number,r=.17)=>{const m=ball(r,'#9ab86a',x,y,z,.55,1.6,.3);m.rotation.z=x>0?-.6:.6;};
 if(s.id==='pijavice'){
  for(let i=0;i<5;i++)ball(.32-i*.025,c,0,.28+Math.sin(i*.6)*.06,.6-i*.32,1,.8,1.15);
  const mouth=part(g,new T.TorusGeometry(.23,.075,7,16),cream,0,.3,.89);mouth.rotation.x=.1;
  for(let i=0;i<5;i++)crystal(Math.sin(i*1.25)*.17,.3+Math.cos(i*1.25)*.17,.95,.035,cream);eyes(.48,.87,.16);
 }else if(s.shape==='wolf'){
  ball(.44,c,0,.66,-.12,.85,.9,1.65);ball(.35,c,0,.98,.52,.9,1,.95);ball(.22,cream,0,.83,.82,.78,.7,1.15);ball(.07,dark,0,.9,1.02);
  for(const x of[-.22,.22]){part(g,new T.ConeGeometry(.14,.4,7),c,x,1.3,.43).rotation.z=-x;ball(.09,cream,x,1.32,.47,.7,1.2,.25);for(const z of[-.5,.35]){part(g,new T.CapsuleGeometry(.075,.35,3,8),c,x,.3,z);ball(.11,cream,x,.09,z+.055,1,.65,1.3);}}
  rod(c,new T.Vector3(0,.7,-.65),new T.Vector3(.2,1,-1.1),.14);ball(.16,cream,.2,1,-1.12);eyes(1.04,.82);
  for(let i=0;i<4;i++){const x=(i%2?1:-1)*.25;crystal(x,.94+i*.035,-.45+i*.21,.10,s.id==='mini-lovec'?'#ccb6dc':'#8eae71');}
  if(s.id==='mini-lovec'){for(const x of[-.3,.3])rod(gold,new T.Vector3(x,1.2,.43),new T.Vector3(x*1.5,1.65,.25),.035);}
 }else if(s.shape==='slime'){
  ball(.62,c,0,.43,0,1,.7,1);ball(.25,c,-.25,.64,-.15,.9,1.5,.9);for(const x of[-.4,.4])ball(.18,c,x,.13,.26,1,.6,1.1);eyes(.55,.54,.17);ball(.11,'#e5edce',-.22,.72,.25,1,.3,.65);
  if(s.id==='bahnak'){for(let i=0;i<4;i++)leaf(Math.sin(i*2)*.25,.88,Math.cos(i*2)*.2,.13);}else{leaf(-.07,1.04,-.1,.12);leaf(.09,1.02,-.1,.10);}
 }else if(s.shape==='insect'){
  const spider=s.id==='pavouk',crab=s.id==='krab',scorpion=s.id==='skorpion',count=spider?8:6;
  ball(.50,c,0,.47,-.12,crab?1.4:1,.68,spider?1.4:1.1);ball(.26,c,0,.46,.45,1,.8,.9);
  for(let i=0;i<count;i++){const side=i%2?-1:1,z=-.5+Math.floor(i/2)*.35;rod(dark,new T.Vector3(side*.3,.45,z),new T.Vector3(side*.73,.35,z+.1),.035);rod(c,new T.Vector3(side*.73,.35,z+.1),new T.Vector3(side*.92,.05,z+.28),.045);}
  if(crab||scorpion)for(const side of[-1,1]){rod(c,new T.Vector3(side*.35,.45,.4),new T.Vector3(side*.8,.55,.8),.08);ball(.21,c,side*.82,.57,.86,1,.7,1.4);for(const dx of[-.10,.10])rod(cream,new T.Vector3(side*.82+dx,.57,.88),new T.Vector3(side*.82+dx*.5,.57,1.17),.045);}
  if(scorpion){for(let i=0;i<5;i++)ball(.14-i*.012,c,0,.55+i*.15,-.55-Math.sin(i*.42)*.5);crystal(0,1.25,-.9,.12,gold);}
  if(!spider&&!crab&&!scorpion){part(g,new T.ConeGeometry(.12,.5,7),gold,0,.9,.4).rotation.x=.45;for(const x of[-.18,.18])rod(gold,new T.Vector3(x,.5,-.5),new T.Vector3(x,.82,.1),.025);}
  eyes(.57,.68,crab?.23:.13);if(spider)for(const x of[-.055,.055])ball(.035,'#b6dfd0',x,.66,.67);
 }else if(s.shape==='wisp'){
  if(s.id==='mura'){
   ball(.22,cream,0,1,0,.7,1.5,1);for(const side of[-1,1]){ball(.4,c,side*.43,1.16,-.06,1.4,.85,.18);ball(.27,'#d6c1db',side*.37,.77,-.01,1.2,.9,.2);ball(.14,gold,side*.51,1.16,.03,1,1,.22);rod(dark,new T.Vector3(side*.09,1.23,.08),new T.Vector3(side*.22,1.54,.15),.015);}eyes(1.12,.18,.08);
  }else if(s.id==='lecitel'){
   ball(.28,c,0,.98,0);for(const side of[-1,1]){leaf(side*.28,1.05,.05,.24);leaf(side*.18,.65,0,.20);}part(g,new T.ConeGeometry(.35,.55,12),'#719570',0,.63,0).rotation.z=Math.PI;for(let i=0;i<5;i++)ball(.15,'#e6dcae',Math.sin(i*1.26)*.2,1.25,Math.cos(i*1.26)*.15,1,.4,1);eyes(1.04,.25,.10);
  }else{
   ball(.31,c,0,1.12,0,1,1.15,1);part(g,new T.ConeGeometry(.36,.65,12),c,0,.75,0);for(const side of[-1,1])ball(.21,c,side*.33,1.02,0,1.2,.45,.65);eyes(1.18,.28,.11);crystal(0,1.58,0,.10,gold);
   const halo=part(g,new T.TorusGeometry(.42,.025,6,24),gold,0,1.13,0);halo.rotation.x=Math.PI/2;
  }
 }else{
  const root=s.id==='korenovec'||s.id==='boss-koreny',water=s.id==='boss-voda'||s.id==='mini-breh',caster=s.behaviour==='healer'||s.behaviour==='summoner'||s.id==='boss-archiv';
  ball(.55,c,0,1,0,1,.95,.65);ball(.33,c,0,1.75,0,1,1,.9);for(const side of[-1,1]){
   part(g,new T.CapsuleGeometry(.12,.36,3,8),dark,side*.27,.3,0);ball(.2,c,side*.27,.14,.12,1,.65,1.5);ball(.25,c,side*.57,1.36,0,1.2,1,.9);part(g,new T.CapsuleGeometry(.12,.43,3,8),c,side*.67,.93,.02);ball(.16,dark,side*.67,.61,.07);
  }
  if(caster){part(g,new T.ConeGeometry(.64,1.2,12),c,0,.6,0);for(const side of[-1,1])rod(gold,new T.Vector3(side*.27,1.4,.34),new T.Vector3(side*.4,.12,.25),.025);rod('#84674c',new T.Vector3(.82,.05,.1),new T.Vector3(.82,1.9,.1),.035);crystal(.82,1.98,.1,.18);}
  if(root){for(const side of[-1,1]){rod('#856c48',new T.Vector3(side*.2,1.92,0),new T.Vector3(side*.45,2.4,-.06),.06);rod('#856c48',new T.Vector3(side*.38,2.26,-.04),new T.Vector3(side*.65,2.35,0),.035);leaf(side*.53,2.35,0,.15);for(let i=0;i<3;i++)leaf(side*.6,1.4+i*.12,-.05,.12);}for(let i=0;i<3;i++)rod('#89714e',new T.Vector3((i-1)*.24,.55,.34),new T.Vector3((i-1)*.18,1.3,.35),.045);}
  if(water){for(const side of[-1,1]){part(g,new T.CylinderGeometry(.18,.22,.55,10),'#c9b17b',side*.48,1.6,-.1);const r=part(g,new T.TorusGeometry(.28,.07,6,18),gold,side*.63,1.14,.12);r.rotation.y=Math.PI/2;}part(g,new T.TorusGeometry(.28,.06,6,24),gold,0,1.13,.37);crystal(0,1.12,.42,.2,'#b2ece0');}
  else crystal(0,1.15,.36,.18,s.id==='boss-final'?'#f5d295':'#98d6bf');
  if(!root){ball(.28,dark,0,1.76,.14,1,.62,.75);for(const x of[-.13,.13]){part(g,new T.ConeGeometry(.08,.36,5),gold,x,2.05,0).rotation.z=-x*1.5;}part(g,new T.BoxGeometry(.38,.055,.08),gold,0,1.8,.36);}
  if(s.behaviour==='shield'&&!root){const shield=ball(.38,'#d6bd87',-.69,1,.32,1,1.25,.25);void shield;crystal(-.69,1,.43,.13,c);}
  if(s.id==='boss-archiv'){ball(.24,'#eadfc5',0,1.76,.29,.7,1,.22);for(const side of[-1,1]){part(g,new T.BoxGeometry(.34,.47,.12),side<0?'#9d7eac':'#d2bb86',side*.98,1.5,.1).rotation.z=-side*.25;}}
  if(s.id==='boss-final'||s.id==='mini-kamen')for(let i=0;i<5;i++)crystal((i-2)*.21,2.14+Math.sin(i/4*Math.PI)*.25,-.1,.12,s.id==='mini-kamen'?'#dfbe83':'#f1d899');
  eyes(1.83,root?.28:.38,.12,root?'#e9e8ad':'#a9e2d7');
 }
 mergeParts(g);g.add(createSoftShadow(s.shape==='wolf'?.7:.6,.3));g.name='BuddyWorld_v47_'+s.id;g.userData.species=s.id;
 if(s.boss)g.scale.setScalar(1.8);return g;
}
