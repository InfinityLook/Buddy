// ==========================================
// Běhání/Kardio — GPS tracker pro běh, chůzi a kolo. Čistě zdarma: poloha
// jde přes vestavěné navigator.geolocation (žádný klíč, žádná placená
// služba), vzdálenost počítá appka sama Haversinovým vzorcem, mapa v
// pozadí (TrasaMapa.tsx) je OpenStreetMap přes Leaflet — taky zdarma,
// bez klíče, jen dlaždice stažené ze sítě při skutečném běhu appky.
//
// Čisté funkce tady dole (bez Reactu, bez GPS) jsou vytažené stejným
// důvodem jako combat/engine.ts nebo poseMath.ts — appka je umí
// otestovat bez prohlížeče a bez skutečné polohy.
// ==========================================

export type TypAktivity = 'beh' | 'chuze' | 'kolo'

export const NAZEV_AKTIVITY: Record<TypAktivity, string> = {
  beh: 'Běh',
  chuze: 'Chůze',
  kolo: 'Kolo',
}

export const IKONA_AKTIVITY: Record<TypAktivity, string> = {
  beh: '🏃',
  chuze: '🚶',
  kolo: '🚴',
}

export interface GpsBod {
  lat: number
  lng: number
  cas: number
}

export interface BehSezeni {
  id: string
  typ: TypAktivity
  vzdalenostM: number
  trvaniSekund: number
  odhadKcal: number
  trasa: GpsBod[]
  createdAt: string
}

// GPS šum: appka zahodí čtení s horší přesností než tohle (v metrech,
// z position.coords.accuracy) a posun menší než tohle mezi dvěma po
// sobě jdoucími body — bez toho by stání na místě s kolísajícím
// signálem tiše přičítalo vzdálenost, i když se uživatel nehnul.
export const PRAH_PRESNOSTI_M = 25
export const MIN_POSUN_M = 3

const POLOMER_ZEME_M = 6_371_000

/** Haversinův vzorec — vzdálenost mezi dvěma GPS body v metrech. Appka
 *  na tohle nepotřebuje žádnou externí mapovou/geolokační službu. */
export const vzdalenostMetry = (a: GpsBod, b: GpsBod): number => {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * POLOMER_ZEME_M * Math.asin(Math.sqrt(Math.min(1, h)))
}

/** Součet vzdáleností mezi po sobě jdoucími body celé trasy — na
 *  rozdíl od živého sledování (co volá vzdalenostMetry jen mezi
 *  posledním a novým bodem) tahle přepočítá trasu celou najednou,
 *  třeba při zobrazení už uloženého sezení. */
export const celkovaVzdalenostTrasy = (trasa: GpsBod[]): number => {
  let soucet = 0
  for (let i = 1; i < trasa.length; i++) {
    soucet += vzdalenostMetry(trasa[i - 1], trasa[i])
  }
  return soucet
}

/** Rozhodne, jestli se má nový GPS bod vůbec připočítat k trase — viz
 *  PRAH_PRESNOSTI_M/MIN_POSUN_M výš. Vytažené jako čistá funkce, ať jde
 *  otestovat bez skutečného watchPosition volání. */
export const melByPripocitatBod = (predchozi: GpsBod | null, novy: GpsBod, presnostM: number): boolean => {
  if (presnostM > PRAH_PRESNOSTI_M) return false
  if (!predchozi) return true
  return vzdalenostMetry(predchozi, novy) >= MIN_POSUN_M
}

// MET (Metabolic Equivalent of Task) — hrubý, poctivě přiznaný odhad
// na typ aktivity. Appka nemá jak měřit skutečnou intenzitu (tempo na
// kopci vs. na rovině, vítr při kole...), takže je to jeden pevný
// koeficient na aktivitu, ne vzorec kalibrovaný na konkrétní běh.
const MET_PODLE_AKTIVITY: Record<TypAktivity, number> = {
  chuze: 3.5,
  beh: 9.8,
  kolo: 7.5,
}

const VYCHOZI_VAHA_KG = 70

/** kcal = MET × váha (kg) × trvání (hodiny). Bez zadané váhy appka
 *  použije poctivě přiznaný výchozí odhad, ne aby dělila nulou nebo
 *  si vymyslela náhodné číslo. */
export const odhadniKcal = (typ: TypAktivity, trvaniSekund: number, vahaKg: number | null): number => {
  const vaha = vahaKg && vahaKg > 0 ? vahaKg : VYCHOZI_VAHA_KG
  const hodiny = trvaniSekund / 3600
  return Math.round(MET_PODLE_AKTIVITY[typ] * vaha * hodiny)
}

export const formatujVzdalenost = (metry: number): string => {
  if (metry < 1000) return `${Math.round(metry)} m`
  return `${(metry / 1000).toFixed(2)} km`
}

export const formatujCas = (sekund: number): string => {
  const cele = Math.max(0, Math.floor(sekund))
  const h = Math.floor(cele / 3600)
  const m = Math.floor((cele % 3600) / 60)
  const s = cele % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

/** Tempo v sekundách na kilometr, appka ho ukazuje jako "min:ss /km" —
 *  běžný formát z běžeckých appek. Vrací null pod 10 m (appka si
 *  tempo nevymýšlí z GPS šumu ani z dělení nulou). */
export const tempoSekundNaKm = (vzdalenostM: number, trvaniSekund: number): number | null => {
  if (vzdalenostM < 10) return null
  return trvaniSekund / (vzdalenostM / 1000)
}

export const formatujTempo = (sekundNaKm: number | null): string => {
  if (sekundNaKm === null || !Number.isFinite(sekundNaKm)) return '—'
  const m = Math.floor(sekundNaKm / 60)
  const s = Math.round(sekundNaKm % 60)
  return `${m}:${String(s).padStart(2, '0')} /km`
}

/** Součet vzdáleností všech sezení daného typu (nebo úplně všech, bez
 *  filtru) — appka na tomhle staví hand-checked odznak za celkovou
 *  vzdálenost (viz useBehani.ts), co se nevejde do jednoduchého
 *  "kolikáté volání" tvaru COUNT_BADGES. */
export const soucetVzdalenostiM = (sezeni: BehSezeni[]): number =>
  sezeni.reduce((soucet, s) => soucet + s.vzdalenostM, 0)
