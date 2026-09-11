import React, { useEffect, useRef, useState } from 'react'
import { usePoseEngine } from './usePoseEngine'
import { useFormCheck, nejlepsiOpakovaniProCvik, navrhniCilNaPriste } from './useFormCheck'
import { NAZEV_CVIKU, NAROCNOST_LABEL, JE_CVIK_NA_CAS, formatPocetCviku, sestavCsvSezeni, Narocnost, TypCviku } from './types'
import { ohlasOpakovani, ohlasNovyRekord, ohlasCilSplnen, ohlasZacniSerii } from './hlaseni'
import { stahnoutTextovySoubor } from '@/core/utils/download'
import { requestNotificationPermission } from '@/core/utils/notify'
import { sdilejText } from '@/core/utils/sdileni'
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
const VSECHNY_CVIKY: TypCviku[] = ['dřep', 'klik', 'výpad', 'prkno']
const VSECHNY_NAROCNOSTI: Narocnost[] = ['lehka', 'stredni', 'tezka']

const noveOkruhId = () => `okruh-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

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

  // Návrh cíle na příště — jednoduchá progresivní zátěž (viz
  // navrhniCilNaPriste v useFormCheck.ts). Zobrazuje se jen, dokud
  // uživatel sám nic nezadal — jakmile vyplní vlastní cíl, návrh mizí,
  // ať mu appka nepřebíjí vlastní volbu.
  const navrhovanyCil = navrhniCilNaPriste(sezeni, cvik)

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

  // Okruhový trénink — na rozdíl od "Série a odpočinek" výš (víc kol
  // STEJNÉHO cviku) jde o sled RŮZNÝCH cviků za sebou, každý s vlastním
  // cílem. Kamera mezi kroky okruhu neběží nastartuj/vypni — cvikRef se
  // smí měnit i za běhu (usePoseEngine.ts's efekt na cvik nemá žádnou
  // podmínku na engine.stav), takže appka mezi kroky jen vynuluje
  // počítadlo a přepne cvik, bez odpočinku (skutečné okruhy bez
  // odpočinku mezi RŮZNÝMI cviky jsou běžné — odpočinek zůstává
  // vyhrazený pro víc sérií STEJNÉHO cviku výš).
  const [rezimOkruh, setRezimOkruh] = useState(false)
  const [okruhKroky, setOkruhKroky] = useState<{ cvik: TypCviku; cil: number }[]>([])
  const [novyOkruhCvik, setNovyOkruhCvik] = useState<TypCviku>('dřep')
  const [novyOkruhCilText, setNovyOkruhCilText] = useState('')
  const [okruhBezi, setOkruhBezi] = useState(false)
  const [okruhIndex, setOkruhIndex] = useState(0)
  const [okruhVysledky, setOkruhVysledky] = useState<{ cvik: TypCviku; pocet: number; trvani: number }[]>([])
  const okruhIdRef = useRef<string | null>(null)
  const segmentZacatekRef = useRef<number>(0)

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
    if (rezimOkruh && okruhBezi) {
      const { pocetOpakovani, cvik: dokoncenyCvik } = engine.stop()
      let vysledky = okruhVysledky
      if (pocetOpakovani > 0) {
        const trvaniSegmentu = Math.max(1, Math.round((Date.now() - segmentZacatekRef.current) / 1000))
        ulozitSezeni(pocetOpakovani, trvaniSegmentu, dokoncenyCvik, okruhIdRef.current ?? undefined)
        vysledky = [...vysledky, { cvik: dokoncenyCvik, pocet: pocetOpakovani, trvani: trvaniSegmentu }]
      }
      setOkruhVysledky(vysledky)
      setOkruhBezi(false)
      setOkruhIndex(0)
      setOkruhKroky([])
      return
    }

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

  const handlePridatDoOkruhu = () => {
    const cil = Number(novyOkruhCilText)
    if (!cil || cil <= 0) return
    setOkruhKroky((k) => [...k, { cvik: novyOkruhCvik, cil }])
    setNovyOkruhCilText('')
  }

  const handleOdebratZOkruhu = (index: number) => {
    setOkruhKroky((k) => k.filter((_, i) => i !== index))
  }

  const handleSpustitOkruh = () => {
    if (okruhKroky.length === 0) return
    okruhIdRef.current = noveOkruhId()
    setOkruhVysledky([])
    setOkruhIndex(0)
    setOkruhBezi(true)
    setCvik(okruhKroky[0].cvik)
    setCilOpakovaniText(String(okruhKroky[0].cil))
    requestNotificationPermission()
    segmentZacatekRef.current = Date.now()
    engine.start()
  }

  const handleDalsiCvikOkruhu = () => {
    const dokoncenoVSegmentu = engine.pocetOpakovani
    const aktualniCvik = okruhKroky[okruhIndex].cvik
    let vysledky = okruhVysledky
    if (dokoncenoVSegmentu > 0) {
      const trvaniSegmentu = Math.max(1, Math.round((Date.now() - segmentZacatekRef.current) / 1000))
      ulozitSezeni(dokoncenoVSegmentu, trvaniSegmentu, aktualniCvik, okruhIdRef.current ?? undefined)
      vysledky = [...vysledky, { cvik: aktualniCvik, pocet: dokoncenoVSegmentu, trvani: trvaniSegmentu }]
      setOkruhVysledky(vysledky)
    }

    const dalsiIndex = okruhIndex + 1
    if (dalsiIndex >= okruhKroky.length) {
      engine.stop()
      setOkruhBezi(false)
      setOkruhIndex(0)
      setOkruhKroky([])
      return
    }

    setOkruhIndex(dalsiIndex)
    setCvik(okruhKroky[dalsiIndex].cvik)
    setCilOpakovaniText(String(okruhKroky[dalsiIndex].cil))
    engine.resetovatPocitadlo()
    segmentZacatekRef.current = Date.now()
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
      // Prkno (a jiné časomíra cviky) by při ohlašování KAŽDÉ vteřiny
      // hlas jen zahltily — ohlásí se jen každých 10 vteřin, ne každé
      // opakování jako u dřepu/kliku/výpadu.
      if (!JE_CVIK_NA_CAS[cvik] || engine.pocetOpakovani % 10 === 0) {
        ohlasOpakovani(engine.pocetOpakovani)
      }
    }
  }, [engine.pocetOpakovani, engine.stav, hlasoveHlaseni, cilDosazen, cvik])

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

      {engine.stav === 'bezi' && !rezimOkruh && pocetSerii > 1 && (
        <div className="fc-serie-info">
          Série {aktualniSerie} z {pocetSerii}
        </div>
      )}

      {engine.stav === 'bezi' && rezimOkruh && okruhBezi && (
        <div className="fc-serie-info">
          Okruh: krok {okruhIndex + 1} z {okruhKroky.length} — {NAZEV_CVIKU[okruhKroky[okruhIndex].cvik]}
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
              {JE_CVIK_NA_CAS[cvik] && <span className="fc-counter-jednotka"> s</span>}
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
              {!rezimOkruh && pocetSerii > 1 && aktualniSerie < pocetSerii && (
                <button className="fc-serie-dokoncit-btn" onClick={handleDokoncitSerii}>
                  Další série
                </button>
              )}
              {rezimOkruh && okruhBezi && (
                <button className="fc-serie-dokoncit-btn" onClick={handleDalsiCvikOkruhu}>
                  {okruhIndex + 1 >= okruhKroky.length ? 'Dokončit okruh' : 'Další cvik'}
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

          <div className="fc-rezim-picker" role="group" aria-label="Vyber druh tréninku">
            <button
              type="button"
              className={`fc-rezim-btn ${!rezimOkruh ? 'fc-rezim-btn--vybrany' : ''}`}
              onClick={() => setRezimOkruh(false)}
            >
              Jednotlivý cvik
            </button>
            <button
              type="button"
              className={`fc-rezim-btn ${rezimOkruh ? 'fc-rezim-btn--vybrany' : ''}`}
              onClick={() => setRezimOkruh(true)}
            >
              Okruh (víc cviků za sebou)
            </button>
          </div>

          {!rezimOkruh && (
            <>
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
                {JE_CVIK_NA_CAS[cvik] ? 'Cíl výdrže (s, nepovinné)' : 'Cíl opakování (nepovinné)'}
                <input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={cilOpakovaniText}
                  onChange={(e) => setCilOpakovaniText(e.target.value)}
                  placeholder={`např. ${VYCHOZI_CIL_OPAKOVANI}`}
                />
              </label>

              {navrhovanyCil !== null && cilOpakovaniText.trim() === '' && (
                <button type="button" className="fc-cil-navrh" onClick={() => setCilOpakovaniText(String(navrhovanyCil))}>
                  💡 Naposledy {formatPocetCviku(navrhovanyCil - 1, cvik)} — zkus dnes {formatPocetCviku(navrhovanyCil, cvik)}
                </button>
              )}

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
            </>
          )}

          {rezimOkruh && (
            <div className="fc-okruh-builder">
              <div className="fc-okruh-pridat">
                <select value={novyOkruhCvik} onChange={(e) => setNovyOkruhCvik(e.target.value as TypCviku)}>
                  {VSECHNY_CVIKY.map((c) => (
                    <option key={c} value={c}>
                      {NAZEV_CVIKU[c]}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={novyOkruhCilText}
                  onChange={(e) => setNovyOkruhCilText(e.target.value)}
                  placeholder={JE_CVIK_NA_CAS[novyOkruhCvik] ? 'vteřin' : 'opakování'}
                />
                <button type="button" className="fc-okruh-pridat-btn" onClick={handlePridatDoOkruhu}>
                  Přidat
                </button>
              </div>

              {okruhKroky.length > 0 && (
                <div className="fc-okruh-seznam">
                  {okruhKroky.map((k, i) => (
                    <div key={`${k.cvik}-${i}`} className="fc-okruh-krok">
                      <span>
                        {i + 1}. {NAZEV_CVIKU[k.cvik]} — {formatPocetCviku(k.cil, k.cvik)}
                      </span>
                      <button type="button" onClick={() => handleOdebratZOkruhu(i)} aria-label="Odebrat z okruhu">
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                className="fc-start-btn"
                onClick={handleSpustitOkruh}
                disabled={okruhKroky.length === 0}
              >
                Spustit okruh
              </button>
            </div>
          )}

          {okruhVysledky.length > 0 && !okruhBezi && (
            <div className="fc-posledni-blok">
              <p className="fc-posledni-vysledek">Okruh dokončen! 🎉</p>
              <div className="fc-okruh-seznam">
                {okruhVysledky.map((v, i) => (
                  <div key={i} className="fc-okruh-krok">
                    <span>
                      {NAZEV_CVIKU[v.cvik]} — {formatPocetCviku(v.pocet, v.cvik)} za {formatTrvani(v.trvani)}
                    </span>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="fc-sdilet-btn"
                onClick={() =>
                  void sdilejText(
                    `Dokončil(a) jsem okruhový trénink ve Form Checku: ${okruhVysledky
                      .map((v) => `${NAZEV_CVIKU[v.cvik]} ${formatPocetCviku(v.pocet, v.cvik)}`)
                      .join(', ')}! 💪`,
                    'Form Check'
                  )
                }
              >
                📤 Sdílet výsledek
              </button>
            </div>
          )}

          {posledniShrnuti && (
            <div className="fc-posledni-blok">
              <p className="fc-posledni-vysledek">
                Poslední sezení: {formatPocetCviku(posledniShrnuti.pocet, posledniShrnuti.cvik)}{' '}
                {NAZEV_CVIKU[posledniShrnuti.cvik].toLowerCase()} za {formatTrvani(posledniShrnuti.trvani)}
              </p>

              <button
                type="button"
                className="fc-sdilet-btn"
                onClick={() =>
                  void sdilejText(
                    `Dokončil(a) jsem trénink ve Form Checku: ${formatPocetCviku(
                      posledniShrnuti.pocet,
                      posledniShrnuti.cvik
                    )} ${NAZEV_CVIKU[posledniShrnuti.cvik].toLowerCase()}! 💪`,
                    'Form Check'
                  )
                }
              >
                📤 Sdílet výsledek
              </button>

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
