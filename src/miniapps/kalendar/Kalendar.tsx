import React, { useState } from 'react'
import { naFormatDatumu, NAZVY_MESICU, rozlozeniMesice, useKalendar } from './useKalendar'
import './Kalendar.css'

const DNY_V_TYDNU = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne']

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
    pridatUdalost,
    smazatUdalost,
  } = useKalendar()

  const [formOtevreny, setFormOtevreny] = useState(false)
  const [nazev, setNazev] = useState('')
  const [popis, setPopis] = useState('')

  const { posunOdPondeli, pocetDni } = rozlozeniMesice(rok, mesic)
  const dnesniStr = naFormatDatumu(dnes.getFullYear(), dnes.getMonth(), dnes.getDate())

  const bunky: (number | null)[] = [
    ...Array(posunOdPondeli).fill(null),
    ...Array.from({ length: pocetDni }, (_, i) => i + 1),
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!vybranyDen || !nazev.trim()) return
    pridatUdalost(vybranyDen, nazev, popis)
    setNazev('')
    setPopis('')
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

          return (
            <button
              key={datumStr}
              className={`kalendar-den ${datumStr === dnesniStr ? 'je-dnes' : ''} ${
                datumStr === vybranyDen ? 'je-vybrany' : ''
              }`}
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

          {udalostiDne.length === 0 && !formOtevreny && (
            <p className="kalendar-prazdno">Žádné události — přidej první.</p>
          )}

          {udalostiDne.length > 0 && (
            <ul className="kalendar-seznam">
              {udalostiDne.map((u) => (
                <li key={u.id} className="kalendar-polozka">
                  <div className="kalendar-polozka-text">
                    <strong>{u.nazev}</strong>
                    {u.popis && <p>{u.popis}</p>}
                  </div>
                  <button
                    className="kalendar-smazat-btn"
                    onClick={() => smazatUdalost(u.id)}
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
