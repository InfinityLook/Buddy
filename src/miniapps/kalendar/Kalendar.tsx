import React, { useEffect, useMemo, useState } from 'react'
import { naFormatDatumu, NAZVY_MESICU, rozlozeniMesice, useKalendar } from './useKalendar'
import { BARVY_DNE, BarvaDne, MOZNOSTI_OPAKOVANI, NAZEV_OPAKOVANI, Opakovani } from './types'
import { useRozvrh } from '@/miniapps/rozvrh/useRozvrh'
import { denVTydnuZDatumu } from '@/miniapps/rozvrh/types'
import './Kalendar.css'

const DNY_V_TYDNU = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne']

// Popisky pro čtečky obrazovky/aria-label — pevná paleta, viz types.ts's
// vlastní komentář u BARVY_DNE.
const NAZEV_BARVY: Record<BarvaDne, string> = {
  cyan: 'Tyrkysová',
  violet: 'Fialová',
  magenta: 'Purpurová',
  green: 'Zelená',
  orange: 'Oranžová',
  red: 'Červená',
}

// 'YYYY-MM-DD' -> "15. května 2025" — parsováno ručně na místní datum
// (ne new Date('2025-05-15'), co by ho v UTC prohlížeči posunulo o den).
const zobrazitDatum = (datum: string): string => {
  const [rok, mesic, den] = datum.split('-').map(Number)
  return new Date(rok, mesic - 1, den).toLocaleDateString('cs-CZ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export const Kalendar: React.FC = () => {
  const {
    rok,
    mesic,
    dnes,
    vybranyDen,
    setVybranyDen,
    jitMesicem,
    dnySUdalosti,
    udalostiDne,
    barvyDni,
    nastavBarvuDne,
    pridatUdalost,
    smazatUdalost,
  } = useKalendar()

  const [formOtevreny, setFormOtevreny] = useState(false)
  const [nazev, setNazev] = useState('')
  const [popis, setPopis] = useState('')
  const [opakovani, setOpakovani] = useState<Opakovani>('zadne')

  // Přepnutí na jiný den se schválně chová stejně jako appčino "spustit
  // znovu" jinde — rozepsaný formulář se zavře a smaže, ať se napůl
  // napsaný název tiše nepřilepí k jinému dni, než pro který byl
  // psaný. Bez tohohle šlo otevřít formulář na 5., napsat kus názvu,
  // klepnout na 12. a odeslat by ho potichu uložilo tam.
  useEffect(() => {
    setFormOtevreny(false)
    setNazev('')
    setPopis('')
    setOpakovani('zadne')
  }, [vybranyDen])

  const { posunOdPondeli, pocetDni } = rozlozeniMesice(rok, mesic)
  const dnesniStr = naFormatDatumu(dnes.getFullYear(), dnes.getMonth(), dnes.getDate())

  // Dnešní hodiny podle Rozvrhu — jen jak vybraný den, ne dnešek appky.
  // O víkendu (denVTydnu === null) nebo bez jediné hodiny se sekce
  // vůbec nevykreslí, ne prázdný nadpis navíc.
  const { hodiny: rozvrhHodiny } = useRozvrh()
  const hodinyVybraneho = useMemo(() => {
    if (!vybranyDen) return []
    const [rokD, mesicD, denD] = vybranyDen.split('-').map(Number)
    const denVTydnu = denVTydnuZDatumu(new Date(rokD, mesicD - 1, denD))
    if (denVTydnu === null) return []
    return rozvrhHodiny.filter((h) => h.den === denVTydnu)
  }, [vybranyDen, rozvrhHodiny])

  const bunky: (number | null)[] = [
    ...Array(posunOdPondeli).fill(null),
    ...Array.from({ length: pocetDni }, (_, i) => i + 1),
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!vybranyDen || !nazev.trim()) return
    pridatUdalost(vybranyDen, nazev, popis, opakovani)
    setNazev('')
    setPopis('')
    setOpakovani('zadne')
    setFormOtevreny(false)
  }

  return (
    <div className="kalendar">
      <header className="kalendar-hlavicka">
        <button className="kalendar-sipka" onClick={() => jitMesicem(-1)} aria-label="Předchozí měsíc">
          ‹
        </button>
        <h2>
          {NAZVY_MESICU[mesic]} {rok}
        </h2>
        <button className="kalendar-sipka" onClick={() => jitMesicem(1)} aria-label="Další měsíc">
          ›
        </button>
      </header>

      <div className="kalendar-tydny" aria-hidden="true">
        {DNY_V_TYDNU.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>

      <div className="kalendar-mrizka">
        {bunky.map((den, i) => {
          if (den === null) return <span key={`prazdna-${i}`} className="kalendar-den kalendar-den--prazdny" />

          const datumStr = naFormatDatumu(rok, mesic, den)
          const maUdalost = dnySUdalosti.has(datumStr)
          const barvaDne = barvyDni[datumStr]

          return (
            <button
              key={datumStr}
              className={`kalendar-den ${datumStr === dnesniStr ? 'je-dnes' : ''} ${
                datumStr === vybranyDen ? 'je-vybrany' : ''
              } ${barvaDne ? `kalendar-den--barva-${barvaDne}` : ''}`}
              onClick={() => setVybranyDen(datumStr)}
            >
              {den}
              {maUdalost && <span className="kalendar-den-tecka" aria-hidden="true" />}
            </button>
          )
        })}
      </div>

      {vybranyDen && (
        <div className="kalendar-detail">
          <div className="kalendar-detail-hlavicka">
            <h3>{zobrazitDatum(vybranyDen)}</h3>
            {!formOtevreny && (
              <button className="kalendar-pridat-btn" onClick={() => setFormOtevreny(true)}>
                + Přidat
              </button>
            )}
          </div>

          <div className="kalendar-barvy-radek" role="group" aria-label="Barva dne">
            <button
              className={`kalendar-barva-vzorek kalendar-barva-vzorek--bez ${
                !barvyDni[vybranyDen] ? 'je-vybrana' : ''
              }`}
              aria-label="Bez barvy"
              aria-pressed={!barvyDni[vybranyDen]}
              onClick={() => nastavBarvuDne(vybranyDen, null)}
            >
              ✕
            </button>
            {BARVY_DNE.map((barva) => (
              <button
                key={barva}
                className={`kalendar-barva-vzorek kalendar-barva-vzorek--${barva} ${
                  barvyDni[vybranyDen] === barva ? 'je-vybrana' : ''
                }`}
                aria-label={NAZEV_BARVY[barva]}
                aria-pressed={barvyDni[vybranyDen] === barva}
                onClick={() => nastavBarvuDne(vybranyDen, barva)}
              />
            ))}
          </div>

          {hodinyVybraneho.length > 0 && (
            <div className="kalendar-rozvrh-radek">
              <span className="kalendar-rozvrh-popisek">📚 Podle rozvrhu</span>
              <ul className="kalendar-rozvrh-seznam">
                {hodinyVybraneho.map((h) => (
                  <li key={h.id}>
                    <span className="kalendar-rozvrh-cas">
                      {h.casOd}–{h.casDo}
                    </span>
                    <span className="kalendar-rozvrh-predmet">{h.predmet}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {udalostiDne.length === 0 && !formOtevreny && (
            <p className="kalendar-prazdno">Žádné události — přidej první.</p>
          )}

          {udalostiDne.length > 0 && (
            <ul className="kalendar-seznam">
              {udalostiDne.map((u) => (
                <li key={u.id} className="kalendar-polozka">
                  <div className="kalendar-polozka-text">
                    <strong>{u.nazev}</strong>
                    {u.opakovani !== 'zadne' && (
                      <span className="kalendar-polozka-opakovani">🔁 {NAZEV_OPAKOVANI[u.opakovani]}</span>
                    )}
                    {u.popis && <p>{u.popis}</p>}
                  </div>
                  <button
                    className="kalendar-smazat-btn"
                    onClick={() => {
                      if (window.confirm(`Smazat událost „${u.nazev}“?`)) smazatUdalost(u.id)
                    }}
                    aria-label={`Smazat ${u.nazev}`}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}

          {formOtevreny && (
            <form className="kalendar-form" onSubmit={handleSubmit}>
              <input
                placeholder="Název události"
                value={nazev}
                onChange={(e) => setNazev(e.target.value)}
                autoFocus
                required
              />
              <textarea
                placeholder="Poznámka (nepovinné)"
                value={popis}
                onChange={(e) => setPopis(e.target.value)}
                rows={2}
              />
              <select
                className="kalendar-form-opakovani"
                value={opakovani}
                onChange={(e) => setOpakovani(e.target.value as Opakovani)}
                aria-label="Opakování"
              >
                {MOZNOSTI_OPAKOVANI.map((o) => (
                  <option key={o} value={o}>
                    {NAZEV_OPAKOVANI[o]}
                  </option>
                ))}
              </select>
              <div className="kalendar-form-akce">
                <button type="button" className="kalendar-form-zrusit" onClick={() => setFormOtevreny(false)}>
                  Zrušit
                </button>
                <button type="submit" className="kalendar-form-ulozit">
                  Uložit
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
