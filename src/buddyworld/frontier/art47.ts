/** Original, code-built v47 environment. Uses the documented v46 painted atlas.
 * Every current frontier scenery ID has a new runtime model; no downloaded art. */
import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {createArt46} from './art46';
import type {RegionId} from './content';

export const SCENERY47 = ['chata','dilna','dub','briza','jedle','studna','lucerna','zahonek','stanek','trava','kvetiny','ker','lavicka','bedna','sud','brana','mustek','kamen-velky','kamen-maly','kmen','parez','houby','runovy-kamen','krystaly','koreneny-oblouk','rozcestnik','plot','roh-plotu'] as const;
export function createArt47(){
 const base=createArt46(),geos=new Set<T.BufferGeometry>(),mats=new Set<T.Material>(),templates=new Map<string,T.Group>();
 const material=base.material;
 function put(g:T.Object3D,geo:T.BufferGeometry,c:string,x=0,y=0,z=0,sx=1,sy=1,sz=1,kind?:'wood'|'stone'|'roof'){
  const m=new T.Mesh(geo,material(c,kind));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=m.receiveShadow=true;g.add(m);geos.add(geo);return m;
 }
 const orb=(g:T.Object3D,c:string,r:number,x:number,y:number,z:number,sx=1,sy=1,sz=1)=>put(g,new T.SphereGeometry(r,12,8),c,x,y,z,sx,sy,sz);
 const block=(g:T.Object3D,c:string,w:number,h:number,d:number,x=0,y=h/2,z=0,kind?:'wood'|'stone'|'roof')=>put(g,new RoundedBoxGeometry(w,h,d,1,Math.min(.06,w/4,h/4,d/4)),c,x,y,z,1,1,1,kind);
 function beam(g:T.Object3D,c:string,a:T.Vector3,b:T.Vector3,r=.07){const v=b.clone().sub(a),mid=a.clone().add(b).multiplyScalar(.5);const m=put(g,new T.CylinderGeometry(r*.8,r,v.length(),8),c,mid.x,mid.y,mid.z,1,1,1,'wood');m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return m;}
 function ring(g:T.Object3D,c:string,r:number,t:number,x:number,y:number,z:number){return put(g,new T.TorusGeometry(r,t,6,24),c,x,y,z);}
 function rune(g:T.Object3D,x=0,y=1,z=.32,c='#a8dfcf'){
  const m=block(g,c,.055,.32,.025,x,y,z);m.rotation.z=.4;
  block(g,c,.22,.045,.025,x+.07,y+.06,z).rotation.z=-.45;
  block(g,c,.17,.04,.025,x-.04,y-.07,z).rotation.z=.6;
 }
 function make(id:string):T.Group|null{
  const g=new T.Group(),wood='#8e6847',stone='#a3a38b',jade='#7baaa0',gold='#dab67b';
  if(id==='kamen-velky'||id==='kamen-maly'){
   const s=id==='kamen-maly'?.48:1;
   for(let i=0;i<3;i++){const m=put(g,new T.DodecahedronGeometry(.65,1),i%2?'#a7a58d':'#899382',(i-1)*.42,.38+(i%2)*.2,(i%2)*.22,1,.75,1,'stone');m.rotation.set(i*.18,i*.7,.1);}
   for(let i=0;i<4;i++)orb(g,'#7f985b',.2,Math.sin(i*2)*.5,.68,Math.cos(i*2)*.4,1,.22,1);g.scale.setScalar(s);
  }else if(id==='kmen'||id==='parez'){
   const m=put(g,new T.CylinderGeometry(.36,.45,id==='kmen'?1.9:.68,12),wood,0,id==='kmen'?.40:.34,0,1,1,1,'wood');
   const cap=put(g,new T.CylinderGeometry(.34,.34,.025,12),'#d9bb85',0,id==='kmen'?.40:.70,id==='kmen'?.97:0);
   if(id==='kmen'){m.rotation.x=Math.PI/2;cap.rotation.x=Math.PI/2;}else for(let i=0;i<4;i++)beam(g,wood,new T.Vector3(0,.12,0),new T.Vector3(Math.sin(i*1.57)*.7,.04,Math.cos(i*1.57)*.7),.12);
   for(let i=0;i<3;i++){const r=ring(g,wood,.1+i*.08,.012,0,id==='kmen'?.40:.72,id==='kmen'?.99:0);if(id!=='kmen')r.rotation.x=-Math.PI/2;}
  }else if(id==='houby'){
   for(let i=0;i<4;i++){const x=Math.sin(i*2.4)*.35,z=Math.cos(i*2.4)*.25,h=.25+i%2*.17;put(g,new T.CylinderGeometry(.055,.085,h,8),'#eed9af',x,h/2,z);orb(g,i%2?'#c48155':'#c9654b',.23,x,h,z,1,.5,1);for(let j=0;j<3;j++)orb(g,'#f7e6c3',.032,x+Math.cos(j*2)*.12,h+.09,z+Math.sin(j*2)*.12);}
  }else if(id==='runovy-kamen'){
   put(g,new T.DodecahedronGeometry(.7,1),'#8e9994',0,.8,0,.8,1.5,.55,'stone');block(g,stone,1.3,.16,.95,0,.08,0,'stone');rune(g,0,.94,.42);rune(g,-.17,.50,.4,'#dab67b');
   for(let i=0;i<3;i++)orb(g,'#7f985b',.24,(i-1)*.3,.14,.3,1,.3,1);
  }else if(id==='krystaly'){
   block(g,stone,1.2,.13,1,0,.065,0,'stone');for(let i=0;i<5;i++){const h=.5+i%3*.35,m=put(g,new T.CylinderGeometry(.03,.17,h,5),i%2?'#91cabd':'#b1d9d1',Math.sin(i*2.4)*.35,h/2+.12,Math.cos(i*2.4)*.28);m.rotation.z=(i-2)*.13;ring(g,gold,.18,.02,m.position.x,.2,m.position.z).rotation.x=Math.PI/2;}
  }else if(id==='koreneny-oblouk'){
   for(const s of[-1,1]){beam(g,wood,new T.Vector3(s*1.3,0,0),new T.Vector3(s*1.2,1.5,0),.25);beam(g,wood,new T.Vector3(s*1.2,1.5,0),new T.Vector3(s*.6,2.8,0),.20);beam(g,wood,new T.Vector3(s*.6,2.8,0),new T.Vector3(0,3,.05),.16);for(let i=0;i<3;i++)orb(g,'#6d965b',.35,s*(1.3-i*.32),1.5+i*.6,0,1,.65,1);}
   put(g,new T.OctahedronGeometry(.2),'#a8dfcf',0,2.65,0);
  }else if(id==='rozcestnik'){
   block(g,wood,.14,1.8,.14,0,.9,0,'wood');for(const y of[1.15,1.6]){const p=block(g,y>1.5?'#bb9966':'#699388',1.15,.27,.14,y>1.5?.17:-.17,y,0,'wood');p.rotation.z=y>1.5?.07:-.05;block(g,'#ead6a3',.55,.035,.02,p.position.x,y,.09);}
  }else if(id==='plot'||id==='roh-plotu'){
   for(const x of[-.8,0,.8]){block(g,wood,.12,1,.13,x,.5,0,'wood');put(g,new T.ConeGeometry(.12,.15,4),gold,x,1.06,0).rotation.y=Math.PI/4;}
   for(const y of[.35,.75])block(g,'#b38d5e',1.9,.13,.1,0,y,0,'wood');if(id==='roh-plotu'){const side=make('plot')!;side.rotation.y=Math.PI/2;side.position.set(-.8,0,.8);g.add(side);}
  }else if(id==='rakosi'){
   for(let i=0;i<9;i++){const x=Math.sin(i*2.4)*.45,z=Math.cos(i*2.4)*.4,h=.6+(i%4)*.14;beam(g,'#6e8b5f',new T.Vector3(x,0,z),new T.Vector3(x+.1,h,z),.018);orb(g,'#88724c',.08,x+.1,h,z,.55,2.4,.55);const leaf=orb(g,'#89a574',.2,x+.12,h*.5,z,.25,2,.3);leaf.rotation.z=-.4;}
  }else if(id==='sloup'){
   block(g,stone,1,.25,1,0,.125,0,'stone');put(g,new T.CylinderGeometry(.28,.36,2.2,12),stone,0,1.3,0,1,1,1,'stone');block(g,'#bdbaa0',.85,.22,.85,0,2.5,0,'stone');for(let i=0;i<3;i++)ring(g,gold,.32,.025,0,.5+i*.7,0).rotation.x=Math.PI/2;
  }else if(id==='potrubi'){
   const pipe=put(g,new T.CylinderGeometry(.28,.28,2.6,12),'#619a9c',0,.5,0);pipe.rotation.z=Math.PI/2;for(const x of[-1,0,1])ring(g,'#c2a370',.3,.05,x,.5,0).rotation.y=Math.PI/2;for(const x of[-.9,.9])block(g,stone,.4,.35,.65,x,.175,0,'stone');
  }else if(id==='police'){
   block(g,wood,1.7,2.3,.55,0,1.15,0,'wood');for(const y of[.35,1,1.65]){block(g,'#c69f68',1.8,.1,.7,0,y,0,'wood');for(let i=0;i<7;i++)block(g,['#8c677f','#748e88','#be9a68'][i%3],.15,.40+i%2*.10,.35,-.65+i*.21,y+.29,.19);}
  }else if(id==='ventil'){
   put(g,new T.CylinderGeometry(.16,.23,.8,10),'#759b95',0,.4,0);const w=ring(g,gold,.46,.065,0,.96,0);w.rotation.x=.5;for(let i=0;i<4;i++){const a=i*Math.PI/2;beam(g,'#cba569',new T.Vector3(0,.96,0),new T.Vector3(Math.sin(a)*.4,.96+Math.cos(a)*.35,Math.cos(a)*.18),.027);}block(g,stone,.7,.12,.7,0,.06,0,'stone');
  }else if(id==='zrcadlo'){
   block(g,stone,.8,.18,.65,0,.09,0,'stone');block(g,wood,.13,1.1,.13,0,.6,0,'wood');block(g,gold,1.25,1.65,.17,0,1.25,0);const glass=block(g,'#a4d0d3',1.05,1.44,.19,0,1.25,.015);glass.material=material('#a4d0d3',undefined,true);rune(g,0,1.25,.12,'#f6e4b6');
  }else if(id==='lod'){
   orb(g,wood,1,0,.3,0,.85,.35,1.5);block(g,'#d3af75',1.45,.12,2.35,0,.42,0,'wood');for(const z of[-.7,.65])block(g,wood,1.5,.12,.27,0,.59,z,'wood');for(const x of[-.7,.7])beam(g,wood,new T.Vector3(x,.5,-1),new T.Vector3(x,.5,1),.08);
  }else if(id==='klec'){
   for(const y of[.09,1.55])block(g,wood,1.4,.12,1.4,0,y,0,'wood');for(const x of[-.61,.61])for(const z of[-.61,0,.61])beam(g,'#769082',new T.Vector3(x,.1,z),new T.Vector3(x,1.55,z),.035);for(const z of[-.61,.61])beam(g,'#769082',new T.Vector3(0,.1,z),new T.Vector3(0,1.55,z),.035);ring(g,gold,.12,.025,0,.9,.68);
  }else if(id==='mec'){
   block(g,'#d7e4df',.10,.70,.06,0,-.67,.1);put(g,new T.ConeGeometry(.065,.22,4),'#edf1dc',0,-1.12,.1).rotation.z=Math.PI;block(g,gold,.37,.07,.11,0,-.31,.1);block(g,wood,.09,.25,.08,0,-.15,.1,'wood');orb(g,jade,.065,0,-.01,.1);
  }else if(id==='luk'){
   const b=ring(g,wood,.34,.045,0,-.4,.1);b.geometry.dispose();geos.delete(b.geometry);b.geometry=new T.TorusGeometry(.34,.045,6,18,Math.PI);geos.add(b.geometry);b.rotation.z=Math.PI/2;beam(g,'#eddbb7',new T.Vector3(0,-.74,.1),new T.Vector3(0,-.06,.1),.008);for(const y of[-.7,-.1])ring(g,gold,.052,.015,0,y,.1).rotation.x=Math.PI/2;
  }else if(id==='hul'){
   beam(g,wood,new T.Vector3(0,-1.05,.1),new T.Vector3(0,.2,.1),.035);ring(g,gold,.18,.035,0,.24,.1);put(g,new T.OctahedronGeometry(.16),'#b8a1d0',0,.24,.1);for(const y of[-.7,-.2])ring(g,gold,.05,.015,0,y,.1).rotation.x=Math.PI/2;
  }else return null;
  g.name='BuddyWorld_v47_'+id;return g;
 }
 function compact(g:T.Group){
  g.updateMatrixWorld(true);const inverse=g.matrixWorld.clone().invert(),buckets=new Map<T.Material,T.BufferGeometry[]>(),crowns:T.Mesh[]=[];
  g.traverse(o=>{if(!(o instanceof T.Mesh)||Array.isArray(o.material))return;
   let geo=o.geometry.clone().applyMatrix4(inverse.clone().multiply(o.matrixWorld));
   if(o.name==='v46-canopy'){geos.add(geo);const crown=new T.Mesh(geo,o.material);crown.name=o.name;crowns.push(crown);return;}
   if(geo.index){const indexed=geo;geo=geo.toNonIndexed();indexed.dispose();}
   if(!buckets.has(o.material))buckets.set(o.material,[]);buckets.get(o.material)!.push(geo);
  });g.clear();
  for(const [mat,parts]of buckets){const geo=mergeGeometries(parts);parts.forEach(p=>p.dispose());if(geo){geos.add(geo);const m=new T.Mesh(geo,mat);m.castShadow=m.receiveShadow=true;g.add(m);}}
  if(crowns.length)g.add(...crowns);
 }
 function model(id:string){
  if(!templates.has(id)){const g=base.model(id)??make(id);if(!g)return null;compact(g);templates.set(id,g);}
  const result=templates.get(id)!.clone(true);result.traverse(o=>{if(o instanceof T.Mesh&&o.name==='v46-canopy'){o.material=(o.material as T.Material).clone();mats.add(o.material);}});return result;
 }
 function floor(id:RegionId){const color=id==='archiv'?'#aaa0b5':id==='vodarna'?'#8ba8a9':'#8b9980',m=material(color,'stone').clone();m.map=m.map!.clone();m.map.repeat.set(15,25);m.map.needsUpdate=true;mats.add(m);return m;}
 return {...base,model,floor,dispose(){templates.clear();geos.forEach(g=>g.dispose());mats.forEach(m=>{if(m instanceof T.MeshStandardMaterial)m.map?.dispose();m.dispose();});base.dispose();}};
}
