import React, { useMemo, useState } from 'react'
import { plural } from '@/core/utils/pluralCZ'
import { useSporiciSimulator } from './useSporiciSimulator'
import { simulujSporeni, vypocitejPotrebnyMesicniVklad } from './types'
import './SporiciSimulator.css'

const formatKc = (n: number) => `${Math.round(n).toLocaleString('cs-CZ')} Kč`
// "Po dobu" (kolik let appka spoří) chce genitiv — 1 = "roku", 2 i víc
// = "let" (na rozdíl od plural()'s 3cestného nominativu "rok/roky/let",
// tenhle tvar má jen dvě varianty).
const rokyGenitiv = (r: number) => (r === 1 ? 'roku' : 'let')
// "Po" + lokativ ("po roce"/"po letech") — taky dvoucestné, ne 3cestné.
const rokyLokativ = (r: number) => (r === 1 ? 'roce' : 'letech')

export const SporiciSimulator: React.FC = () => {
  const { scenare, ulozitScenar, smazatScenar } = useSporiciSimulator()

  const [pocatecniVklad, setPocatecniVklad] = useState('10000')
  const [mesicniVklad, setMesicniVklad] = useState('2000')
  const [urok, setUrok] = useState('4')
  const [roky, setRoky] = useState('10')

  const [cilovaCastka, setCilovaCastka] = useState('500000')

  const [nazevScenare, setNazevScenare] = useState('')
  const [zobrazUlozeni, setZobrazUlozeni] = useState(false)

  const pv = Number(pocatecniVklad) || 0
  const mv = Number(mesicniVklad) || 0
  const u = Number(urok) || 0
  const r = Math.max(1, Math.round(Number(roky) || 1))

  const body = useMemo(() => simulujSporeni(pv, mv, u, r), [pv, mv, u, r])
  const posledni = body[body.length - 1]
  const maxCelkem = Math.max(1, ...body.map((b) => b.celkem))

  const potrebnyVklad = useMemo(
    () => vypocitejPotrebnyMesicniVklad(Number(cilovaCastka) || 0, pv, u, r),
    [cilovaCastka, pv, u, r]
  )

  const handleUlozit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nazevScenare.trim()) return
    ulozitScenar(nazevScenare, pv, mv, u, r)
    setNazevScenare('')
    setZobrazUlozeni(false)
  }

  const nacistScenar = (s: (typeof scenare)[number]) => {
    setPocatecniVklad(String(s.pocatecniVklad))
    setMesicniVklad(String(s.mesicniVklad))
    setUrok(String(s.rocniUrokProcenta))
    setRoky(String(s.pocetLet))
  }

  return (
    <div className="spsim">
      <p className="spsim-disclaimer">
        📊 Jde o simulaci s pevně zadaným úrokem, ne investiční radu — skutečné zhodnocení se
        v čase mění a appka žádná reálná tržní data nesleduje.
      </p>

      <div className="spsim-panel">
        <h2>Kolik naspořím</h2>
        <div className="spsim-form-grid">
          <label>
            Počáteční vklad (Kč)
            <input type="number" min={0} value={pocatecniVklad} onChange={(e) => setPocatecniVklad(e.target.value)} />
          </label>
          <label>
            Měsíční vklad (Kč)
            <input type="number" min={0} value={mesicniVklad} onChange={(e) => setMesicniVklad(e.target.value)} />
          </label>
          <label>
            Roční úrok (%)
            <input type="number" min={0} step={0.1} value={urok} onChange={(e) => setUrok(e.target.value)} />
          </label>
          <label>
            Doba spoření (roky)
            <input type="number" min={1} max={60} value={roky} onChange={(e) => setRoky(e.target.value)} />
          </label>
        </div>

        {posledni && (
          <div className="spsim-souhrn">
            <div className="spsim-souhrn-polozka">
              <span>Vloženo celkem</span>
              <strong>{formatKc(posledni.vlozeno)}</strong>
            </div>
            <div className="spsim-souhrn-polozka spsim-souhrn-polozka--zisk">
              <span>Úrok/zisk</span>
              <strong>{formatKc(posledni.urok)}</strong>
            </div>
            <div className="spsim-souhrn-polozka spsim-souhrn-polozka--celkem">
              <span>Celkem po {r} {rokyLokativ(r)}</span>
              <strong>{formatKc(posledni.celkem)}</strong>
            </div>
          </div>
        )}

        <div className="spsim-graf" role="img" aria-label="Sloupcový graf růstu úspor po jednotlivých letech">
          {body.map((b) => (
            <div key={b.rok} className="spsim-graf-sloupec-wrap">
              <div className="spsim-graf-sloupec" style={{ height: '100%' }}>
                <div
                  className="spsim-graf-segment spsim-graf-segment--urok"
                  style={{ height: `${(b.urok / maxCelkem) * 100}%` }}
                  title={`Úrok rok ${b.rok}: ${formatKc(b.urok)}`}
                />
                <div
                  className="spsim-graf-segment spsim-graf-segment--vlozeno"
                  style={{ height: `${(b.vlozeno / maxCelkem) * 100}%` }}
                  title={`Vloženo do roku ${b.rok}: ${formatKc(b.vlozeno)}`}
                />
              </div>
              <span className="spsim-graf-popisek">{b.rok}</span>
            </div>
          ))}
        </div>
        <div className="spsim-legenda">
          <span><i className="spsim-legenda-tecka spsim-legenda-tecka--vlozeno" /> Vloženo</span>
          <span><i className="spsim-legenda-tecka spsim-legenda-tecka--urok" /> Úrok/zisk</span>
        </div>

        {!zobrazUlozeni ? (
          <button className="spsim-ulozit-btn" onClick={() => setZobrazUlozeni(true)}>
            💾 Uložit tenhle scénář
          </button>
        ) : (
          <form className="spsim-mini-form" onSubmit={handleUlozit}>
            <input
              placeholder="Název scénáře (např. Na auto)"
              value={nazevScenare}
              onChange={(e) => setNazevScenare(e.target.value)}
              autoFocus
            />
            <button type="submit">Uložit</button>
            <button type="button" onClick={() => setZobrazUlozeni(false)}>
              Zrušit
            </button>
          </form>
        )}
      </div>

      <div className="spsim-panel">
        <h2>Kolik měsíčně potřebuji</h2>
        <p className="spsim-panel-popis">Kolik ušetřit každý měsíc, aby appka za zadanou dobu a úrok dosáhla cíle.</p>
        <label className="spsim-cil-input">
          Cílová částka (Kč)
          <input type="number" min={0} value={cilovaCastka} onChange={(e) => setCilovaCastka(e.target.value)} />
        </label>
        <p className="spsim-vysledek-vkladu">
          {potrebnyVklad === 0 ? (
            <>Se současným počátečním vkladem cíl už splňuješ 🎉</>
          ) : (
            <>
              Potřebuješ spořit <strong>{formatKc(potrebnyVklad)}</strong> měsíčně po dobu {r} {rokyGenitiv(r)}.
            </>
          )}
        </p>
      </div>

      {scenare.length > 0 && (
        <div className="spsim-panel">
          <h2>Uložené scénáře</h2>
          <div className="spsim-scenare-seznam">
            {scenare.map((s) => (
              <div key={s.id} className="spsim-scenar-radek">
                <div className="spsim-scenar-text">
                  <strong>{s.nazev}</strong>
                  <span>
                    {formatKc(s.pocatecniVklad)} + {formatKc(s.mesicniVklad)}/měs. · {s.rocniUrokProcenta} % ·{' '}
                    {s.pocetLet} {plural(s.pocetLet, 'rok', 'roky', 'let')}
                  </span>
                </div>
                <div className="spsim-scenar-akce">
                  <button onClick={() => nacistScenar(s)}>Použít</button>
                  <button
                    className="spsim-smazat-btn"
                    aria-label={`Smazat scénář ${s.nazev}`}
                    onClick={() => {
                      if (window.confirm(`Smazat scénář „${s.nazev}“?`)) smazatScenar(s.id)
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
