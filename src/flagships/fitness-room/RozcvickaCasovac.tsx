import React, { useEffect, useRef, useState } from 'react'
import { useFormCheckStore } from '@/miniapps/form-check/useFormCheck'
import { ohlasKrokRozcvicky, ohlasHotovoRozcvicka } from '@/miniapps/form-check/hlaseni'
import './RozcvickaCasovac.css'

// ==========================================
// Rozcvička/strečink časovač — na rozdíl od Form Checku BEZ kamery,
// jde jen o odpočítávání pevně dané sady kroků s hlasovým ohlášením
// dalšího kroku. Pevná sada, ne libovolný vstup uživatele — stejná
// "pevná sada, ne libovolný vstup" zásada jako appčiny barevné palety/
// ikonové sady jinde (Kalendářovy BARVY_DNE, Socialovy IKONY_SKUPIN).
//
// Otevírá se z Fitness Roomova dashboardu (dlaždice "Mobilita", dřív
// natvrdo "Brzy" — tohle je to, co ji doopravdy naplňuje).
// ==========================================

interface KrokRozcvicky {
  nazev: string
  sekund: number
}

const ROZCVICKA_KROKY: KrokRozcvicky[] = [
  { nazev: 'Kroužení pažemi', sekund: 20 },
  { nazev: 'Rotace trupu', sekund: 20 },
  { nazev: 'Vysoké kroky na místě', sekund: 30 },
  { nazev: 'Dřepy naprázdno', sekund: 20 },
  { nazev: 'Protažení lýtek v předklonu', sekund: 20 },
]

const STRECINK_KROKY: KrokRozcvicky[] = [
  { nazev: 'Protažení čtyřhlavého svalu', sekund: 30 },
  { nazev: 'Protažení hamstringů', sekund: 30 },
  { nazev: 'Protažení lýtek', sekund: 30 },
  { nazev: 'Protažení zad (kočka)', sekund: 30 },
  { nazev: 'Protažení ramen', sekund: 30 },
]

type RezimRozcvicky = 'rozcvicka' | 'strecink'

const KROKY_PODLE_REZIMU: Record<RezimRozcvicky, KrokRozcvicky[]> = {
  rozcvicka: ROZCVICKA_KROKY,
  strecink: STRECINK_KROKY,
}

const NAZEV_REZIMU: Record<RezimRozcvicky, string> = {
  rozcvicka: 'Rozcvička',
  strecink: 'Strečink',
}

interface RozcvickaCasovacProps {
  onZavrit: () => void
}

export const RozcvickaCasovac: React.FC<RozcvickaCasovacProps> = ({ onZavrit }) => {
  const hlasoveHlaseni = useFormCheckStore((s) => s.hlasoveHlaseni)
  const [rezim, setRezim] = useState<RezimRozcvicky | null>(null)
  const [krokIndex, setKrokIndex] = useState(0)
  const [zbyvaS, setZbyvaS] = useState(0)
  const [hotovo, setHotovo] = useState(false)
  const ohlasenoRef = useRef(-1)

  const kroky = rezim ? KROKY_PODLE_REZIMU[rezim] : []

  const spustitRezim = (novyRezim: RezimRozcvicky) => {
    setRezim(novyRezim)
    setKrokIndex(0)
    setZbyvaS(KROKY_PODLE_REZIMU[novyRezim][0].sekund)
    setHotovo(false)
    ohlasenoRef.current = -1
  }

  const dalsiKrok = () => {
    const dalsi = krokIndex + 1
    if (dalsi >= kroky.length) {
      setHotovo(true)
      if (hlasoveHlaseni) ohlasHotovoRozcvicka()
      return
    }
    setKrokIndex(dalsi)
    setZbyvaS(kroky[dalsi].sekund)
  }

  // Odpočítávání po vteřinách — stejný "1s tik, vlastní cleanup" princip
  // jako FormCheck.tsx's odpočinek mezi sériemi.
  useEffect(() => {
    if (!rezim || hotovo) return
    if (zbyvaS <= 0) {
      dalsiKrok()
      return
    }
    const timer = window.setTimeout(() => setZbyvaS((s) => s - 1), 1000)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zbyvaS, rezim, hotovo])

  // Ohlásit jméno kroku hlasem, jakmile na něj appka přejde — jednou za
  // krok, ne při každém odtikání vteřiny (ohlasenoRef hlídá index
  // posledně ohlášeného kroku).
  useEffect(() => {
    if (!rezim || hotovo) return
    if (ohlasenoRef.current === krokIndex) return
    ohlasenoRef.current = krokIndex
    if (hlasoveHlaseni) ohlasKrokRozcvicky(kroky[krokIndex].nazev)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [krokIndex, rezim, hotovo])

  return (
    <div className="rc-overlay" role="dialog" aria-modal="true" aria-label="Rozcvička a strečink">
      <div className="rc-karta">
        <button type="button" className="rc-zavrit" onClick={onZavrit} aria-label="Zavřít">
          ✕
        </button>

        {rezim === null && (
          <div className="rc-vyber">
            <h2>Rozcvička &amp; strečink</h2>
            <p>Krátký, pevně daný sled cviků — bez kamery, jen odpočítávání a hlasové ohlášení dalšího kroku.</p>
            <button type="button" className="rc-vyber-btn" onClick={() => spustitRezim('rozcvicka')}>
              🔥 Rozcvička před tréninkem
            </button>
            <button type="button" className="rc-vyber-btn" onClick={() => spustitRezim('strecink')}>
              🧘 Strečink po tréninku
            </button>
          </div>
        )}

        {rezim !== null && !hotovo && (
          <div className="rc-bezi">
            <span className="rc-nadpis-rezimu">{NAZEV_REZIMU[rezim]}</span>
            <span className="rc-krok-pocet">
              Krok {krokIndex + 1} z {kroky.length}
            </span>
            <span className="rc-krok-nazev">{kroky[krokIndex].nazev}</span>
            <span className="rc-cas">{zbyvaS}s</span>
            <div className="rc-ovladani">
              <button type="button" className="rc-preskocit" onClick={dalsiKrok}>
                {krokIndex + 1 >= kroky.length ? 'Dokončit' : 'Přeskočit krok'}
              </button>
              <button type="button" className="rc-ukoncit" onClick={onZavrit}>
                Ukončit
              </button>
            </div>
          </div>
        )}

        {hotovo && (
          <div className="rc-hotovo">
            <span className="rc-hotovo-ikona" aria-hidden="true">
              🎉
            </span>
            <p>Hotovo! Skvělá práce.</p>
            <button type="button" className="rc-vyber-btn" onClick={() => setRezim(null)}>
              Zpět na výběr
            </button>
            <button type="button" className="rc-ukoncit" onClick={onZavrit}>
              Zavřít
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default RozcvickaCasovac
