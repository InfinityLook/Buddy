import React, { useState } from 'react'
import { useZnamky } from './useZnamky'
import {
  MAX_ZNAMKA,
  MIN_ZNAMKA,
  Predmet,
  celkovyVazenyPrumer,
  soucetKreditu,
  vazenyPrumerPredmetu,
  znamkaSlovy,
} from './types'
import './Znamky.css'

const dnesniDatumIso = (): string => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const Znamky: React.FC = () => {
  const { predmety, pridatPredmet, smazatPredmet, pridatZnamku, smazatZnamku } = useZnamky()

  const [formPredmetOtevreny, setFormPredmetOtevreny] = useState(false)
  const [nazevPredmetu, setNazevPredmetu] = useState('')
  const [kredityPredmetu, setKredityPredmetu] = useState('')

  const [rozbalenyPredmet, setRozbalenyPredmet] = useState<string | null>(null)
  const [hodnota, setHodnota] = useState(1)
  const [vaha, setVaha] = useState('1')
  const [popis, setPopis] = useState('')

  const celkovyPrumer = celkovyVazenyPrumer(predmety)
  const celkoveKredity = soucetKreditu(predmety)

  const pridatNovyPredmet = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nazevPredmetu.trim()) return
    pridatPredmet(nazevPredmetu, Number(kredityPredmetu) || 0)
    setNazevPredmetu('')
    setKredityPredmetu('')
    setFormPredmetOtevreny(false)
  }

  const odebratPredmet = (p: Predmet) => {
    if (!window.confirm(`Smazat předmět „${p.nazev}“ i se všemi známkami?`)) return
    smazatPredmet(p.id)
    if (rozbalenyPredmet === p.id) setRozbalenyPredmet(null)
  }

  const pridatNovouZnamku = (e: React.FormEvent, predmetId: string) => {
    e.preventDefault()
    pridatZnamku(predmetId, hodnota, Number(vaha) || 1, popis, dnesniDatumIso())
    setPopis('')
    setVaha('1')
  }

  return (
    <div className="znamky">
      <div className="znamky-souhrn">
        <div className="znamky-souhrn-cislo">
          <span className="znamky-souhrn-hodnota">
            {celkovyPrumer !== null ? celkovyPrumer.toFixed(2) : '—'}
          </span>
          <span className="znamky-souhrn-popisek">Celkový průměr</span>
        </div>
        <div className="znamky-souhrn-cislo">
          <span className="znamky-souhrn-hodnota">{celkoveKredity}</span>
          <span className="znamky-souhrn-popisek">Kreditů celkem</span>
        </div>
      </div>

      <button className="znamky-pridat-btn" onClick={() => setFormPredmetOtevreny((o) => !o)}>
        + Přidat předmět
      </button>

      {formPredmetOtevreny && (
        <form className="znamky-form" onSubmit={pridatNovyPredmet}>
          <input
            placeholder="Název předmětu"
            value={nazevPredmetu}
            onChange={(e) => setNazevPredmetu(e.target.value)}
            spellCheck
            lang="cs"
            autoFocus
            required
          />
          <input
            type="number"
            min={0}
            placeholder="Kredity (nepovinné)"
            value={kredityPredmetu}
            onChange={(e) => setKredityPredmetu(e.target.value)}
          />
          <div className="znamky-form-akce">
            <button type="button" className="znamky-form-zrusit" onClick={() => setFormPredmetOtevreny(false)}>
              Zrušit
            </button>
            <button type="submit" className="znamky-form-ulozit">
              Přidat
            </button>
          </div>
        </form>
      )}

      {predmety.length === 0 && !formPredmetOtevreny && (
        <p className="znamky-prazdno">Zatím žádné předměty — přidej první.</p>
      )}

      <div className="znamky-seznam">
        {predmety.map((p) => {
          const prumer = vazenyPrumerPredmetu(p)
          const rozbaleno = rozbalenyPredmet === p.id
          return (
            <div key={p.id} className="znamky-predmet">
              <button
                className="znamky-predmet-hlavicka"
                onClick={() => setRozbalenyPredmet(rozbaleno ? null : p.id)}
              >
                <span className="znamky-predmet-nazev">
                  {p.nazev}
                  {p.kredity > 0 && <span className="znamky-predmet-kredity"> · {p.kredity} kr.</span>}
                </span>
                <span className="znamky-predmet-prumer">{prumer !== null ? prumer.toFixed(2) : '—'}</span>
              </button>

              {rozbaleno && (
                <div className="znamky-predmet-detail">
                  {p.znamky.length === 0 && <p className="znamky-prazdno">Zatím žádná známka.</p>}
                  <ul className="znamky-znamky-seznam">
                    {p.znamky.map((z) => (
                      <li key={z.id} className="znamky-znamka-radek">
                        <span className={`znamky-znamka-badge znamky-znamka-badge--${z.hodnota}`}>{z.hodnota}</span>
                        <span className="znamky-znamka-text">
                          {znamkaSlovy(z.hodnota)}
                          {z.popis && ` · ${z.popis}`}
                          {z.vaha !== 1 && ` (váha ${z.vaha})`}
                        </span>
                        <button
                          className="znamky-znamka-smazat"
                          aria-label="Smazat známku"
                          onClick={() => smazatZnamku(p.id, z.id)}
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>

                  <form className="znamky-znamka-form" onSubmit={(e) => pridatNovouZnamku(e, p.id)}>
                    <select value={hodnota} onChange={(e) => setHodnota(Number(e.target.value))}>
                      {Array.from({ length: MAX_ZNAMKA - MIN_ZNAMKA + 1 }, (_, i) => MIN_ZNAMKA + i).map((h) => (
                        <option key={h} value={h}>
                          {h} — {znamkaSlovy(h)}
                        </option>
                      ))}
                    </select>
                    {/* min musí sedět se step, jinak HTML5 constraint
                        validation tiše odmítne submit celého formuláře
                        (žádná viditelná chyba, jen "nic se nestane") — s
                        min={0.1} nebyla výchozí hodnota '1' platný násobek
                        kroku 0.5 od 0.1, takže "+ Známka" nikdy nešlo
                        odeslat, dokud uživatel váhu sám ručně nezměnil.
                        min={0.5} dělá z výchozí '1' platnou hodnotu
                        (1 − 0.5 = 0.5, přesně jeden krok). */}
                    <input
                      type="number"
                      min={0.5}
                      step={0.5}
                      placeholder="Váha"
                      value={vaha}
                      onChange={(e) => setVaha(e.target.value)}
                    />
                    <input
                      placeholder="Popis (test, aktivita…)"
                      value={popis}
                      onChange={(e) => setPopis(e.target.value)}
                      spellCheck
                      lang="cs"
                    />
                    <button type="submit" className="znamky-znamka-pridat">
                      + Známka
                    </button>
                  </form>

                  <button className="znamky-predmet-smazat" onClick={() => odebratPredmet(p)}>
                    Smazat celý předmět
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Znamky
