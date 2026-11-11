import { naFormatDatumu, rozlozeniMesice } from './useKalendar'
import { posunDatumStr, zacatekVyskytuPokryvajiciDen } from './types'
import type { IcsNavrh, Udalost } from './types'

export function mistniDatum(datum: string) {
  const [rok, mesic, den] = datum.split('-').map(Number)
  return new Date(rok, mesic - 1, den, 12)
}

export function datumStr(datum = new Date()) {
  return naFormatDatumu(datum.getFullYear(), datum.getMonth(), datum.getDate())
}

export function platneDatum(datum: string) {
  return /^[1-9]\d{3}-\d{2}-\d{2}$/.test(datum) && datumStr(mistniDatum(datum)) === datum
}

export function posunMesic(datum: string, smer: -1 | 1) {
  const [rok, mesic, den] = datum.split('-').map(Number)
  const cil = new Date(rok, mesic - 1 + smer, 1, 12)
  const novyRok = cil.getFullYear()
  const novyMesic = cil.getMonth()
  const { pocetDni } = rozlozeniMesice(novyRok, novyMesic)
  return naFormatDatumu(novyRok, novyMesic, Math.min(den, pocetDni))
}

export function chybaTerminu(termin: {
  datum: string
  datumDo?: string
  celodenni: boolean
  casOd?: string
  casDo?: string
}) {
  const { datum, datumDo, celodenni, casOd, casDo } = termin
  if (!platneDatum(datum) || (datumDo && !platneDatum(datumDo))) return 'Vyber platné datum.'
  if (datumDo && datumDo < datum) return 'Datum konce musí být stejné nebo pozdější než začátek.'
  if (celodenni) return null

  const cas = /^(?:[01]\d|2[0-3]):[0-5]\d$/
  if (!cas.test(casOd ?? '') || (casDo && !cas.test(casDo))) return 'Vyber platný čas.'
  if (casDo && casDo < casOd! && (!datumDo || datumDo === datum)) {
    return 'Konec je před začátkem. U události přes půlnoc nastav další den.'
  }

  return null
}

export function vyskytVDen(udalost: Udalost, datum: string) {
  if (udalost.deletedAt || datum < udalost.datum) return null
  const zacatek = zacatekVyskytuPokryvajiciDen(udalost, datum)
  if (!zacatek) return null

  let konec = zacatek
  if (udalost.datumDo && udalost.datumDo > udalost.datum) {
    const naDen = (d: string) => Date.parse(`${d}T00:00:00Z`) / 86_400_000
    const rozdil = naDen(udalost.datumDo) - naDen(udalost.datum)
    if (Number.isFinite(rozdil)) konec = posunDatumStr(zacatek, rozdil)
  }

  return { zacatek, konec }
}

export function klicImportu(udalost: IcsNavrh | Udalost) {
  return JSON.stringify([
    udalost.nazev.trim(),
    udalost.datum,
    udalost.datumDo ?? udalost.datum,
    udalost.celodenni,
    udalost.casOd ?? '',
    udalost.casDo ?? '',
    udalost.opakovani,
  ])
}
