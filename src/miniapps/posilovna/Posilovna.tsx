import React, { useEffect, useState } from 'react'
import { plural } from '@/core/utils/pluralCZ'
import { usePosilovna } from './usePosilovna'
import { odemkniOdpocinekZvuk, ohlasKonecOdpocinku } from './odpocinekZvuk'
import {
  BEZNE_CVIKY,
  objemSezeni,
  celkovyObjem,
  pocetSerii,
  spocitejOsobniRekordy,
  formatujVahu,
  formatujObjem,
  type CvikVSezeni,
  type Serie,
  type PosilovaciSezeni,
  type SablonaTreninku,
} from './types'
import './Posilovna.css'

const formatDatum = (iso: string): string =>
  new Date(iso).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' })

const PRAZDNA_SERIE: Serie = { vahaKg: 0, opakovani: 0 }

// Výchozí odpočinek mezi sériemi — orientační číslo, ne appkou
// vypočtené z ničeho, stejná poctivost jako jinde v appce.
const VYCHOZI_ODPOCINEK_S = 90

const formatOdpocinek = (sekund: number): string => {
  const min = Math.floor(sekund / 60)
  const zbyleS = sekund % 60
  return `${min}:${String(zbyleS).padStart(2, '0')}`
}

// ==========================================
// Posilovna — deník vah a opakování (Fitness Roomova pátá fáze
// vylepšení). Na rozdíl od Form Checku appka tady nesleduje pohyb
// kamerou vůbec — uživatel si série zapíše sám, appka jen sečte
// objem (váha × opakování) a najde osobní rekordy z toho, co bylo
// doopravdy zvednuto. Žádná kamera, žádné GPS, kompletně zdarma.
// ==========================================
export const Posilovna: React.FC = () => {
  const posilovna = usePosilovna()

  const [cviky, setCviky] = useState<CvikVSezeni[]>([])
  const [novyCvikNazev, setNovyCvikNazev] = useState('')
  const [poznamka, setPoznamka] = useState('')
  const [rozbaleneId, setRozbaleneId] = useState<string | null>(null)
  const [ukladaSablonu, setUkladaSablonu] = useState(false)
  const [nazevSablony, setNazevSablony] = useState('')

  // Odpočinek mezi sériemi — appka drží absolutní čas konce
  // (Date.now() + N s), ne odpočítávání samo — stejný "absolutní
  // časová značka, ne ubíhající countdown" tvar jako Pomodorovo
  // endsAt jinde v appce, ať nic nezáleží na tom, jestli obrazovka
  // mezitím usnula. odpocinekIndexCviku != null znamená "právě
  // odpočívá cvik na tomhle indexu" — jeden odpočinek naráz.
  const [odpocinekIndexCviku, setOdpocinekIndexCviku] = useState<number | null>(null)
  const [odpocinekKonecCas, setOdpocinekKonecCas] = useState<number | null>(null)
  const [odpocinekZbyvaS, setOdpocinekZbyvaS] = useState(0)

  useEffect(() => {
    if (odpocinekKonecCas === null) return
    const tik = () => {
      const zbyva = Math.max(0, Math.round((odpocinekKonecCas - Date.now()) / 1000))
      setOdpocinekZbyvaS(zbyva)
      if (zbyva <= 0) {
        ohlasKonecOdpocinku()
        setOdpocinekIndexCviku(null)
        setOdpocinekKonecCas(null)
      }
    }
    tik()
    const interval = window.setInterval(tik, 250)
    return () => window.clearInterval(interval)
  }, [odpocinekKonecCas])

  const spustitOdpocinek = (indexCviku: number) => {
    odemkniOdpocinekZvuk()
    setOdpocinekIndexCviku(indexCviku)
    setOdpocinekKonecCas(Date.now() + VYCHOZI_ODPOCINEK_S * 1000)
  }

  const zrusitOdpocinek = () => {
    setOdpocinekIndexCviku(null)
    setOdpocinekKonecCas(null)
  }

  const pridatCvik = (nazev: string) => {
    const orezany = nazev.trim()
    if (!orezany) return
    setCviky((predchozi) => [...predchozi, { nazev: orezany, serie: [{ ...PRAZDNA_SERIE }] }])
    setNovyCvikNazev('')
  }

  const odebratCvik = (index: number) => setCviky((predchozi) => predchozi.filter((_, i) => i !== index))

  const pridatSerii = (indexCviku: number) => {
    setCviky((predchozi) =>
      predchozi.map((c, i) => {
        if (i !== indexCviku) return c
        const posledni = c.serie[c.serie.length - 1] ?? PRAZDNA_SERIE
        return { ...c, serie: [...c.serie, { ...posledni }] }
      })
    )
  }

  const odebratSerii = (indexCviku: number, indexSerie: number) => {
    setCviky((predchozi) =>
      predchozi.map((c, i) => (i === indexCviku ? { ...c, serie: c.serie.filter((_, j) => j !== indexSerie) } : c))
    )
  }

  const upravitSerii = (indexCviku: number, indexSerie: number, zmena: Partial<Serie>) => {
    setCviky((predchozi) =>
      predchozi.map((c, i) => {
        if (i !== indexCviku) return c
        return {
          ...c,
          serie: c.serie.map((s, j) => (j === indexSerie ? { ...s, ...zmena } : s)),
        }
      })
    )
  }

  const muzeUlozit = cviky.length > 0 && cviky.some((c) => c.serie.length > 0)

  const ulozit = () => {
    posilovna.pridatSezeni(cviky, poznamka.trim())
    setCviky([])
    setPoznamka('')
  }

  const potvrditUlozeniSablony = () => {
    const orezany = nazevSablony.trim()
    if (!orezany || cviky.length === 0) return
    posilovna.ulozitSablonu(
      orezany,
      cviky.map((c) => c.nazev)
    )
    setNazevSablony('')
    setUkladaSablonu(false)
  }

  // Naplní sestavovač jmény cviků ze šablony — každý s jednou prázdnou
  // sérií, stejný start jako u ručně přidaného cviku (pridatCvik výš).
  // Nepřepisuje rozdělaný trénink, jen k němu přidá další cviky.
  const pouzitSablonu = (sablona: SablonaTreninku) => {
    setCviky((predchozi) => [
      ...predchozi,
      ...sablona.cviky.map((nazev) => ({ nazev, serie: [{ ...PRAZDNA_SERIE }] })),
    ])
  }

  const smazat = (s: PosilovaciSezeni) => {
    if (window.confirm(`Smazat tenhle trénink z ${formatDatum(s.createdAt)}?`)) {
      posilovna.smazatSezeni(s.id)
      if (rozbaleneId === s.id) setRozbaleneId(null)
    }
  }

  const rekordy = spocitejOsobniRekordy(posilovna.sezeni)
  const nazvyRekordu = Object.keys(rekordy).sort((a, b) => a.localeCompare(b, 'cs'))

  return (
    <div className="posilovna-page">
      <h2 className="posilovna-nadpis">Posilovna</h2>
      <p className="posilovna-podtitul">Zapiš si série ručně — pro cviky, co kamera ověřit neumí.</p>

      <div className="posilovna-panel">
        <h3 className="posilovna-panel-nadpis">Nový trénink</h3>

        {cviky.length === 0 && <p className="posilovna-prazdno">Zatím žádný cvik — přidej první níž.</p>}

        {cviky.map((c, indexCviku) => (
          <div key={indexCviku} className="posilovna-cvik-karta">
            <div className="posilovna-cvik-hlavicka">
              <strong>{c.nazev}</strong>
              <button
                className="posilovna-cvik-odebrat"
                onClick={() => odebratCvik(indexCviku)}
                aria-label={`Odebrat cvik ${c.nazev}`}
              >
                ✕
              </button>
            </div>
            {c.serie.map((s, indexSerie) => (
              <div key={indexSerie} className="posilovna-serie-radek">
                <span className="posilovna-serie-cislo">{indexSerie + 1}.</span>
                <input
                  type="number"
                  inputMode="decimal"
                  className="posilovna-serie-input"
                  placeholder="kg"
                  value={s.vahaKg || ''}
                  onChange={(e) => upravitSerii(indexCviku, indexSerie, { vahaKg: Number(e.target.value) || 0 })}
                />
                <span className="posilovna-serie-krat">×</span>
                <input
                  type="number"
                  inputMode="numeric"
                  className="posilovna-serie-input"
                  placeholder="opak."
                  value={s.opakovani || ''}
                  onChange={(e) => upravitSerii(indexCviku, indexSerie, { opakovani: Number(e.target.value) || 0 })}
                />
                <button
                  className="posilovna-serie-odebrat"
                  onClick={() => odebratSerii(indexCviku, indexSerie)}
                  aria-label="Odebrat sérii"
                >
                  🗑
                </button>
              </div>
            ))}
            <div className="posilovna-cvik-akce">
              <button className="posilovna-pridat-serii" onClick={() => pridatSerii(indexCviku)}>
                + Série
              </button>
              {odpocinekIndexCviku === indexCviku ? (
                <div className="posilovna-odpocinek-bezici">
                  <span className="posilovna-odpocinek-cas">⏱ {formatOdpocinek(odpocinekZbyvaS)}</span>
                  <button className="posilovna-odpocinek-preskocit" onClick={zrusitOdpocinek}>
                    Přeskočit
                  </button>
                </div>
              ) : (
                <button className="posilovna-odpocinek-spustit" onClick={() => spustitOdpocinek(indexCviku)}>
                  ⏱ Odpočinek
                </button>
              )}
            </div>
          </div>
        ))}

        <div className="posilovna-novy-cvik">
          <div className="posilovna-cviky-chipy">
            {BEZNE_CVIKY.map((nazev) => (
              <button key={nazev} className="posilovna-chip" onClick={() => setNovyCvikNazev(nazev)}>
                {nazev}
              </button>
            ))}
          </div>
          <div className="posilovna-novy-cvik-radek">
            <input
              type="text"
              className="posilovna-novy-cvik-input"
              placeholder="Název cviku…"
              value={novyCvikNazev}
              onChange={(e) => setNovyCvikNazev(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') pridatCvik(novyCvikNazev)
              }}
            />
            <button className="posilovna-pridat-cvik" onClick={() => pridatCvik(novyCvikNazev)} disabled={!novyCvikNazev.trim()}>
              + Přidat cvik
            </button>
          </div>
        </div>

        <textarea
          className="posilovna-poznamka"
          placeholder="Poznámka k tréninku (nepovinné)…"
          value={poznamka}
          onChange={(e) => setPoznamka(e.target.value)}
          rows={2}
        />

        <div className="posilovna-akce-radek">
          <button className="posilovna-ulozit-btn" onClick={ulozit} disabled={!muzeUlozit}>
            💾 Uložit sezení
          </button>
          <button
            className="posilovna-sablona-ulozit-btn"
            onClick={() => setUkladaSablonu((v) => !v)}
            disabled={cviky.length === 0}
          >
            📐 Uložit jako šablonu
          </button>
        </div>

        {ukladaSablonu && (
          <div className="posilovna-sablona-radek">
            <input
              type="text"
              className="posilovna-sablona-nazev-input"
              placeholder="Název šablony (např. Push Day)…"
              value={nazevSablony}
              onChange={(e) => setNazevSablony(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') potvrditUlozeniSablony()
              }}
            />
            <button
              className="posilovna-sablona-potvrdit-btn"
              onClick={potvrditUlozeniSablony}
              disabled={!nazevSablony.trim()}
            >
              Uložit
            </button>
          </div>
        )}
      </div>

      {posilovna.sablony.length > 0 && (
        <div className="posilovna-panel">
          <h3 className="posilovna-panel-nadpis">📐 Šablony</h3>
          <ul className="posilovna-sablony-seznam">
            {posilovna.sablony.map((sablona) => (
              <li key={sablona.id} className="posilovna-sablona-radek-polozka">
                <span className="posilovna-sablona-info">
                  <strong>{sablona.nazev}</strong>
                  <span className="posilovna-sablona-cviky">
                    {sablona.cviky.length} {plural(sablona.cviky.length, 'cvik', 'cviky', 'cviků')}:{' '}
                    {sablona.cviky.join(', ')}
                  </span>
                </span>
                <span className="posilovna-sablona-tlacitka">
                  <button className="posilovna-sablona-pouzit" onClick={() => pouzitSablonu(sablona)}>
                    ▶ Použít
                  </button>
                  <button
                    className="posilovna-sablona-smazat"
                    onClick={() => posilovna.smazatSablonu(sablona.id)}
                    aria-label={`Smazat šablonu ${sablona.nazev}`}
                  >
                    ✕
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {nazvyRekordu.length > 0 && (
        <div className="posilovna-panel">
          <h3 className="posilovna-panel-nadpis">🏆 Osobní rekordy</h3>
          <ul className="posilovna-rekordy-seznam">
            {nazvyRekordu.map((nazev) => (
              <li key={nazev} className="posilovna-rekord-radek">
                <span>{nazev}</span>
                <strong>
                  {formatujVahu(rekordy[nazev].vahaKg)} × {rekordy[nazev].opakovani}
                </strong>
              </li>
            ))}
          </ul>
        </div>
      )}

      <h3 className="posilovna-historie-nadpis">Historie</h3>
      {posilovna.sezeni.length === 0 ? (
        <p className="posilovna-prazdno">Zatím žádný uložený trénink — sestav první výš.</p>
      ) : (
        <>
          <p className="posilovna-celkovy-objem">
            Celkový objem napříč historií: <strong>{formatujObjem(celkovyObjem(posilovna.sezeni))}</strong>
          </p>
          <ul className="posilovna-historie-seznam">
            {posilovna.sezeni.map((s) => {
              const rozbaleno = rozbaleneId === s.id
              return (
                <li key={s.id} className="posilovna-historie-radek">
                  <button className="posilovna-historie-hlavicka" onClick={() => setRozbaleneId(rozbaleno ? null : s.id)}>
                    <span className="posilovna-historie-info">
                      <strong>
                        {s.cviky.length} {plural(s.cviky.length, 'cvik', 'cviky', 'cviků')} ·{' '}
                        {pocetSerii(s)} {plural(pocetSerii(s), 'série', 'série', 'sérií')}
                      </strong>
                      <br />
                      <span className="posilovna-historie-datum">
                        {formatDatum(s.createdAt)} · objem {formatujObjem(objemSezeni(s))}
                      </span>
                    </span>
                    <span className="posilovna-historie-sipka">{rozbaleno ? '▲' : '▼'}</span>
                  </button>
                  {rozbaleno && (
                    <div className="posilovna-historie-detail">
                      {s.cviky.map((c, i) => (
                        <div key={i} className="posilovna-detail-cvik">
                          <strong>{c.nazev}</strong>
                          <span className="posilovna-detail-serie">
                            {c.serie.map((serie) => `${formatujVahu(serie.vahaKg)}×${serie.opakovani}`).join(', ')}
                          </span>
                        </div>
                      ))}
                      {s.poznamka && <p className="posilovna-detail-poznamka">„{s.poznamka}"</p>}
                      <button className="posilovna-smazat-btn" onClick={() => smazat(s)}>
                        🗑 Smazat trénink
                      </button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}
