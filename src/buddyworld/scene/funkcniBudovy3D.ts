/** Buddy World v9.5 — originální geometrie z Three.js; žádné externí assety. */
import * as THREE from 'three'

function blok(parent: THREE.Group, rozmer: [number,number,number], poloha: [number,number,number], barva: number) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...rozmer), new THREE.MeshStandardMaterial({color:barva,roughness:0.87}))
  mesh.position.set(...poloha)
  parent.add(mesh)
  return mesh
}

/** Vytváří lehké modely skladu a strážní věže, ukotvené mimo náměstí. */
export function vytvorFunkcniBudovy3D(): { sklad: THREE.Group; vez: THREE.Group } {
  const sklad = new THREE.Group()
  sklad.name = 'BuddyWorld_OriginalniSklad'
  sklad.position.set(-10,0,18)
  blok(sklad,[3.5,2.4,3.1],[0,1.2,0],0x92704c)
  const strecha = new THREE.Mesh(new THREE.ConeGeometry(2.65,1.55,4),new THREE.MeshStandardMaterial({color:0x9c4e37,roughness:0.92}))
  strecha.rotation.y=Math.PI/4
  strecha.position.y=3.05
  sklad.add(strecha)
  blok(sklad,[1.15,1.65,0.13],[0,0.83,1.62],0x513827)
  for(const x of [-1.1,1.1]) blok(sklad,[0.85,0.8,0.85],[x,0.4,2.15],0x8c6539)

  const vez = new THREE.Group()
  vez.name = 'BuddyWorld_OriginalniStrazniVez'
  vez.position.set(10,0,19)
  for(const x of [-1.05,1.05]) for(const z of [-1.05,1.05]) {
    blok(vez,[0.32,5.5,0.32],[x,2.75,z],0x70503b)
  }
  blok(vez,[3,0.38,3],[0,4.45,0],0x9c8059)
  blok(vez,[3.7,0.4,3.7],[0,5.65,0],0x543e32)
  for(const z of [-1.45,1.45]) blok(vez,[3.3,0.65,0.16],[0,5.0,z],0x735239)
  for(const x of [-1.45,1.45]) blok(vez,[0.16,0.65,3.3],[x,5.0,0],0x735239)
  // Barevná vlajka jako jednoduchý vlastní mesh.
  blok(vez,[0.06,1.3,0.06],[0,6.5,0],0xc2c5c9)
  blok(vez,[0.8,0.5,0.05],[0.43,6.85,0],0x326cba)
  // v9.6: dekorace vytvorene pouze z primitiv Three.js; bez externich textur.
  const drevo = 0x65432d, svetleDrevo = 0xb28a59, kov = 0x444d56, sklo = 0xf2c977
  // Sklad: nosne tramky, okenice, zavesene lampy a bedny.
  for (const x of [-1.58, 1.58]) {
    for (const z of [-1.35, 1.35]) blok(sklad,[0.18,2.55,0.18],[x,1.27,z],drevo)
    blok(sklad,[0.20,0.8,0.12],[x,1.55,1.62],kov)
    blok(sklad,[0.13,0.52,0.14],[x,2.08,1.75],svetleDrevo)
    blok(sklad,[0.25,0.33,0.24],[x,1.78,1.75],sklo)
  }
  for (const y of [0.4, 2.2]) for(const z of [-1.48,1.48]) {
    blok(sklad,[3.4,0.14,0.12],[0,y,z],drevo)
  }
  for(const x of [-0.95,0.95]) {
    blok(sklad,[0.9,0.75,0.75],[x,0.38,2.25],svetleDrevo)
    blok(sklad,[0.95,0.10,0.79],[x,0.75,2.25],drevo)
  }
  // Strazni vez: bocni vzpery, zebrík, zabradli, lucerny a strecha.
  for (const x of [-1.05,1.05]) for (const z of [-1.05,1.05]) {
    const vzpera = blok(vez,[0.13,3.3,0.13],[x,2.65,z],svetleDrevo)
    vzpera.rotation.z = (x>0 ? -1 : 1)*0.22
  }
  for(let i=0;i<8;i++) blok(vez,[0.95,0.11,0.17],[1.12,0.85+i*0.48,1.22],svetleDrevo)
  for(const z of [-1.38,1.38]) for(const x of [-1.18,1.18]) {
    blok(vez,[0.17,0.95,0.17],[x,5.0,z],drevo)
  }
  for(const x of [-1.28,1.28]) {
    blok(vez,[0.26,0.37,0.26],[x,4.82,1.5],sklo)
    blok(vez,[0.32,0.09,0.32],[x,5.06,1.5],kov)
  }
  const strechaVeze = new THREE.Mesh(
    new THREE.ConeGeometry(2.65,1.55,4),
    new THREE.MeshStandardMaterial({color:0x89452f,roughness:0.9})
  )
  strechaVeze.rotation.y = Math.PI/4
  strechaVeze.position.y = 6.62
  vez.add(strechaVeze)
  return {sklad,vez}
}
