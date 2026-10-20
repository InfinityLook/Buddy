import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

/** Original v46 soft contact shadow. Generated from a radial falloff, no image asset. */
export function createSoftShadow(radius:number,opacity=.24) {
  const n=48,pixels=new Uint8Array(n*n*4)
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){const i=(y*n+x)*4,r=Math.hypot((x+.5)/n*2-1,(y+.5)/n*2-1);pixels[i]=13;pixels[i+1]=25;pixels[i+2]=20;pixels[i+3]=Math.round(Math.max(0,1-r*r)**2*255)}
  const map=new THREE.DataTexture(pixels,n,n,THREE.RGBAFormat);map.needsUpdate=true;map.magFilter=THREE.LinearFilter
  const m=new THREE.Mesh(new THREE.PlaneGeometry(radius*2,radius*2),new THREE.MeshBasicMaterial({map,transparent:true,opacity,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.y=.018;return m
}

/** Original stylized adventurers with separated walk / attack limbs and expressive faces. */
export function createCharacter(color:string|number,hairColor:string|number=0x40332e) {
  const group=new THREE.Group()
  const cloth=new THREE.MeshStandardMaterial({color,roughness:.94})
  const skin=new THREE.MeshStandardMaterial({color:0xe9b78d,roughness:.9})
  const leather=new THREE.MeshStandardMaterial({color:0x785038,roughness:.95})
  const boots=new THREE.MeshStandardMaterial({color:0x40392f,roughness:.96})
  const hair=new THREE.MeshStandardMaterial({color:hairColor,roughness:1})
  const linen=new THREE.MeshStandardMaterial({color:0xf0dfb8,roughness:1})
  const gold=new THREE.MeshStandardMaterial({color:0xcba05b,roughness:.65,metalness:.15})
  const add=(geo:THREE.BufferGeometry,mat:THREE.Material,x:number,y:number,z:number,parent:THREE.Object3D=group)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
  const body=add(new THREE.CapsuleGeometry(.25,.32,5,12),cloth,0,.94,0)
  add(new THREE.CylinderGeometry(.24,.31,.33,12),cloth,0,.71,0)
  const head=add(new THREE.SphereGeometry(.295,16,12),skin,0,1.48,.015)
  head.scale.set(1,1.04,.94)
  for(const x of[-.29,.29])add(new THREE.SphereGeometry(.055,8,6),skin,x,-.01,0,head).scale.set(1,1.4,.7)
  const cap=add(new THREE.SphereGeometry(.303,16,10,0,Math.PI*2,0,Math.PI*.62),hair,0,.035,-.025,head);cap.rotation.x=-.15
  for(let i=0;i<7;i++){const x=(i-3)*.075,m=add(new THREE.ConeGeometry(.075,.19,5),hair,x,.11+Math.abs(i-3)*.018,.228-Math.abs(x)*.3,head);m.rotation.z=Math.PI+(i-3)*.11;m.rotation.x=.2}
  const whites=new THREE.MeshStandardMaterial({color:0xf6ecd9,roughness:.6})
  const eyes=new THREE.MeshStandardMaterial({color:0x263b38,roughness:.4})
  const glint=new THREE.MeshBasicMaterial({color:0xfff9e9})
  for(const x of[-.105,.105]){
    add(new THREE.SphereGeometry(.052,9,7),whites,x,.005,.259,head).scale.set(.9,1.15,.45)
    add(new THREE.SphereGeometry(.040,9,7),eyes,x+.006,.002,.277,head).scale.set(.87,1.15,.38)
    add(new THREE.SphereGeometry(.012,6,4),glint,x-.006,.02,.29,head)
    const brow=add(new THREE.CapsuleGeometry(.012,.075,2,6),hair,x,.093,.258,head);brow.rotation.z=Math.PI/2+(x>0?-.10:.10)
  }
  add(new THREE.SphereGeometry(.035,8,6),skin,0,-.063,.278,head).scale.set(.8,.65,.9)
  const mouth=add(new THREE.TorusGeometry(.039,.008,4,10,Math.PI*.65),leather,0,-.125,.264,head);mouth.rotation.z=Math.PI*1.17
  const scarf=add(new THREE.TorusGeometry(.20,.05,6,14),linen,0,1.205,0);scarf.rotation.x=Math.PI/2
  add(new THREE.BoxGeometry(.10,.25,.045),linen,.13,1.04,.255)
  const belt=add(new THREE.CylinderGeometry(.265,.273,.085,12),leather,0,.77,0)
  add(new THREE.BoxGeometry(.10,.09,.035),gold,0,.77,.278)
  const strap=add(new THREE.BoxGeometry(.064,.53,.042),leather,.03,1.01,.255);strap.rotation.z=-.5
  add(new THREE.CapsuleGeometry(.15,.11,3,10),leather,-.27,.72,.03)
  add(new THREE.BoxGeometry(.32,.34,.14),leather,0,.97,-.275)
  for(const x of[-.09,.09])add(new THREE.BoxGeometry(.035,.31,.018),gold,x,.97,-.36)
  const legs=[-.14,.14].map(x=>{
    const pivot=new THREE.Group();pivot.position.set(x,.59,0);group.add(pivot)
    add(new THREE.CapsuleGeometry(.082,.19,3,9),linen,0,-.12,0,pivot)
    add(new THREE.CylinderGeometry(.10,.087,.22,9),boots,0,-.29,0,pivot)
    add(new THREE.CapsuleGeometry(.09,.10,3,9),boots,0,-.39,.045,pivot).rotation.x=Math.PI/2
    add(new THREE.CylinderGeometry(.108,.108,.045,9),leather,0,-.19,0,pivot)
    return pivot
  })
  const arms=[-.32,.32].map(x=>{
    const pivot=new THREE.Group();pivot.position.set(x,1.06,0);group.add(pivot)
    add(new THREE.CapsuleGeometry(.09,.18,3,9),cloth,0,-.13,0,pivot)
    add(new THREE.CylinderGeometry(.084,.08,.09,9),leather,0,-.29,0,pivot)
    add(new THREE.SphereGeometry(.079,9,7),skin,0,-.38,0,pivot)
    return pivot
  })
  // Merge small static parts by material while keeping the tunic mutable and the limbs articulated.
  const merge=(parent:THREE.Object3D,keep:THREE.Object3D[]=[])=>{
    parent.updateMatrixWorld(true);const buckets=new Map<THREE.Material,THREE.BufferGeometry[]>()
    for(const m of [...parent.children]){if(!(m instanceof THREE.Mesh)||keep.includes(m))continue;let geo=m.geometry.clone().applyMatrix4(m.matrix);if(geo.index)geo=geo.toNonIndexed();const mat=m.material as THREE.Material;const list=buckets.get(mat)??[];list.push(geo);buckets.set(mat,list);parent.remove(m);m.geometry.dispose()}
    for(const [mat,geos]of buckets){const geo=mergeGeometries(geos);if(geo){const m=new THREE.Mesh(geo,mat);m.castShadow=m.receiveShadow=true;parent.add(m)}geos.forEach(g=>g.dispose())}
  }
  merge(head);merge(group,[body,head]);for(const limb of[...arms,...legs])merge(limb)
  group.add(createSoftShadow(.48))
  // Keep references for the existing scene / combat API.
  void belt
  return {group,body,head,arms,animate(phase:number,moving:boolean,attack:number=0){
    const swing=moving?Math.sin(phase)*.65:0
    legs[0].rotation.x=swing;legs[1].rotation.x=-swing
    arms[0].rotation.x=-swing*.75;arms[1].rotation.x=attack>0?-1.4*Math.sin(attack*Math.PI):swing*.75
  }}
}
