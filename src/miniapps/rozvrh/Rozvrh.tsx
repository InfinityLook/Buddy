import React, { useState } from 'react'
import { stahnoutBlob } from '@/core/utils/download'
import { useRozvrh } from './useRozvrh'
import {
  DNY_V_TYDNU,
  DenVTydnu,
  HodinaRozvrhu,
  PRAH_RIZIKA_DOCHAZKY,
  dnesniDatumIso,
  hodinyDnes,
  klicDochazky,
  sestavIcsRozvrhu,
  spocitejDochazkuPodlePredmetu,
} from './types'
import './Rozvrh.css'

type Zalozka = 'rozvrh' | 'dochazka'

const PRAZDNY_FORM = { den: 1 as DenVTydnu, casOd: '08:00', casDo: '09:40', predmet: '', mistnost: '', vyucujici: '' }

export const Rozvrh: React.FC = () => {
  const { hodiny, dochazka, pridatHodinu, updateHodinu, smazatHodinu, oznacitDochazku } = useRozvrh()
  const [zalozka, setZalozka] = useState<Zalozka>('rozvrh')
  const [formOtevreny, setFormOtevreny] = useState(false)
  const [upravovanaId, setUpravovanaId] = useState<string | null>(null)
  const [form, setForm] = useState(PRAZDNY_FORM)

  const dnesniIso = dnesniDatumIso()
  const dnesek = hodinyDnes(hodiny)
  const dochazkaPredmetu = spocitejDochazkuPodlePredmetu(hodiny, dochazka)

  const otevritPridani = () => {
    setUpravovanaId(null)
    setForm(PRAZDNY_FORM)
    setFormOtevreny(true)
  }

  const otevritUpravu = (h: HodinaRozvrhu) => {
    setUpravovanaId(h.id)
    setForm({ den: h.den, casOd: h.casOd, casDo: h.casDo, predmet: h.predmet, mistnost: h.mistnost, vyucujici: h.vyucujici })
    setFormOtevreny(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.predmet.trim()) return

    if (upravovanaId) {
      updateHodinu(upravovanaId, form)
    } else {
      pridatHodinu(form.den, form.casOd, form.casDo, form.predmet, form.mistnost, form.vyucujici)
    }
    setFormOtevreny(false)
    setUpravovanaId(null)
    setForm(PRAZDNY_FORM)
  }

  const smazat = (h: HodinaRozvrhu) => {
    if (!window.confirm(`Smazat hodinu „${h.predmet}“?`)) return
    smazatHodinu(h.id)
  }

  const exportIcs = () => {
    if (hodiny.length === 0) return
    stahnoutBlob('rozvrh.ics', new Blob([sestavIcsRozvrhu(hodiny)], { type: 'text/calendar;charset=utf-8' }))
  }

  const hodinyPodleDne = (den: DenVTydnu) => hodiny.filter((h) => h.den === den)

  return (
    <div className="rozvrh">
      <div className="rozvrh-zalozky" role="tablist">
        <button
          role="tab"
          aria-selected={zalozka === 'rozvrh'}
          className={`rozvrh-zalozka ${zalozka === 'rozvrh' ? 'je-aktivni' : ''}`}
          onClick={() => setZalozka('rozvrh')}
        >
          🗓 Rozvrh
        </button>
        <button
          role="tab"
          aria-selected={zalozka === 'dochazka'}
          className={`rozvrh-zalozka ${zalozka === 'dochazka' ? 'je-aktivni' : ''}`}
          onClick={() => setZalozka('dochazka')}
        >
          ✅ Docházka
        </button>
      </div>

      {zalozka === 'rozvrh' && (
        <>
          <div className="rozvrh-horni-lista">
            <button className="rozvrh-pridat-btn" onClick={otevritPridani}>
              + Přidat hodinu
            </button>
            <button
              className="rozvrh-export-btn"
              onClick={exportIcs}
              disabled={hodiny.length === 0}
              aria-label="Exportovat rozvrh do kalendáře"
            >
              ⬇ Export .ics
            </button>
          </div>

          {hodiny.length === 0 && <p className="rozvrh-prazdno">Zatím žádné hodiny — přidej první.</p>}

          {DNY_V_TYDNU.map((den) => {
            const hodinyDne = hodinyPodleDne(den.id)
            if (hodinyDne.length === 0) return null
            return (
              <div key={den.id} className="rozvrh-den-blok">
                <h3>{den.nazev}</h3>
                <ul className="rozvrh-seznam">
                  {hodinyDne.map((h) => (
                    <li key={h.id} className="rozvrh-polozka">
                      <span className="rozvrh-polozka-cas">
                        {h.casOd}–{h.casDo}
                      </span>
                      <div className="rozvrh-polozka-text">
                        <strong>{h.predmet}</strong>
                        {(h.mistnost || h.vyucujici) && (
                          <p>
                            {h.mistnost}
                            {h.mistnost && h.vyucujici && ' · '}
                            {h.vyucujici}
                          </p>
                        )}
                      </div>
                      <button className="rozvrh-upravit-btn" onClick={() => otevritUpravu(h)} aria-label={`Upravit ${h.predmet}`}>
                        ✏️
                      </button>
                      <button className="rozvrh-smazat-btn" onClick={() => smazat(h)} aria-label={`Smazat ${h.predmet}`}>
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}

          {formOtevreny && (
            <form className="rozvrh-form" onSubmit={handleSubmit}>
              <label className="rozvrh-form-radek">
                <span>Den</span>
                <select value={form.den} onChange={(e) => setForm({ ...form, den: Number(e.target.value) as DenVTydnu })}>
                  {DNY_V_TYDNU.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nazev}
                    </option>
                  ))}
                </select>
              </label>
              <div className="rozvrh-form-cas">
                <label className="rozvrh-form-radek">
                  <span>Od</span>
                  <input type="time" value={form.casOd} onChange={(e) => setForm({ ...form, casOd: e.target.value })} required />
                </label>
                <label className="rozvrh-form-radek">
                  <span>Do</span>
                  <input type="time" value={form.casDo} onChange={(e) => setForm({ ...form, casDo: e.target.value })} required />
                </label>
              </div>
              <input
                placeholder="Předmět"
                value={form.predmet}
                onChange={(e) => setForm({ ...form, predmet: e.target.value })}
                spellCheck
                lang="cs"
                autoFocus
                required
              />
              <input
                placeholder="Místnost (nepovinné)"
                value={form.mistnost}
                onChange={(e) => setForm({ ...form, mistnost: e.target.value })}
                spellCheck
                lang="cs"
              />
              <input
                placeholder="Vyučující (nepovinné)"
                value={form.vyucujici}
                onChange={(e) => setForm({ ...form, vyucujici: e.target.value })}
                spellCheck
                lang="cs"
              />
              <div className="rozvrh-form-akce">
                <button type="button" className="rozvrh-form-zrusit" onClick={() => setFormOtevreny(false)}>
                  Zrušit
                </button>
                <button type="submit" className="rozvrh-form-ulozit">
                  {upravovanaId ? 'Uložit změny' : 'Přidat'}
                </button>
              </div>
            </form>
          )}
        </>
      )}

      {zalozka === 'dochazka' && (
        <>
          <div className="rozvrh-dochazka-dnes">
            <h3>Dnešní hodiny</h3>
            {dnesek.length === 0 && <p className="rozvrh-prazdno">Dnes podle rozvrhu žádná hodina není.</p>}
            {dnesek.map((h) => {
              const klic = klicDochazky(h.id, dnesniIso)
              const byl = dochazka[klic]
              return (
                <div key={h.id} className="rozvrh-dochazka-radek">
                  <span className="rozvrh-dochazka-text">
                    {h.casOd} · <strong>{h.predmet}</strong>
                  </span>
                  <div className="rozvrh-dochazka-tlacitka">
                    <button
                      className={`rozvrh-dochazka-btn rozvrh-dochazka-btn--byl ${byl === true ? 'je-vybrana' : ''}`}
                      onClick={() => oznacitDochazku(h.id, dnesniIso, byl === true ? null : true)}
                    >
                      Byl jsem
                    </button>
                    <button
                      className={`rozvrh-dochazka-btn rozvrh-dochazka-btn--nebyl ${byl === false ? 'je-vybrana' : ''}`}
                      onClick={() => oznacitDochazku(h.id, dnesniIso, byl === false ? null : false)}
                    >
                      Nebyl jsem
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="rozvrh-dochazka-prehled">
            <h3>Docházka podle předmětu</h3>
            {dochazkaPredmetu.length === 0 && (
              <p className="rozvrh-prazdno">Zatím žádné záznamy — označuj docházku výš.</p>
            )}
            {dochazkaPredmetu.map((d) => (
              <div key={d.predmet} className="rozvrh-dochazka-procenta-radek">
                <span className="rozvrh-dochazka-procenta-nazev">{d.predmet}</span>
                <div className="rozvrh-dochazka-lista">
                  <div
                    className={`rozvrh-dochazka-vypln ${d.procenta < PRAH_RIZIKA_DOCHAZKY ? 'je-riziko' : ''}`}
                    style={{ width: `${d.procenta}%` }}
                  />
                </div>
                <span className="rozvrh-dochazka-procenta-cislo">
                  {d.procenta}% ({d.pritomen}/{d.celkem})
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default Rozvrh
