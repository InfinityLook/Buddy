/** Nástěnka na náměstí. Pouze rozcestník k existujícím questům, žádné nové odměny. */
export const POZICE_NASTENKY = { x: 2.8, z: 16.5 } as const
export const DOSAH_NASTENKY = 3.2
export type PoziceXZ = { x: number; z: number }
export function vzdalenostOdNastenky(pozice: PoziceXZ): number {
  return Math.hypot(pozice.x - POZICE_NASTENKY.x, pozice.z - POZICE_NASTENKY.z)
}
export function muzeOtevritNastenku(pozice: PoziceXZ): boolean {
  return Number.isFinite(pozice.x) && Number.isFinite(pozice.z) && vzdalenostOdNastenky(pozice) <= DOSAH_NASTENKY
}
export type PolozkaNastenky = { id: string; nazev: string; stav: 'zamceny' | 'dostupny' | 'rozpracovany' | 'hotovy'; pokyn: string }
export function polozkyNastenky(prvni: { faze: string }, druha: { faze: string }, treti: { faze: string }): PolozkaNastenky[] {
  return [
    { id: 'svetlo', nazev: 'Ztracené světlo', stav: prvni.faze === 'dokoncena' ? 'hotovy' : prvni.faze === 'nezahajena' ? 'dostupny' : 'rozpracovany', pokyn: 'Sleduj panel První výprava a promluv si s NPC.' },
    { id: 'druha', nazev: 'Druhá výprava', stav: druha.faze === 'dokoncena' ? 'hotovy' : druha.faze === 'zamcena' ? 'zamceny' : druha.faze === 'pripravena' ? 'dostupny' : 'rozpracovany', pokyn: 'Úkol přijmeš v původním panelu příběhu ve vesnici.' },
    { id: 'treti', nazev: 'Třetí výprava', stav: treti.faze === 'dokoncena' ? 'hotovy' : treti.faze === 'zamcena' ? 'zamceny' : treti.faze === 'pripravena' ? 'dostupny' : 'rozpracovany', pokyn: 'Pokračuj v příběhu přes původní panel výpravy.' },
  ]
}
