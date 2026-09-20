import React, { useEffect, useRef, useState } from 'react'
import { useFormCheckStore } from '@/miniapps/form-check/useFormCheck'
import { ohlasKrokRozcvicky, ohlasHotovoRozcvicka } from '@/miniapps/form-check/hlaseni'
import { PROGRAMY_ROZCVICKY, NAZEV_KATEGORIE, type ProgramRozcvicky } from './data/programyRozcvicky'
import { useRozcvickaStore } from './useRozcvickaStore'
import './RozcvickaCasovac.css'

// ==========================================
// Rozcvička/strečink/jóga časovač — na rozdíl od Form Checku BEZ kamery,
// jde jen o odpočítávání pevně dané sady kroků s hlasovým ohlášením
// dalšího kroku (u jógy i s krátkým pokynem, jak pozici udělat — viz
// data/programyRozcvicky.ts). Pevná sada programů, ne libovolný vstup
// uživatele.
//
// Otevírá se z Fitness Roomova dashboardu (dlaždice "Mobilita", dřív
// natvrdo "Brzy" — tohle je to, co ji doopravdy naplňuje).
//
// Fáze 3 Fitness Roomova rozšiřování ("Jóga a mobilita s hlasovým
// průvodcem") sem přidala čtyři jógové/mobilitní programy vedle
// původních dvou a XP za dokončení — nejvýš jednou denně
// (useRozcvickaStore.ts), ať appka neodmění opakované "Přeskočit krok"
// naklikávání.
// ==========================================

const RYCHLE_PROGRAMY = PROGRAMY_ROZCVICKY.filter((p) => p.kategorie !== 'joga')
const JOGA_PROGRAMY = PROGRAMY_ROZCVICKY.filter((p) => p.kategorie === 'joga')

interface RozcvickaCasovacProps {
  onZavrit: () => void
}

export const RozcvickaCasovac: React.FC<RozcvickaCasovacProps> = ({ onZavrit }) => {
  const hlasoveHlaseni = useFormCheckStore((s) => s.hlasoveHlaseni)
  const pocetDokoncenychCelkem = useRozcvickaStore((s) => s.pocetDokoncenychCelkem)
  const oznacDokonceni = useRozcvickaStore((s) => s.oznacDokonceni)

  const [vybranyId, setVybranyId] = useState<string | null>(null)
  const [krokIndex, setKrokIndex] = useState(0)
  const [zbyvaS, setZbyvaS] = useState(0)
  const [hotovo, setHotovo] = useState(false)
  const [ziskanaXpDnes, setZiskanaXpDnes] = useState(false)
  const ohlasenoRef = useRef(-1)

  const program: ProgramRozcvicky | null =
    PROGRAMY_ROZCVICKY.find((p) => p.id === vybranyId) ?? null
  const kroky = program?.kroky ?? []

  const spustitProgram = (id: string) => {
    const vybrany = PROGRAMY_ROZCVICKY.find((p) => p.id === id)
    if (!vybrany) return
    setVybranyId(id)
    setKrokIndex(0)
    setZbyvaS(vybrany.kroky[0].sekund)
    setHotovo(false)
    setZiskanaXpDnes(false)
    ohlasenoRef.current = -1
  }

  const dalsiKrok = () => {
    const dalsi = krokIndex + 1
    if (dalsi >= kroky.length) {
      setHotovo(true)
      if (hlasoveHlaseni) ohlasHotovoRozcvicka()
      setZiskanaXpDnes(oznacDokonceni())
      return
    }
    setKrokIndex(dalsi)
    setZbyvaS(kroky[dalsi].sekund)
  }

  // Odpočítávání po vteřinách — stejný "1s tik, vlastní cleanup" princip
  // jako FormCheck.tsx's odpočinek mezi sériemi.
  useEffect(() => {
    if (!program || hotovo) return
    if (zbyvaS <= 0) {
      dalsiKrok()
      return
    }
    const timer = window.setTimeout(() => setZbyvaS((s) => s - 1), 1000)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zbyvaS, program, hotovo])

  // Ohlásit jméno kroku (a u jógy i krátký pokyn) hlasem, jakmile na něj
  // appka přejde — jednou za krok, ne při každém odtikání vteřiny
  // (ohlasenoRef hlídá index posledně ohlášeného kroku).
  useEffect(() => {
    if (!program || hotovo) return
    if (ohlasenoRef.current === krokIndex) return
    ohlasenoRef.current = krokIndex
    if (hlasoveHlaseni) ohlasKrokRozcvicky(kroky[krokIndex].nazev, kroky[krokIndex].popis)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [krokIndex, program, hotovo])

  return (
    <div className="rc-overlay" role="dialog" aria-modal="true" aria-label="Rozcvička, strečink a jóga">
      <div className="rc-karta">
        <button type="button" className="rc-zavrit" onClick={onZavrit} aria-label="Zavřít">
          ✕
        </button>

        {program === null && (
          <div className="rc-vyber">
            <h2>Rozcvička, strečink &amp; jóga</h2>
            <p>Krátké, pevně dané sledy cviků — bez kamery, jen odpočítávání a hlasové vedení.</p>
            {pocetDokoncenychCelkem > 0 && (
              <span className="rc-celkem">Celkem dokončeno: {pocetDokoncenychCelkem}×</span>
            )}

            <span className="rc-skupina-nadpis">Rychlé</span>
            <div className="rc-program-seznam">
              {RYCHLE_PROGRAMY.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="rc-program-radek"
                  onClick={() => spustitProgram(p.id)}
                >
                  <span className="rc-program-ikona" aria-hidden="true">
                    {p.ikona}
                  </span>
                  <span className="rc-program-text">
                    <span className="rc-program-nazev">{p.nazev}</span>
                    <span className="rc-program-popis">{p.popis}</span>
                  </span>
                </button>
              ))}
            </div>

            <span className="rc-skupina-nadpis">Jóga a mobilita</span>
            <div className="rc-program-seznam">
              {JOGA_PROGRAMY.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="rc-program-radek"
                  onClick={() => spustitProgram(p.id)}
                >
                  <span className="rc-program-ikona" aria-hidden="true">
                    {p.ikona}
                  </span>
                  <span className="rc-program-text">
                    <span className="rc-program-nazev">{p.nazev}</span>
                    <span className="rc-program-popis">{p.popis}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {program !== null && !hotovo && (
          <div className="rc-bezi">
            <span className="rc-nadpis-rezimu">{NAZEV_KATEGORIE[program.kategorie]}</span>
            <span className="rc-krok-pocet">
              Krok {krokIndex + 1} z {kroky.length}
            </span>
            <span className="rc-krok-nazev">{kroky[krokIndex].nazev}</span>
            {kroky[krokIndex].popis && <span className="rc-krok-popis">{kroky[krokIndex].popis}</span>}
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
            {ziskanaXpDnes && <span className="rc-hotovo-xp">+15 XP</span>}
            <button type="button" className="rc-vyber-btn" onClick={() => setVybranyId(null)}>
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
