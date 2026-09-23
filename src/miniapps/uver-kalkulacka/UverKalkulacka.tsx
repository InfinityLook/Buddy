import React, { useMemo, useState } from 'react'
import { plural } from '@/core/utils/pluralCZ'
import { useUverKalkulacka } from './useUverKalkulacka'
import { sestavAmortizacniPlan, vypocitejAnuitniSplatku, celkovyPreplatek, simulujSplaceniDluhu } from './types'
import type { MetodaSplaceni } from './types'
import './UverKalkulacka.css'

const formatKc = (n: number) => `${Math.round(n).toLocaleString('cs-CZ')} Kč`

type Zalozka = 'jedna' | 'vic'

export const UverKalkulacka: React.FC = () => {
  const { dluhy, pridatDluh, smazatDluh } = useUverKalkulacka()
  const [zalozka, setZalozka] = useState<Zalozka>('jedna')

  // ------------------------------------------
  // JEDNA PŮJČKA
  // ------------------------------------------
  const [jistina, setJistina] = useState('300000')
  const [urok, setUrok] = useState('7.5')
  const [dobaMesicu, setDobaMesicu] = useState('60')

  const j = Number(jistina) || 0
  const u = Number(urok) || 0
  const dm = Math.max(1, Math.round(Number(dobaMesicu) || 1))

  const splatka = useMemo(() => vypocitejAnuitniSplatku(j, u, dm), [j, u, dm])
  const plan = useMemo(() => sestavAmortizacniPlan(j, u, dm), [j, u, dm])
  const preplatek = useMemo(() => celkovyPreplatek(plan), [plan])

  const rocniBodyPujcky = useMemo(() => {
    const pocetLet = Math.ceil(dm / 12)
    const body: { rok: number; zbyva: number }[] = []
    for (let rok = 1; rok <= pocetLet; rok++) {
      const index = Math.min(plan.length, rok * 12) - 1
      const bod = plan[index]
      if (bod) body.push({ rok, zbyva: bod.zbyvajiciJistina })
    }
    return body
  }, [plan, dm])
  const maxZbyva = Math.max(1, j, ...rocniBodyPujcky.map((b) => b.zbyva))

  // ------------------------------------------
  // VÍC DLUHŮ
  // ------------------------------------------
  const [novyNazev, setNovyNazev] = useState('')
  const [novyZustatek, setNovyZustatek] = useState('')
  const [novyUrok, setNovyUrok] = useState('')
  const [novaSplatka, setNovaSplatka] = useState('')
  const [rozpocetNavic, setRozpocetNavic] = useState('1000')
  const [metoda, setMetoda] = useState<MetodaSplaceni>('lavina')

  const handlePridatDluh = (e: React.FormEvent) => {
    e.preventDefault()
    pridatDluh(novyNazev, Number(novyZustatek) || 0, Number(novyUrok) || 0, Number(novaSplatka) || 0)
    setNovyNazev('')
    setNovyZustatek('')
    setNovyUrok('')
    setNovaSplatka('')
  }

  const vysledek = useMemo(
    () => (dluhy.length > 0 ? simulujSplaceniDluhu(dluhy, Number(rozpocetNavic) || 0, metoda) : null),
    [dluhy, rozpocetNavic, metoda]
  )

  const rocniBodyDluhu = useMemo(() => {
    if (!vysledek) return []
    const pocetLet = Math.ceil(vysledek.celkovyPocetMesicu / 12)
    const body: { rok: number; zbyva: number }[] = []
    for (let rok = 1; rok <= pocetLet; rok++) {
      const index = Math.min(vysledek.prubeh.length, rok * 12) - 1
      const bod = vysledek.prubeh[index]
      if (bod) body.push({ rok, zbyva: bod.zbyvajiciCelkem })
    }
    return body
  }, [vysledek])
  const celkovyPocatecniDluh = dluhy.reduce((s, d) => s + d.zustatek, 0)
  const maxZbyvaDluhu = Math.max(1, celkovyPocatecniDluh, ...rocniBodyDluhu.map((b) => b.zbyva))

  return (
    <div className="uver">
      <div className="uver-zalozky" role="tablist" aria-label="Splátkový kalkulátor">
        <button
          role="tab"
          aria-selected={zalozka === 'jedna'}
          className={`uver-zalozka-btn ${zalozka === 'jedna' ? 'je-vybrana' : ''}`}
          onClick={() => setZalozka('jedna')}
        >
          Jedna půjčka
        </button>
        <button
          role="tab"
          aria-selected={zalozka === 'vic'}
          className={`uver-zalozka-btn ${zalozka === 'vic' ? 'je-vybrana' : ''}`}
          onClick={() => setZalozka('vic')}
        >
          Více dluhů
        </button>
      </div>

      {zalozka === 'jedna' ? (
        <div className="uver-panel">
          <h2>Amortizační plán</h2>
          <div className="uver-form-grid">
            <label>
              Výše půjčky (Kč)
              <input type="number" min={0} value={jistina} onChange={(e) => setJistina(e.target.value)} />
            </label>
            <label>
              Roční úrok (%)
              <input type="number" min={0} step={0.1} value={urok} onChange={(e) => setUrok(e.target.value)} />
            </label>
            <label>
              Doba splácení (měsíce)
              <input type="number" min={1} max={480} value={dobaMesicu} onChange={(e) => setDobaMesicu(e.target.value)} />
            </label>
          </div>

          <div className="uver-souhrn">
            <div className="uver-souhrn-polozka uver-souhrn-polozka--zvyrazneno">
              <span>Měsíční splátka</span>
              <strong>{formatKc(splatka)}</strong>
            </div>
            <div className="uver-souhrn-polozka">
              <span>Celkový přeplatek</span>
              <strong>{formatKc(preplatek)}</strong>
            </div>
            <div className="uver-souhrn-polozka">
              <span>Celkem zaplaceno</span>
              <strong>{formatKc(j + preplatek)}</strong>
            </div>
          </div>

          {rocniBodyPujcky.length > 0 && (
            <>
              <p className="uver-graf-nadpis">Zbývající jistina podle roku</p>
              <div className="uver-graf" role="img" aria-label="Sloupcový graf zbývající jistiny podle roku splácení">
                {rocniBodyPujcky.map((b) => (
                  <div key={b.rok} className="uver-graf-sloupec-wrap">
                    <div
                      className="uver-graf-sloupec"
                      style={{ height: `${Math.max(2, (b.zbyva / maxZbyva) * 100)}%` }}
                      title={`Rok ${b.rok}: ${formatKc(b.zbyva)} zbývá`}
                    />
                    <span className="uver-graf-popisek">{b.rok}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="uver-panel">
            <h2>Moje dluhy</h2>
            <form className="uver-form-grid uver-form-grid--dluh" onSubmit={handlePridatDluh}>
              <input placeholder="Název (např. Kreditka)" value={novyNazev} onChange={(e) => setNovyNazev(e.target.value)} required />
              <input
                type="number"
                min={1}
                placeholder="Zůstatek (Kč)"
                value={novyZustatek}
                onChange={(e) => setNovyZustatek(e.target.value)}
                required
              />
              <input
                type="number"
                min={0}
                step={0.1}
                placeholder="Roční úrok (%)"
                value={novyUrok}
                onChange={(e) => setNovyUrok(e.target.value)}
              />
              <input
                type="number"
                min={1}
                placeholder="Min. splátka (Kč)"
                value={novaSplatka}
                onChange={(e) => setNovaSplatka(e.target.value)}
                required
              />
              <button type="submit" className="uver-pridat-btn">
                + Přidat dluh
              </button>
            </form>

            {dluhy.length === 0 ? (
              <p className="uver-prazdno">Zatím žádný dluh v seznamu.</p>
            ) : (
              <div className="uver-dluhy-seznam">
                {dluhy.map((d) => (
                  <div key={d.id} className="uver-dluh-radek">
                    <div className="uver-dluh-text">
                      <strong>{d.nazev}</strong>
                      <span>
                        {formatKc(d.zustatek)} · {d.urokRocniProcenta} % · min. {formatKc(d.minimalniSplatka)}/měs.
                      </span>
                    </div>
                    <button
                      className="uver-smazat-btn"
                      aria-label={`Smazat dluh ${d.nazev}`}
                      onClick={() => {
                        if (window.confirm(`Smazat dluh „${d.nazev}“?`)) smazatDluh(d.id)
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {dluhy.length > 0 && (
            <div className="uver-panel">
              <h2>Plán splácení</h2>
              <div className="uver-form-grid">
                <label>
                  Rozpočet navíc měsíčně (Kč)
                  <input type="number" min={0} value={rozpocetNavic} onChange={(e) => setRozpocetNavic(e.target.value)} />
                </label>
                <div className="uver-metoda-radek" role="group" aria-label="Metoda splácení">
                  <button
                    type="button"
                    className={`uver-metoda-btn ${metoda === 'snehova-koule' ? 'je-vybrana' : ''}`}
                    onClick={() => setMetoda('snehova-koule')}
                  >
                    ❄️ Sněhová koule
                  </button>
                  <button
                    type="button"
                    className={`uver-metoda-btn ${metoda === 'lavina' ? 'je-vybrana' : ''}`}
                    onClick={() => setMetoda('lavina')}
                  >
                    🏔️ Lavina
                  </button>
                </div>
              </div>

              {vysledek && (
                <>
                  {vysledek.nedokonceno ? (
                    <p className="uver-varovani">
                      ⚠️ Ani za 50 let by se s tímhle rozpočtem dluhy nesplatily — minimální splátky a rozpočet navíc
                      nestíhají pokrýt narůstající úrok. Zvyš rozpočet navíc.
                    </p>
                  ) : (
                    <div className="uver-souhrn">
                      <div className="uver-souhrn-polozka uver-souhrn-polozka--zvyrazneno">
                        <span>Splaceno za</span>
                        <strong>
                          {Math.floor(vysledek.celkovyPocetMesicu / 12) > 0 &&
                            `${Math.floor(vysledek.celkovyPocetMesicu / 12)} ${plural(Math.floor(vysledek.celkovyPocetMesicu / 12), 'rok', 'roky', 'let')} `}
                          {vysledek.celkovyPocetMesicu % 12} {plural(vysledek.celkovyPocetMesicu % 12, 'měsíc', 'měsíce', 'měsíců')}
                        </strong>
                      </div>
                      <div className="uver-souhrn-polozka">
                        <span>Celkový úrok</span>
                        <strong>{formatKc(vysledek.celkovyUrok)}</strong>
                      </div>
                    </div>
                  )}

                  {vysledek.poradiSplaceni.length > 0 && (
                    <div className="uver-poradi-seznam">
                      {vysledek.poradiSplaceni.map((p, i) => (
                        <div key={p.id} className="uver-poradi-radek">
                          <span className="uver-poradi-cislo">{i + 1}.</span>
                          <span className="uver-poradi-nazev">{p.nazev}</span>
                          <span className="uver-poradi-mesic">{p.mesicSplaceni}. měsíc</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {rocniBodyDluhu.length > 0 && (
                    <>
                      <p className="uver-graf-nadpis">Zbývající celkový dluh podle roku</p>
                      <div className="uver-graf" role="img" aria-label="Sloupcový graf zbývajícího dluhu podle roku splácení">
                        {rocniBodyDluhu.map((b) => (
                          <div key={b.rok} className="uver-graf-sloupec-wrap">
                            <div
                              className="uver-graf-sloupec"
                              style={{ height: `${Math.max(2, (b.zbyva / maxZbyvaDluhu) * 100)}%` }}
                              title={`Rok ${b.rok}: ${formatKc(b.zbyva)} zbývá`}
                            />
                            <span className="uver-graf-popisek">{b.rok}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
