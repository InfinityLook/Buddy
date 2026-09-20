import React, { useEffect, useRef, useState } from 'react'
import { useTelesneMiry } from '@/flagships/fitness-room/useTelesneMiry'
import { serazenoPodleData } from '@/flagships/fitness-room/telesneMiryStats'
import { TrasaMapa } from './TrasaMapa'
import { useBehani } from './useBehani'
import {
  NAZEV_AKTIVITY,
  IKONA_AKTIVITY,
  formatujVzdalenost,
  formatujCas,
  formatujTempo,
  tempoSekundNaKm,
  odhadniKcal,
  melByPripocitatBod,
  vzdalenostMetry,
  type TypAktivity,
  type GpsBod,
  type BehSezeni,
} from './types'
import './Behani.css'

type Obrazovka = 'brana' | 'probiha' | 'souhrn'

const PODPORUJE_GPS = typeof navigator !== 'undefined' && 'geolocation' in navigator

const formatDatum = (iso: string): string =>
  new Date(iso).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' })

// ==========================================
// Běhání/Kardio — GPS tracker pro běh, chůzi a kolo (Fitness Roomova
// čtvrtá fáze vylepšení). Kompletně zdarma: navigator.geolocation je
// vestavěná v prohlížeči, vzdálenost počítá appka sama (types.ts's
// vzdalenostMetry), mapa v pozadí je OpenStreetMap přes Leaflet
// (TrasaMapa.tsx) — taky zdarma, bez klíče.
//
// Tři obrazovky: brána (výběr aktivity + historie), probíhající
// sezení (živá mapa + čísla), souhrn (uložit/zahodit) — stejný tvar
// jako Form Checkovo gate/session/end.
// ==========================================
export const Behani: React.FC = () => {
  const behani = useBehani()
  const miry = useTelesneMiry()

  const [obrazovka, setObrazovka] = useState<Obrazovka>('brana')
  const [aktivita, setAktivita] = useState<TypAktivity>('beh')
  const [trasa, setTrasa] = useState<GpsBod[]>([])
  const [vzdalenostM, setVzdalenostM] = useState(0)
  const [trvani, setTrvani] = useState(0)
  const [pauza, setPauza] = useState(false)
  const [chyba, setChyba] = useState<string | null>(null)
  const [rozbaleneId, setRozbaleneId] = useState<string | null>(null)

  const watchIdRef = useRef<number | null>(null)
  const intervalRef = useRef<number | null>(null)
  const pauzaRef = useRef(false)

  useEffect(() => {
    pauzaRef.current = pauza
  }, [pauza])

  // Ukončí sledování polohy a odpočet, ať appka nenechá GPS běžet na
  // pozadí, když uživatel odejde z miniaplikace uprostřed sezení —
  // stejná disciplína jako kamera v usePoseEngine.ts/mikrofon v
  // ChatView.tsx jinde v appce.
  const zastavSledovani = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  useEffect(() => () => zastavSledovani(), [])

  const spustit = () => {
    if (!PODPORUJE_GPS) {
      setChyba('Tvé zařízení nepodporuje GPS.')
      return
    }
    setChyba(null)
    setTrasa([])
    setVzdalenostM(0)
    setTrvani(0)
    setPauza(false)
    pauzaRef.current = false
    setObrazovka('probiha')

    watchIdRef.current = navigator.geolocation.watchPosition(
      (poloha) => {
        const novyBod: GpsBod = { lat: poloha.coords.latitude, lng: poloha.coords.longitude, cas: Date.now() }
        setTrasa((predchozi) => {
          const posledni = predchozi.length > 0 ? predchozi[predchozi.length - 1] : null
          if (!melByPripocitatBod(posledni, novyBod, poloha.coords.accuracy)) return predchozi
          if (posledni) setVzdalenostM((v) => v + vzdalenostMetry(posledni, novyBod))
          return [...predchozi, novyBod]
        })
      },
      () => setChyba('Nepovedlo se získat polohu — appka potřebuje oprávnění k poloze.'),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 }
    )

    intervalRef.current = window.setInterval(() => {
      if (!pauzaRef.current) setTrvani((t) => t + 1)
    }, 1000)
  }

  const prepnoutPauzu = () => setPauza((p) => !p)

  const zastavit = () => {
    zastavSledovani()
    setObrazovka('souhrn')
  }

  // Poslední zadaná váha (stejná logika jako FitnessRoomModule.tsx's
  // posledniVaha) — appka bez ní použije poctivě přiznaný výchozí
  // odhad, viz types.ts's odhadniKcal.
  const zaznamySVahou = serazenoPodleData(miry.zaznamy).filter((z) => z.vahaKg !== null)
  const posledniVaha = zaznamySVahou.length > 0 ? zaznamySVahou[zaznamySVahou.length - 1].vahaKg : null

  const odhadKcal = odhadniKcal(aktivita, trvani, posledniVaha)

  const ulozit = () => {
    behani.pridatSezeni(aktivita, vzdalenostM, trvani, odhadKcal, trasa)
    setObrazovka('brana')
  }

  const zahodit = () => setObrazovka('brana')

  const smazat = (s: BehSezeni) => {
    if (window.confirm(`Smazat sezení „${NAZEV_AKTIVITY[s.typ]} — ${formatujVzdalenost(s.vzdalenostM)}"?`)) {
      behani.smazatSezeni(s.id)
      if (rozbaleneId === s.id) setRozbaleneId(null)
    }
  }

  if (obrazovka === 'probiha') {
    const tempoZive = tempoSekundNaKm(vzdalenostM, trvani)
    return (
      <div className="behani-page">
        <TrasaMapa trasa={trasa} vyska={260} />
        <div className="behani-zive-karta">
          <div className="behani-zive-radek">
            <div className="behani-zive-cislo">{formatujCas(trvani)}</div>
            <div className="behani-zive-label">čas</div>
          </div>
          <div className="behani-zive-mrizka">
            <div>
              <div className="behani-zive-cislo behani-zive-cislo--male">{formatujVzdalenost(vzdalenostM)}</div>
              <div className="behani-zive-label">vzdálenost</div>
            </div>
            <div>
              <div className="behani-zive-cislo behani-zive-cislo--male">{formatujTempo(tempoZive)}</div>
              <div className="behani-zive-label">tempo</div>
            </div>
          </div>
          {chyba && <p className="behani-chyba">{chyba}</p>}
          <div className="behani-zive-tlacitka">
            <button className="behani-btn behani-btn--pauza" onClick={prepnoutPauzu}>
              {pauza ? '▶ Pokračovat' : '⏸ Pauza'}
            </button>
            <button className="behani-btn behani-btn--stop" onClick={zastavit}>
              ⏹ Ukončit
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (obrazovka === 'souhrn') {
    const tempoFinal = tempoSekundNaKm(vzdalenostM, trvani)
    return (
      <div className="behani-page">
        <h2 className="behani-nadpis">Sezení dokončeno {IKONA_AKTIVITY[aktivita]}</h2>
        <TrasaMapa trasa={trasa} vyska={220} />
        <div className="behani-souhrn-mrizka">
          <div>
            <div className="behani-souhrn-cislo">{formatujVzdalenost(vzdalenostM)}</div>
            <div className="behani-zive-label">vzdálenost</div>
          </div>
          <div>
            <div className="behani-souhrn-cislo">{formatujCas(trvani)}</div>
            <div className="behani-zive-label">čas</div>
          </div>
          <div>
            <div className="behani-souhrn-cislo">{formatujTempo(tempoFinal)}</div>
            <div className="behani-zive-label">tempo</div>
          </div>
          <div>
            <div className="behani-souhrn-cislo">{odhadKcal} kcal</div>
            <div className="behani-zive-label">odhad</div>
          </div>
        </div>
        <div className="behani-souhrn-tlacitka">
          <button className="behani-btn behani-btn--zahodit" onClick={zahodit}>
            Zahodit
          </button>
          <button className="behani-btn behani-btn--ulozit" onClick={ulozit}>
            Uložit sezení
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="behani-page">
      <h2 className="behani-nadpis">Běhání a kardio</h2>

      {!PODPORUJE_GPS && <p className="behani-chyba">Tvé zařízení nepodporuje GPS — appka tuhle appku bez polohy nemůže spustit.</p>}
      {chyba && <p className="behani-chyba">{chyba}</p>}

      <div className="behani-vyber-aktivity">
        {(Object.keys(NAZEV_AKTIVITY) as TypAktivity[]).map((typ) => (
          <button
            key={typ}
            className={`behani-aktivita-btn ${aktivita === typ ? 'is-vybrana' : ''}`}
            onClick={() => setAktivita(typ)}
          >
            <span className="behani-aktivita-ikona">{IKONA_AKTIVITY[typ]}</span>
            {NAZEV_AKTIVITY[typ]}
          </button>
        ))}
      </div>

      <button className="behani-spustit-btn" onClick={spustit} disabled={!PODPORUJE_GPS}>
        ▶ Spustit {NAZEV_AKTIVITY[aktivita].toLowerCase()}
      </button>

      <h3 className="behani-historie-nadpis">Historie</h3>
      {behani.sezeni.length === 0 ? (
        <p className="behani-prazdno">Zatím žádné sezení — spusť první běh, chůzi nebo jízdu na kole výš.</p>
      ) : (
        <ul className="behani-historie-seznam">
          {behani.sezeni.map((s) => {
            const tempo = tempoSekundNaKm(s.vzdalenostM, s.trvaniSekund)
            const rozbaleno = rozbaleneId === s.id
            return (
              <li key={s.id} className="behani-historie-radek">
                <button className="behani-historie-hlavicka" onClick={() => setRozbaleneId(rozbaleno ? null : s.id)}>
                  <span className="behani-historie-ikona">{IKONA_AKTIVITY[s.typ]}</span>
                  <span className="behani-historie-info">
                    <strong>{formatujVzdalenost(s.vzdalenostM)}</strong> · {formatujCas(s.trvaniSekund)} · {formatujTempo(tempo)}
                    <br />
                    <span className="behani-historie-datum">{formatDatum(s.createdAt)} · {s.odhadKcal} kcal</span>
                  </span>
                  <span className="behani-historie-sipka">{rozbaleno ? '▲' : '▼'}</span>
                </button>
                {rozbaleno && (
                  <div className="behani-historie-detail">
                    {s.trasa.length > 1 && <TrasaMapa trasa={s.trasa} vyska={180} />}
                    <button className="behani-smazat-btn" onClick={() => smazat(s)}>
                      🗑 Smazat sezení
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
