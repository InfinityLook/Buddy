import { herniCas } from '../gameClock'
/** v10.6: nenáročné procedurální animace hlídače; pozice zásahu zůstává fixní. */
import * as THREE from 'three'
import { HLIDAC_OBLAST_ZASAHU, polomerUderu, type DruhUderu } from '../hlidacRealtime'
import { HLIDAC_POZICE, nastavPoziciHlidace, resetPoziceHlidace } from '../hlidacRuin'
export const HLIDAC_AGGRO_DOSAH = 10
export const HLIDAC_NAVRAT_DOSAH = 15
export const HLIDAC_RYCHLOST = 1.8 // world units per second
export const HLIDAC_ZASTAVENI = 2.35
export type VizualniFazeHlidace = 'klid' | 'varovani' | 'utok' | 'zasah' | 'uhyb' | 'porazen'
export const HLIDAC_VIZUALNI_UDALOST = 'buddyworld:hlidac-vizual'
export type HlidacVizualniDetail = { faze: VizualniFazeHlidace; stredUderu?: {x:number;z:number}; druhUderu?: DruhUderu }
export function oznamVizualniFaziHlidace(faze: VizualniFazeHlidace, stredUderu?: {x:number;z:number}, druhUderu?: DruhUderu): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent<HlidacVizualniDetail>(HLIDAC_VIZUALNI_UDALOST, { detail: { faze, stredUderu, druhUderu } }))
}
export function vytvorHlidaceRuin3D() {
  const group = new THREE.Group()
  group.name = 'BuddyWorld_HlidacRuin'
  group.position.set(HLIDAC_POZICE.x, 0, HLIDAC_POZICE.z)
  const teloMaterial = new THREE.MeshStandardMaterial({color:0x63538c,emissive:0x241249,emissiveIntensity:0.4,roughness:0.65})
  const okoMaterial = new THREE.MeshStandardMaterial({color:0xf3a4ff,emissive:0xb848ff,emissiveIntensity:0.8})
  const telo = new THREE.Mesh(new THREE.DodecahedronGeometry(0.8),teloMaterial)
  telo.position.y = 1.25
  group.add(telo)
  const oko = new THREE.Mesh(new THREE.OctahedronGeometry(0.25),okoMaterial)
  oko.position.set(0,1.35,0.7)
  group.add(oko)
  const kruhMaterial = new THREE.MeshBasicMaterial({color:0xa06bd7})
  const kruh = new THREE.Mesh(new THREE.TorusGeometry(1,0.07,6,24),kruhMaterial)
  kruh.rotation.x = Math.PI/2
  kruh.position.y = 0.08
  group.add(kruh)
  // Červený kruh je přesná prostorová oblast útoku. Po dobu varování zůstává na místě.
  const oblastMaterial = new THREE.MeshBasicMaterial({color:0xff433e,transparent:true,opacity:0.52,depthWrite:false,side:THREE.DoubleSide})
  const oblast = new THREE.Mesh(new THREE.RingGeometry(HLIDAC_OBLAST_ZASAHU-0.13,HLIDAC_OBLAST_ZASAHU,48),oblastMaterial)
  oblast.rotation.x = -Math.PI/2
  oblast.position.y = 0.11
  oblast.visible = false
  group.add(oblast)
  let faze: VizualniFazeHlidace = 'klid'
  let efektDo = 0
  let posledniFrame = 0
  let pronasleduje = false
  let zamcenyStred: {x:number;z:number} | null = null
  let aktualniDruh: DruhUderu = 'normalni'
  const zmenFazi = (udalost: Event) => {
    const nova = (udalost as CustomEvent<HlidacVizualniDetail>).detail?.faze
    if (!nova || !(['klid','varovani','utok','zasah','uhyb','porazen'] as string[]).includes(nova)) return
    faze = nova
    if (nova === 'varovani') {
      aktualniDruh = (udalost as CustomEvent<HlidacVizualniDetail>).detail?.druhUderu === 'rychly' ? 'rychly' : 'normalni'
      const p = (udalost as CustomEvent<HlidacVizualniDetail>).detail?.stredUderu
      zamcenyStred = p && Number.isFinite(p.x) && Number.isFinite(p.z) ? {x:p.x,z:p.z} : null
    } else { zamcenyStred = null }
    efektDo = herniCas() + (nova === 'utok' ? 500 : nova === 'zasah' || nova === 'uhyb' ? 400 : 0)
  }
  if (typeof window !== 'undefined') window.addEventListener(HLIDAC_VIZUALNI_UDALOST, zmenFazi)
  const aktualizuj = (ted: number, hrac: {x:number;z:number}) => {
    const aktivniEfekt = ted < efektDo
    const t = ted * 0.001
    const dt = posledniFrame ? Math.min(0.05, Math.max(0,(ted-posledniFrame)/1000)) : 0
    posledniFrame = ted
    const odDomova = Math.hypot(group.position.x-HLIDAC_POZICE.x,group.position.z-HLIDAC_POZICE.z)
    const vzdalenost = Math.hypot(hrac.x-group.position.x,hrac.z-group.position.z)
    if (vzdalenost < HLIDAC_AGGRO_DOSAH && odDomova < HLIDAC_NAVRAT_DOSAH) pronasleduje = true
    if (vzdalenost > HLIDAC_NAVRAT_DOSAH || odDomova >= HLIDAC_NAVRAT_DOSAH) pronasleduje = false
    const vraciSe = !pronasleduje && odDomova > 0.08
    const cil = pronasleduje ? hrac : HLIDAC_POZICE
    const dx = cil.x - group.position.x
    const dz = cil.z - group.position.z
    const delka = Math.hypot(dx,dz)
    if (delka > 0.01) group.rotation.y = Math.atan2(dx,dz)
    const stoji = faze === 'varovani' || faze === 'utok' || faze === 'zasah' || faze === 'uhyb' || faze === 'porazen'
    if (!stoji && (vraciSe || (pronasleduje && vzdalenost > HLIDAC_ZASTAVENI)) && delka > 0.01) {
      const krok = Math.min(delka,HLIDAC_RYCHLOST*dt)
      group.position.x += dx/delka*krok
      group.position.z += dz/delka*krok
    }
    nastavPoziciHlidace({x:group.position.x,z:group.position.z})
    const posun = faze === 'utok' && aktivniEfekt ? Math.sin((1-(efektDo-ted)/500)*Math.PI)*0.65 : 0
    // Visual lunge affects the mesh only; combat position stays on the navigated group.
    telo.position.z = posun
    oko.position.z = 0.7 + posun
    telo.position.y = 1.25 + Math.sin(t*2.5)*0.12
    oko.position.y = telo.position.y + 0.1
    kruh.rotation.z = Math.sin(t*1.5)*0.07
    const varuje = faze === 'varovani'
    oblast.visible = varuje && zamcenyStred !== null
    oblast.scale.setScalar(polomerUderu(aktualniDruh)/HLIDAC_OBLAST_ZASAHU)
    // Ring is a child of the moving guardian: offset in guardian-local coordinates
    // so that its WORLD position remains fixed at the telegraphed impact center.
    if (zamcenyStred) {
      const dx = zamcenyStred.x - group.position.x
      const dz = zamcenyStred.z - group.position.z
      const c = Math.cos(group.rotation.y), sn = Math.sin(group.rotation.y)
      oblast.position.x = c * dx - sn * dz
      oblast.position.z = sn * dx + c * dz
    }
    oblastMaterial.opacity = 0.45 + Math.sin(t*14)*0.18
    okoMaterial.emissive.setHex(varuje ? 0xff4a25 : faze === 'uhyb' && aktivniEfekt ? 0x36eeff : 0xb848ff)
    teloMaterial.emissiveIntensity = varuje ? 1.4 : faze === 'zasah' && aktivniEfekt ? 1.6 : 0.4
    const meritko = varuje ? 1 + Math.sin(t*17)*0.06 : 1
    telo.scale.setScalar(meritko)
    group.visible = faze !== 'porazen'
    if (efektDo && ted >= efektDo && ['utok','zasah','uhyb'].includes(faze)) { faze='klid'; efektDo=0 }
  }
  const zrus = () => {
    if (typeof window !== 'undefined') window.removeEventListener(HLIDAC_VIZUALNI_UDALOST,zmenFazi)
    resetPoziceHlidace()
    telo.geometry.dispose(); oko.geometry.dispose(); kruh.geometry.dispose(); oblast.geometry.dispose()
    teloMaterial.dispose(); okoMaterial.dispose(); kruhMaterial.dispose(); oblastMaterial.dispose()
  }
  return { group, aktualizuj, zrus }
}
