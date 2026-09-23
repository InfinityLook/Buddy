import React, { useState } from 'react'
import { useZnamky } from './useZnamky'
import {
  MAX_ZNAMKA,
  MIN_ZNAMKA,
  Predmet,
  celkovyVazenyPrumer,
  soucetKreditu,
  spocitejProcentaCileProumeru,
  sPridanouHypotetickouZnamkou,
  vazenyPrumerPredmetu,
  znamkaSlovy,
} from './types'
import './Znamky.css'

const dnesniDatumIso = (): string => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const Znamky: React.FC = () => {
  const { predmety, pridatPredmet, smazatPredmet, pridatZnamku, smazatZnamku, nastavCilPredmetu } = useZnamky()

  const [formPredmetOtevreny, setFormPredmetOtevreny] = useState(false)
  const [nazevPredmetu, setNazevPredmetu] = useState('')
  const [kredityPredmetu, setKredityPredmetu] = useState('')

  const [rozbalenyPredmet, setRozbalenyPredmet] = useState<string | null>(null)
  const [hodnota, setHodnota] = useState(1)
  const [vaha, setVaha] = useState('1')
  const [popis, setPopis] = useState('')

  // Kalkulačka "co kdyby" — id předmětu, u kterého je otevřená, ne
  // globální přepínač, aby otevření jinde nezavíralo tu právě
  // rozjednanou. Hypotetická známka se nikdy neukládá, jen se dočasně
  // přimíchá do kopie seznamu předmětů (sPridanouHypotetickouZnamkou)
  // a appka na ní znovu spustí ty úplně stejné výpočty průměru.
  const [coKdybyOtevreno, setCoKdybyOtevreno] = useState<string | null>(null)
  const [coKdybyHodnota, setCoKdybyHodnota] = useState(1)
  const [coKdybyVaha, setCoKdybyVaha] = useState('1')

  // Cíl průměru pro jeden konkrétní předmět — stejný "otevřený formulář
  // je id předmětu, ne globální přepínač" vzor jako coKdybyOtevreno výš,
  // aby otevření cíle u jednoho předmětu nezavíralo rozjednaný cíl u
  // jiného. cilHodnota se naplní při otevření formuláře, ne live z p.cil,
  // takže psaní do inputu nepřepisuje uložený cíl dřív, než appka
  // dostane "Nastavit".
  const [cilFormOtevreny, setCilFormOtevreny] = useState<string | null>(null)
  const [cilHodnota, setCilHodnota] = useState('')

  const celkovyPrumer = celkovyVazenyPrumer(predmety)
  const celkoveKredity = soucetKreditu(predmety)

  const predmetyCoKdyby = coKdybyOtevreno
    ? sPridanouHypotetickouZnamkou(predmety, coKdybyOtevreno, coKdybyHodnota, Number(coKdybyVaha) || 1)
    : null
  const projektovanyPrumerPredmetu = predmetyCoKdyby
    ? vazenyPrumerPredmetu(predmetyCoKdyby.find((p) => p.id === coKdybyOtevreno)!)
    : null
  const projektovanyCelkovyPrumer = predmetyCoKdyby ? celkovyVazenyPrumer(predmetyCoKdyby) : null

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
    // Bez tohohle by "co kdyby" panel zůstal ukazovat na smazaný předmět
    // — projektovanyPrumerPredmetu se počítá na každém renderu bez
    // ohledu na to, jestli je rozbalovací panel vůbec vidět, takže
    // sPridanouHypotetickouZnamkou by vrátila seznam bez téhle položky
    // a .find(...)! by spadl na undefined (viz CLAUDE.md).
    if (coKdybyOtevreno === p.id) setCoKdybyOtevreno(null)
    if (cilFormOtevreny === p.id) setCilFormOtevreny(null)
  }

  const otevritCilForm = (p: Predmet) => {
    setCilHodnota(p.cil != null ? String(p.cil) : '')
    setCilFormOtevreny(cilFormOtevreny === p.id ? null : p.id)
  }

  const ulozitCilPredmetu = (e: React.FormEvent, predmetId: string) => {
    e.preventDefault()
    const hodnota = Number(cilHodnota)
    if (!cilHodnota.trim() || !Number.isFinite(hodnota)) return
    nastavCilPredmetu(predmetId, Math.max(MIN_ZNAMKA, Math.min(MAX_ZNAMKA, hodnota)))
    setCilFormOtevreny(null)
  }

  const zrusitCilPredmetu = (predmetId: string) => {
    nastavCilPredmetu(predmetId, null)
    setCilFormOtevreny(null)
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
                  <div className="znamky-cil-panel">
                    {(() => {
                      const cilProcenta = spocitejProcentaCileProumeru(prumer, p.cil ?? null)
                      return cilProcenta !== null && p.cil != null ? (
                        <div className="znamky-cil-progres-wrap">
                          <div className="znamky-cil-progres-hlavicka">
                            <span>
                              {prumer!.toFixed(2)} / cíl {p.cil.toFixed(1)}
                            </span>
                            <button
                              type="button"
                              className="znamky-cil-upravit"
                              onClick={() => otevritCilForm(p)}
                            >
                              ✎ Upravit
                            </button>
                          </div>
                          <div
                            className="znamky-cil-progres-bar"
                            role="progressbar"
                            aria-valuenow={cilProcenta}
                            aria-valuemin={0}
                            aria-valuemax={100}
                          >
                            <div
                              className="znamky-cil-progres-vypln"
                              style={{ width: `${cilProcenta}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <button type="button" className="znamky-cil-nastavit-btn" onClick={() => otevritCilForm(p)}>
                          🎯 Nastavit cíl průměru
                        </button>
                      )
                    })()}

                    {cilFormOtevreny === p.id && (
                      <form className="znamky-cil-form" onSubmit={(e) => ulozitCilPredmetu(e, p.id)}>
                        <input
                          type="number"
                          min={MIN_ZNAMKA}
                          max={MAX_ZNAMKA}
                          step={0.1}
                          placeholder={`Cíl (${MIN_ZNAMKA}–${MAX_ZNAMKA})`}
                          value={cilHodnota}
                          onChange={(e) => setCilHodnota(e.target.value)}
                          autoFocus
                        />
                        <button type="submit" className="znamky-cil-ulozit">
                          Uložit
                        </button>
                        {p.cil != null && (
                          <button type="button" className="znamky-cil-zrusit" onClick={() => zrusitCilPredmetu(p.id)}>
                            Zrušit cíl
                          </button>
                        )}
                      </form>
                    )}
                  </div>

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
                          onClick={() => {
                            if (window.confirm(`Smazat známku ${z.hodnota} z ${p.nazev}?`)) smazatZnamku(p.id, z.id)
                          }}
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

                  <button
                    type="button"
                    className="znamky-cokdyby-btn"
                    onClick={() => setCoKdybyOtevreno(coKdybyOtevreno === p.id ? null : p.id)}
                  >
                    🔮 {coKdybyOtevreno === p.id ? 'Skrýt' : 'Co kdyby…'}
                  </button>

                  {coKdybyOtevreno === p.id && (
                    <div className="znamky-cokdyby">
                      <p className="znamky-cokdyby-popis">
                        Jaký dopad by měla další známka na průměr, než ji doopravdy zapíšeš?
                      </p>
                      <div className="znamky-cokdyby-form">
                        <select value={coKdybyHodnota} onChange={(e) => setCoKdybyHodnota(Number(e.target.value))}>
                          {Array.from({ length: MAX_ZNAMKA - MIN_ZNAMKA + 1 }, (_, i) => MIN_ZNAMKA + i).map((h) => (
                            <option key={h} value={h}>
                              {h} — {znamkaSlovy(h)}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min={0.5}
                          step={0.5}
                          placeholder="Váha"
                          value={coKdybyVaha}
                          onChange={(e) => setCoKdybyVaha(e.target.value)}
                        />
                      </div>
                      <div className="znamky-cokdyby-vysledek">
                        <span>
                          Průměr předmětu: <strong>{projektovanyPrumerPredmetu?.toFixed(2) ?? '—'}</strong>
                        </span>
                        <span>
                          Celkový průměr: <strong>{projektovanyCelkovyPrumer?.toFixed(2) ?? '—'}</strong>
                        </span>
                      </div>
                    </div>
                  )}

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
