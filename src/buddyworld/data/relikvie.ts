/** Trvalé interaktivní nálezy: hráč je aktivuje přímo ve 3D scéně. */
export interface Relikvie { id: string; nazev: string; popis: string; x: number; z: number; krystaly: number }
export const RELIKVIE: readonly Relikvie[] = [
  { id: 'pecet-svetla', nazev: 'Pečeť světla', popis: 'Zářící runa ukrytá na Krystalové mýtině.', x: 2, z: 4, krystaly: 3 },
  { id: 'lesni-pamatnik', nazev: 'Lesní památník', popis: 'Kámen se znaky dávných strážců.', x: -13, z: -5, krystaly: 2 },
  { id: 'stavitelsky-obelisk', nazev: 'Stavitelský obelisk', popis: 'Pozůstatek staré civilizace v Háji strážce.', x: 1, z: -18, krystaly: 4 },
]
export const overAktivovaneRelikvie = (hodnota: unknown): string[] =>
  Array.isArray(hodnota) ? [...new Set(hodnota.filter((id): id is string =>
    typeof id === 'string' && RELIKVIE.some(r => r.id === id)))] : []
export const lzeAktivovatRelikvii = (id: string, aktivovane: readonly string[]): boolean =>
  RELIKVIE.some(r => r.id === id) && !aktivovane.includes(id)
