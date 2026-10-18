import * as THREE from 'three'

/** Original low-poly adventurers with procedural walk and attack poses. */
export function createCharacter(color:string|number, hairColor:string|number=0x493c36) {
  const group=new THREE.Group()
  const cloth=new THREE.MeshStandardMaterial({color,roughness:.9,flatShading:true})
  const skin=new THREE.MeshStandardMaterial({color:0xe7b991,roughness:.9})
  const boots=new THREE.MeshStandardMaterial({color:0x393b42,roughness:1})
  const hair=new THREE.MeshStandardMaterial({color:hairColor,roughness:1})
  const add=(geo:THREE.BufferGeometry,mat:THREE.Material,x:number,y:number,z:number,parent:THREE.Object3D=group)=>{
    const mesh=new THREE.Mesh(geo,mat);mesh.position.set(x,y,z);parent.add(mesh);return mesh
  }
  const body=add(new THREE.CapsuleGeometry(.25,.38,3,8),cloth,0,.9,0)
  const head=add(new THREE.SphereGeometry(.27,10,8),skin,0,1.45,0)
  const cap=add(new THREE.SphereGeometry(.28,10,6,0,Math.PI*2,0,Math.PI*.58),hair,0,.035,-.015,head)
  cap.rotation.x=-.10
  const fringe=add(new THREE.BoxGeometry(.33,.12,.12),hair,0,.14,.20,head)
  fringe.rotation.z=-.12
  const eyes=new THREE.MeshBasicMaterial({color:0x263743})
  for(const x of [-.10,.10])add(new THREE.SphereGeometry(.028,7,6),eyes,x,-.005,.248,head)
  const scarfMaterial=new THREE.MeshStandardMaterial({color:0xe7c180,roughness:.9})
  const scarf=add(new THREE.TorusGeometry(.20,.055,5,10),scarfMaterial,0,1.18,0)
  scarf.rotation.x=Math.PI/2
  add(new THREE.BoxGeometry(.11,.27,.06),scarfMaterial,.13,1.04,.25)
  add(new THREE.BoxGeometry(.34,.37,.16),new THREE.MeshStandardMaterial({color:0x805d43,roughness:1}),0,.96,-.28)
  const legs=[-.14,.14].map(x=>{
    const pivot=new THREE.Group();pivot.position.set(x,.59,0);group.add(pivot)
    add(new THREE.CylinderGeometry(.085,.075,.34,7),boots,0,-.17,0,pivot)
    add(new THREE.BoxGeometry(.17,.13,.25),boots,0,-.39,.035,pivot)
    return pivot
  })
  const arms=[-.32,.32].map(x=>{
    const pivot=new THREE.Group();pivot.position.set(x,1.04,0);group.add(pivot)
    add(new THREE.CapsuleGeometry(.075,.25,2,7),cloth,0,-.17,0,pivot)
    add(new THREE.SphereGeometry(.078,7,6),skin,0,-.38,0,pivot)
    return pivot
  })
  const shadow=new THREE.Mesh(new THREE.CircleGeometry(.39,18),new THREE.MeshBasicMaterial({color:0x091a18,transparent:true,opacity:.22,depthWrite:false}))
  shadow.rotation.x=-Math.PI/2;shadow.position.y=.014;group.add(shadow)
  return {group,body,head,animate(phase:number,moving:boolean,attack:number=0){
    const swing=moving?Math.sin(phase)*.65:0
    legs[0].rotation.x=swing;legs[1].rotation.x=-swing
    arms[0].rotation.x=-swing*.75;arms[1].rotation.x=attack>0?-1.4*Math.sin(attack*Math.PI):swing*.75
  }}
}
