import React, { useEffect, useRef, useState } from 'react'
import { usePoseEngine } from './usePoseEngine'
import { useFormCheck, nejlepsiOpakovaniProCvik } from './useFormCheck'
import { NAZEV_CVIKU, NAROCNOST_LABEL, sestavCsvSezeni, Narocnost, TypCviku } from './types'
import { ohlasOpakovani, ohlasNovyRekord, ohlasCilSplnen, ohlasZacniSerii } from './hlaseni'
import { stahnoutTextovySoubor } from '@/core/utils/download'
import { requestNotificationPermission } from '@/core/utils/notify'
import './FormCheck.css'

const formatDatum = (iso: string): string => {
  const d = new Date(iso)
  return d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' })
}

const formatTrvani = (sekund: number): string => {
  if (sekund < 60) return `${sekund} s`
  return `${Math.floor(sekund / 60)} min ${sekund % 60} s`
}

const VYCHOZI_CIL_OPAKOVANI = 15
const VYCHOZI_ODPOCINEK_S = 60
const VSECHNY_CVIKY: TypCviku[] = ['dřep', 'klik', 'výpad']
const VSECHNY_NAROCNOSTI: Narocnost[] = ['lehka', 'stredni', 'tezka']

export const FormCheck: React.FC = () => {
  // Cvik se smí měnit, jen dokud kamera neběží — engine.stav === 'vypnuto'
  // (viz usePoseEngine.ts's vlastní komentář o tom, kdy se cvikRef čte).
  const [cvik, setCvik] = useState<TypCviku>('dřep')
  const engine = usePoseEngine(cvik)
  const {
    sezeni,
    pocetSezeni,
    celkemOpakovani,
    nejlepsiSezeni,
    hlasoveHlaseni,
    ulozitSezeni,
    nastavPoznamkuSezeni,
    setHlasoveHlaseni,
  } = useFormCheck()

  // Nepovinný cíl opakování pro právě běžící sezení — čistě lokální,
  // session-only stav (appka si ho neukládá mezi sezeními, ať jde
  // pokaždé zvolit znovu podle chuti). Prázdný řetězec = žádný cíl.
  const [cilOpakovaniText, setCilOpakovaniText] = useState('')
  const cilOpakovani = cilOpakovaniText.trim() === '' ? null : Number(cilOpakovaniText)
  const cilDosazen =
    cilOpakovani !== null && cilOpakovani > 0 && engine.pocetOpakovani >= cilOpakovani

  // Série a odpočinek mezi nimi — taky čistě lokální/session-only, jako
  // cíl opakování výš. Počet sérií 1 (výchozí, nevyplněno) se chová
  // úplně stejně jako dřív: žádná série, žádný odpočinek, jen "Ukončit
  // sezení" jednou na konci.
  const [pocetSeriiText, setPocetSeriiText] = useState('')
  const [odpocinekText, setOdpocinekText] = useState('')
  const pocetSerii = pocetSeriiText.trim() === '' ? 1 : Math.max(1, Math.floor(Number(pocetSeriiText)) || 1)
  const odpocinekSekund =
    odpocinekText.trim() === '' ? VYCHOZI_ODPOCINEK_S : Math.max(5, Math.floor(Number(odpocinekText)) || VYCHOZI_ODPOCINEK_S)

  const [aktualniSerie, setAktualniSerie] = useState(1)
  const [soucetPredchozichSerii, setSoucetPredchozichSerii] = useState(0)
  const [zbyvaOdpocinekS, setZbyvaOdpocinekS] = useState<number | null>(null)
  // Číslo série, co se má ohlásit hlasem, až odpočinek doběhne — ref, ne
  // jen aktualniSerie samotné, protože handleDokoncitSerii i countdown
  // efekt níž potřebují stejnou hodnotu synchronně, ne až po překreslení.
  const cisloDalsiSerieRef = useRef(1)

  // Shrnutí posledního sezení se ukáže hned po ukončení, ať vidí, co si
  // právě vydělal, a nemusí to hledat v historii dole. Nese i id sezení,
  // ať se poznámka/náročnost dá připojit k té správné položce historie.
  const [posledniShrnuti, setPosledniShrnuti] = useState<{
    id: string
    pocet: number
    trvani: number
    cvik: TypCviku
  } | null>(null)
  const [poznamkaText, setPoznamkaText] = useState('')
  const [narocnostVybrana, setNarocnostVybrana] = useState<Narocnost | null>(null)
  const [poznamkaUlozena, setPoznamkaUlozena] = useState(false)

  // Živá oslava osobního rekordu — rekordRef se zmrazí na začátku sezení
  // (nejlepší dosavadní sezení PRO TENHLE cvik, ne napříč všemi), aby se
  // porovnávalo se stavem PŘED právě běžícím pokusem, ne s číslem, co se
  // mezitím mění. rekordOslavenRef/cilOslavenRef hlídají, aby se
  // oslava/hláška spustila nejvýš jednou za sezení, ne při každém dalším
  // opakování nad prahem.
  const rekordRef = useRef(0)
  const rekordOslavenRef = useRef(false)
  const cilOslavenRef = useRef(false)
  const [novyRekord, setNovyRekord] = useState(false)

  const handleStop = () => {
    const { pocetOpakovani, trvaniSekund, cvik: dokoncenyCvik } = engine.stop()
    const celkemVSezeni = soucetPredchozichSerii + pocetOpakovani
    if (celkemVSezeni > 0) {
      const id = ulozitSezeni(celkemVSezeni, trvaniSekund, dokoncenyCvik)
      setPosledniShrnuti({ id, pocet: celkemVSezeni, trvani: trvaniSekund, cvik: dokoncenyCvik })
      setPoznamkaText('')
      setNarocnostVybrana(null)
      setPoznamkaUlozena(false)
    }
    setSoucetPredchozichSerii(0)
    setAktualniSerie(1)
    setZbyvaOdpocinekS(null)
  }

  const handleStart = () => {
    setPosledniShrnuti(null)
    setAktualniSerie(1)
    setSoucetPredchozichSerii(0)
    setZbyvaOdpocinekS(null)
    rekordRef.current = nejlepsiOpakovaniProCvik(sezeni, cvik)
    rekordOslavenRef.current = false
    cilOslavenRef.current = false
    setNovyRekord(false)
    // Spuštění cvičení je nejjasnější "tohle chci sledovat" gesto, co
    // Form Check má — stejná úvaha jako u Pomodorova Start tlačítka
    // a Planerova addTask.
    requestNotificationPermission()
    engine.start()
  }

  const handleDokoncitSerii = () => {
    const dokoncenoVSerii = engine.pocetOpakovani
    setSoucetPredchozichSerii((s) => s + dokoncenoVSerii)
    engine.resetovatPocitadlo()
    // Nová série, nový živý pokus o rekord — bez tohohle by appka
    // nemohla znovu oslavit stejný rekord, kdyby ho druhá série povedla
    // trumfnout ještě víc.
    rekordOslavenRef.current = false
    cilOslavenRef.current = false
    setNovyRekord(false)

    const dalsi = aktualniSerie + 1
    cisloDalsiSerieRef.current = dalsi
    setAktualniSerie(dalsi)
    setZbyvaOdpocinekS(odpocinekSekund)
  }

  const handlePreskocitOdpocinek = () => {
    setZbyvaOdpocinekS(null)
    if (hlasoveHlaseni) ohlasZacniSerii(cisloDalsiSerieRef.current)
  }

  // Odpočinkové odpočítávání — obyčejný setTimeout po vteřinách, ne
  // setInterval: při každém tiku se efekt spustí znovu (závislost na
  // zbyvaOdpocinekS), naplánuje si vlastní jediný další krok a starý čas
  // ukliduje, stejný "1 s tik, vlastní cleanup" princip jako jinde
  // v appce.
  useEffect(() => {
    if (zbyvaOdpocinekS === null) return
    if (zbyvaOdpocinekS <= 0) {
      setZbyvaOdpocinekS(null)
      if (hlasoveHlaseni) ohlasZacniSerii(cisloDalsiSerieRef.current)
      return
    }
    const timer = window.setTimeout(() => setZbyvaOdpocinekS((s) => (s === null ? null : s - 1)), 1000)
    return () => window.clearTimeout(timer)
  }, [zbyvaOdpocinekS, hlasoveHlaseni])

  // Hlasové hlášení opakování + živá oslava rekordu + hláška při
  // dosažení cíle — jeden efekt, ne tři, ať se hlášky nepředbíhají
  // (rekni() v hlaseni.ts zruší rozeběhnutou promluvu, takže tři
  // nezávislé efekty ve stejném překreslení by soupeřily o to, co
  // doopravdy dozní). Priorita: nový rekord > splněný cíl > obyčejné
  // číslo.
  useEffect(() => {
    if (engine.stav !== 'bezi') return
    if (engine.pocetOpakovani <= 0) return

    const dosahlNovehoRekordu =
      rekordRef.current > 0 && !rekordOslavenRef.current && engine.pocetOpakovani > rekordRef.current
    const dosahlCile = cilDosazen && !cilOslavenRef.current

    if (dosahlNovehoRekordu) {
      rekordOslavenRef.current = true
      setNovyRekord(true)
      if (hlasoveHlaseni) ohlasNovyRekord()
      window.setTimeout(() => setNovyRekord(false), 3000)
    } else if (dosahlCile) {
      cilOslavenRef.current = true
      if (hlasoveHlaseni) ohlasCilSplnen()
    } else if (hlasoveHlaseni) {
      ohlasOpakovani(engine.pocetOpakovani)
    }
  }, [engine.pocetOpakovani, engine.stav, hlasoveHlaseni, cilDosazen])

  const handleUlozitPoznamku = () => {
    if (!posledniShrnuti) return
    nastavPoznamkuSezeni(posledniShrnuti.id, poznamkaText.trim(), narocnostVybrana)
    setPoznamkaUlozena(true)
  }

  const handleExport = () => {
    stahnoutTextovySoubor('form-check-sezeni.csv', sestavCsvSezeni(sezeni))
  }

  return (
    <div className="fc-app">
      <div className="fc-header">
        <h2>Form Check</h2>
        <button
          type="button"
          className="fc-hlaseni-toggle"
          onClick={() => setHlasoveHlaseni(!hlasoveHlaseni)}
          aria-pressed={hlasoveHlaseni}
          aria-label={hlasoveHlaseni ? 'Vypnout hlasové hlášení opakování' : 'Zapnout hlasové hlášení opakování'}
        >
          {hlasoveHlaseni ? '🔊' : '🔇'}
        </button>
      </div>

      {engine.stav === 'bezi' && pocetSerii > 1 && (
        <div className="fc-serie-info">
          Série {aktualniSerie} z {pocetSerii}
        </div>
      )}

      {/* <video> a <canvas> jsou v DOMu pořád, i před prvním spuštěním —
          engine na ně potřebuje mít funkční ref hned, jinak by mu chyběly
          v okamžiku, kdy se stream připojuje. Zobrazí se, jakmile se
          začne žádat o kameru — i ve stavu "nacita-se" už video-wrap
          není skrytý, ať je vidět obraz z kamery hned, jak je k dispozici,
          a ne až ve chvíli, kdy doběhne stahování modelu. */}
      <div
        className={`fc-video-wrap ${engine.stav === 'bezi' || engine.stav === 'nacita-se' ? '' : 'fc-video-wrap--skryto'}`}
      >
        <video ref={engine.videoRef} className="fc-video" playsInline muted />
        <canvas ref={engine.canvasRef} className="fc-canvas" />

        {engine.stav === 'bezi' && !engine.vidimTe && zbyvaOdpocinekS === null && (
          <div className="fc-hint-overlay">Nevidím tě celého v záběru. Poodstup nebo nastav kameru šířkou.</div>
        )}

        {zbyvaOdpocinekS !== null && (
          <div className="fc-odpocinek-overlay">
            <span className="fc-odpocinek-nadpis">Odpočinek</span>
            <span className="fc-odpocinek-cas">{zbyvaOdpocinekS}s</span>
            <button type="button" className="fc-odpocinek-preskocit" onClick={handlePreskocitOdpocinek}>
              Přeskočit odpočinek
            </button>
            <button type="button" className="fc-odpocinek-ukoncit" onClick={handleStop}>
              Ukončit sezení
            </button>
          </div>
        )}

        {engine.stav === 'bezi' && zbyvaOdpocinekS === null && (
          <>
            <div className={`fc-counter ${cilDosazen ? 'fc-counter--cil-splnen' : ''}`}>
              {engine.pocetOpakovani}
              {cilOpakovani !== null && cilOpakovani > 0 && (
                <span className="fc-counter-cil">
                  {cilDosazen ? '✓' : `/ ${cilOpakovani}`}
                </span>
              )}
            </div>
            {novyRekord && <div className="fc-rekord-banner">🎉 Nový rekord!</div>}
            {engine.zpetnaVazba && (
              <div className={`fc-feedback fc-feedback--${engine.zpetnaVazba}`}>
                {engine.zpetnaVazba === 'v-poradku' ? '✓ Záda rovně' : '⚠ Narovnej záda'}
              </div>
            )}
            <div className="fc-controls">
              {engine.pocetKamer > 1 && (
                <button className="fc-icon-btn" onClick={engine.prepnoutKameru} aria-label="Přepnout kameru">
                  🔄
                </button>
              )}
              <button className="fc-icon-btn" onClick={engine.resetovatPocitadlo} aria-label="Vynulovat počítadlo">
                ↺
              </button>
              {pocetSerii > 1 && aktualniSerie < pocetSerii && (
                <button className="fc-serie-dokoncit-btn" onClick={handleDokoncitSerii}>
                  Další série
                </button>
              )}
              <button className="fc-stop-btn" onClick={handleStop}>
                Ukončit sezení
              </button>
            </div>
          </>
        )}
      </div>

      {engine.stav === 'vypnuto' && (
        <div className="fc-gate">
          <span className="fc-gate-icon">🏋️</span>
          <p className="fc-gate-text">
            Postav telefon tak, aby na kameru viděl celé tvé tělo z boku, a spočítáme cviky za tebe.
            Video nikdy neopustí tenhle telefon — rozpoznávání pozice běží celé offline, přímo
            v prohlížeči.
          </p>

          <div className="fc-cvik-picker" role="group" aria-label="Vyber cvik">
            {VSECHNY_CVIKY.map((c) => (
              <button
                key={c}
                type="button"
                className={`fc-cvik-btn ${cvik === c ? 'fc-cvik-btn--vybrany' : ''}`}
                onClick={() => setCvik(c)}
              >
                {NAZEV_CVIKU[c]}
              </button>
            ))}
          </div>

          <label className="fc-cil-pole">
            Cíl opakování (nepovinné)
            <input
              type="number"
              min={1}
              inputMode="numeric"
              value={cilOpakovaniText}
              onChange={(e) => setCilOpakovaniText(e.target.value)}
              placeholder={`např. ${VYCHOZI_CIL_OPAKOVANI}`}
            />
          </label>

          <div className="fc-serie-radek">
            <label className="fc-cil-pole">
              Počet sérií (nepovinné)
              <input
                type="number"
                min={1}
                inputMode="numeric"
                value={pocetSeriiText}
                onChange={(e) => setPocetSeriiText(e.target.value)}
                placeholder="1"
              />
            </label>
            <label className="fc-cil-pole">
              Odpočinek mezi sériemi (s)
              <input
                type="number"
                min={5}
                inputMode="numeric"
                value={odpocinekText}
                onChange={(e) => setOdpocinekText(e.target.value)}
                placeholder={String(VYCHOZI_ODPOCINEK_S)}
              />
            </label>
          </div>

          <button className="fc-start-btn" onClick={handleStart}>
            Zapnout kameru
          </button>

          {posledniShrnuti && (
            <div className="fc-posledni-blok">
              <p className="fc-posledni-vysledek">
                Poslední sezení: {posledniShrnuti.pocet}× {NAZEV_CVIKU[posledniShrnuti.cvik].toLowerCase()} za{' '}
                {formatTrvani(posledniShrnuti.trvani)}
              </p>

              {!poznamkaUlozena ? (
                <div className="fc-poznamka-form">
                  <div className="fc-narocnost-radek" role="group" aria-label="Náročnost sezení">
                    {VSECHNY_NAROCNOSTI.map((n) => (
                      <button
                        key={n}
                        type="button"
                        className={`fc-narocnost-btn ${narocnostVybrana === n ? 'fc-narocnost-btn--vybrana' : ''}`}
                        onClick={() => setNarocnostVybrana(n)}
                      >
                        {NAROCNOST_LABEL[n]}
                      </button>
                    ))}
                  </div>
                  <textarea
                    className="fc-poznamka-input"
                    placeholder="Poznámka k sezení (nepovinné)…"
                    value={poznamkaText}
                    onChange={(e) => setPoznamkaText(e.target.value)}
                    rows={2}
                  />
                  <button className="fc-poznamka-ulozit" onClick={handleUlozitPoznamku}>
                    Uložit poznámku
                  </button>
                </div>
              ) : (
                <p className="fc-poznamka-hotovo">✓ Uloženo</p>
              )}
            </div>
          )}
        </div>
      )}

      {engine.stav === 'nacita-se' && (
        <div className="fc-gate">
          <div className="fc-spinner" aria-hidden="true" />
          <p className="fc-gate-text">
            Připravuji kameru a model rozpoznávání… Poprvé se stahuje asi 6 MB, pak už se používá to,
            co zůstalo v telefonu.
          </p>
        </div>
      )}

      {engine.stav === 'chyba' && (
        <div className="fc-gate">
          <span className="fc-gate-icon">⚠️</span>
          <p className="fc-gate-text fc-gate-text--chyba">{engine.chyba}</p>
          <button className="fc-start-btn" onClick={handleStart}>
            Zkusit znovu
          </button>
        </div>
      )}

      {pocetSezeni > 0 && (
        <div className="fc-stats-row">
          <div className="fc-stat-card">
            <span className="fc-stat-hodnota">{celkemOpakovani}</span>
            <span className="fc-stat-label">Opakování celkem</span>
          </div>
          <div className="fc-stat-card">
            <span className="fc-stat-hodnota">{nejlepsiSezeni}</span>
            <span className="fc-stat-label">Nejlepší sezení</span>
          </div>
          <div className="fc-stat-card">
            <span className="fc-stat-hodnota">{pocetSezeni}</span>
            <span className="fc-stat-label">Sezení</span>
          </div>
        </div>
      )}

      {sezeni.length > 0 && (
        <>
          <button className="fc-export-btn" onClick={handleExport}>
            ⬇ Export CSV
          </button>

          <div className="fc-list">
            {sezeni.slice(0, 10).map((s) => (
              <div key={s.id} className="fc-row">
                <span className="fc-row-icon" aria-hidden="true">
                  🏋️
                </span>
                <div className="fc-row-mid">
                  <span className="fc-row-title">
                    {s.pocetOpakovani}× {NAZEV_CVIKU[s.cvik]}
                  </span>
                  <span className="fc-row-sub">
                    {formatDatum(s.createdAt)} · {formatTrvani(s.trvaniSekund)}
                    {s.narocnost && ` · ${NAROCNOST_LABEL[s.narocnost]}`}
                  </span>
                  {s.poznamka && <span className="fc-row-poznamka">{s.poznamka}</span>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
