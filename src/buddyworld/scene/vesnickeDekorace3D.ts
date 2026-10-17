/** Buddy World v9.7: vlastní procedurální dekorace bez externích assetů. */
import * as THREE from 'three'

/** Deterministické, statické okolí vesnice; žádné animace ani síťové požadavky. */
export function vytvorVesnickeDekorace3D(): THREE.Group {
  const skupina = new THREE.Group()
  skupina.name = 'BuddyWorld_VesnickeDekorace'
  const drevo = new THREE.MeshStandardMaterial({ color: 0x82603f, roughness: 1 })
  const listi = new THREE.MeshStandardMaterial({ color: 0x477e42, roughness: 1 })
  const kmen = new THREE.MeshStandardMaterial({ color: 0x66503b, roughness: 1 })
  const kvet = [0xf7cf72, 0xe98ba3, 0xb3a0f0].map(color => new THREE.MeshStandardMaterial({color,roughness:1}))
  const pridej = (geometry: THREE.BufferGeometry, material: THREE.Material, x:number,y:number,z:number) => {
    const objekt = new THREE.Mesh(geometry,material)
    objekt.position.set(x,y,z)
    skupina.add(objekt)
    return objekt
  }
  // Ploty vymezují okraj návsi, ale nechávají volný průchod po hlavní cestě (x = 0).
  const sloupek = new THREE.BoxGeometry(0.16,1.0,0.16)
  const pricel = new THREE.BoxGeometry(0.10,0.12,2.4)
  for (const x of [-8.5,8.5]) for (const z of [8.5,11,13.5,16]) {
    pridej(sloupek,drevo,x,0.5,z)
    if (z < 16) for (const y of [0.38,0.72]) pridej(pricel,drevo,x,y,z+1.2)
  }
  // Keře, květiny a menší stromy mimo cestu i interakční místa NPC.
  const ker = new THREE.IcosahedronGeometry(0.5,0)
  const stonek = new THREE.CylinderGeometry(0.035,0.04,0.35,5)
  const okvetni = new THREE.SphereGeometry(0.12,5,4)
  for (const [i,x,z] of [[0,-7,9],[1,7,9],[2,-7,16],[3,7,16],[4,-9.8,14],[5,9.8,14]] as const) {
    pridej(ker,listi,x,0.42,z)
    for (let j=0;j<3;j++) {
      const px=x+(j-1)*0.35, pz=z+0.65
      pridej(stonek,kmen,px,0.175,pz)
      pridej(okvetni,kvet[(i+j)%kvet.length],px,0.39,pz)
    }
  }
  const koruna = new THREE.ConeGeometry(0.9,1.7,7)
  const kmenStromu = new THREE.CylinderGeometry(0.12,0.17,1.4,6)
  for (const [x,z] of [[-11,10],[11,10],[-11,19],[11,22]] as const) {
    pridej(kmenStromu,kmen,x,0.7,z)
    pridej(koruna,listi,x,2.05,z)
  }
  return skupina
}
