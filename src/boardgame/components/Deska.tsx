import React, { useEffect, useRef, useState } from 'react'
import { melByBotKoupit, pripravSmerBota } from '../ai'
import {
  aktivniHrac,
  koupitPole,
  krokHodu,
  krokPohybu,
  odmitnoutKoupi,
  ukonciTah,
  vitezovePodleStavu,
  vytvorTrhStav,
  zbyvaCasuMs,
  zkontrolujCas,
} from '../engine'
import { conicGradientKola, stredovyUhelVysledku } from '../data/kolaStesti'
import { OBCHODY_PODLE_KLICE } from '../obchody'
import { POSTAVY } from '../postavy'
import { useTrhScene } from '../scene/useTrhScene'
import type { Hrac, LimitMinut, Smer } from '../types'

// ==========================================
// Buddyho Trh — herní obrazovka: 3D deska + kostka + pohyb + Fáze 1
// ekonomika (nabídka koupě, nájmy, časový limit). Boti hrají a
// rozhodují automaticky přes efekt sledující `stav` — stejný "efekt
// reaguje na změnu stavu, nastaví jeden timeout, sám se uklidí" vzor
// jako typing indikátor/notifikace jinde v appce, ne samostatná herní
// smyčka.
// ==========================================

const ZPOZDENI_HODU_MS = 650
const ZPOZDENI_KROKU_MS = 420
const ZPOZDENI_KONCE_TAHU_MS = 500
const ZPOZDENI_ROZHODNUTI_MS = 700

// Kolo štěstí (Fáze 3) — čistě kosmetická animace dotočení, viz jeho
// vlastní komentář u stavu níž. Appka respektuje prefers-reduced-motion
// zkontrolovaným jednou při startu modulu (stejný "PODPORUJE_X"
// jednorázový feature-detect jako jinde v appce) — bez toho by overlay
// visel celou dlouhou animaci, zatímco samotné kolo by se díky
// sitewide kill-switchi v global.css vizuálně otočilo skoro okamžitě.
const PREFERUJE_REDUKOVANY_POHYB =
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const POCET_OTOCEK_KOLA = 4
const DELKA_ANIMACE_KOLA_MS = PREFERUJE_REDUKOVANY_POHYB ? 300 : 2600

interface Props {
  pocatecniHraci: Hrac[]
  limitMinut: LimitMinut
  onZpet: () => void
}

const NAZEV_SMERU: Record<Smer, string> = {
  nahoru: '↑',
  dolu: '↓',
  vlevo: '←',
  vpravo: '→',
}

const formatCas = (ms: number): string => {
  const celkemSekund = Math.ceil(ms / 1000)
  const min = Math.floor(celkemSekund / 60)
  const sek = celkemSekund % 60
  return `${min}:${sek.toString().padStart(2, '0')}`
}

export const Deska: React.FC<Props> = ({ pocatecniHraci, limitMinut, onZpet }) => {
  const [stav, setStav] = useState(() => vytvorTrhStav(pocatecniHraci, limitMinut))
  const [, setTik] = useState(0)
  const { containerRef, selhalo } = useTrhScene({ stav })

  // Kolo štěstí (Fáze 3) — engine rozhodne výsledek OKAMŽITĚ uvnitř
  // krokPohybu (peníze/bonusový hod se do `stav` promítnou hned), tenhle
  // stav jen zpožďuje jeho ODHALENÍ hráči animací roztočeného kola.
  // `uhelKola` roste monotónně (appka ho nikdy nevrací zpátky na 0) —
  // CSS transition tak kolo při každém dalším vytažení prostě točí dál,
  // žádné "poskočení" zpátky na začátek.
  const [uhelKola, setUhelKola] = useState(0)
  const [kolostestiAktivni, setKolostestiAktivni] = useState(false)
  const poslKolostestiPocetRef = useRef(stav.kolostestiPocet)

  // Hlídá rostoucí `stav.kolostestiPocet`, ne jen `posledniVysledekKolaId`
  // samotné — dva různé tahy mohou vytáhnout STEJNÝ výsledek (stejné
  // id), takže porovnání jen podle id by druhé vytažení v řadě tiše
  // přehlédlo (stará a nová hodnota by byly identické).
  useEffect(() => {
    if (stav.kolostestiPocet === poslKolostestiPocetRef.current) return
    poslKolostestiPocetRef.current = stav.kolostestiPocet
    if (!stav.posledniVysledekKolaId) return
    const cilovyUhel = stredovyUhelVysledku(stav.posledniVysledekKolaId)
    // Ukazatel je pevně nahoře (0°) — appka kolo musí otočit tak, aby
    // střed trefeného segmentu skončil POD ním, tedy o (360 - cílový
    // úhel), plus pár celých otoček navíc jen pro vizuální efekt.
    setUhelKola((u) => u + POCET_OTOCEK_KOLA * 360 + (360 - cilovyUhel))
    setKolostestiAktivni(true)
    const cas = window.setTimeout(() => setKolostestiAktivni(false), DELKA_ANIMACE_KOLA_MS)
    return () => window.clearTimeout(cas)
  }, [stav.kolostestiPocet, stav.posledniVysledekKolaId])

  // Čistě zobrazovací tik jednou za sekundu — appka tak umí ukázat
  // odpočet i beze změny `stav` samotného (`zkontrolujCas` je no-op,
  // dokud čas doopravdy nevyprší, takže by React jinak nepřekreslil).
  // Ve stejném intervalu appka zavolá i skutečnou kontrolu limitu.
  useEffect(() => {
    const id = window.setInterval(() => {
      setTik((t) => t + 1)
      setStav((s) => zkontrolujCas(s))
    }, 1000)
    return () => window.clearInterval(id)
  }, [])

  // Automatický konec tahu, jakmile dojdou kroky — ale ne dokud čeká
  // nerozhodnutá nabídka koupě (tu musí nejdřív někdo vyřešit) ani
  // dokud běží animace kola štěstí (Fáze 3) — appka by jinak tah
  // ukončila (a u bonusového hodu rovnou otočila na druhý hod) dřív,
  // než hráč vůbec uvidí, co se stalo.
  useEffect(() => {
    if (stav.faze !== 'konec-tahu' || stav.nabidkaKoupe || stav.konec || kolostestiAktivni) return
    const cas = window.setTimeout(() => setStav((s) => ukonciTah(s)), ZPOZDENI_KONCE_TAHU_MS)
    return () => window.clearTimeout(cas)
  }, [stav.faze, stav.nabidkaKoupe, stav.konec, kolostestiAktivni])

  // Bot hraje sám — hodí kostkou, pak krok po kroku dojde, kam může,
  // a jakmile na cestě narazí na nabídku koupě, sám ji vyřídí. Stejná
  // kolostestiAktivni pojistka jako výš, ať appka bota nenechá "myslet"
  // dál, zatímco ještě běží animace jeho vlastního kola štěstí.
  useEffect(() => {
    if (stav.konec || kolostestiAktivni) return
    const hrac = aktivniHrac(stav)
    if (!hrac?.jeBot) return
    if (stav.faze === 'konec-tahu' && !stav.nabidkaKoupe) return

    const zpozdeni =
      stav.faze === 'hod' ? ZPOZDENI_HODU_MS : stav.faze === 'pohyb' ? ZPOZDENI_KROKU_MS : ZPOZDENI_ROZHODNUTI_MS
    const cas = window.setTimeout(() => {
      setStav((s) => {
        const aktualni = aktivniHrac(s)
        if (!aktualni) return s
        if (s.faze === 'hod') return krokHodu(s)
        if (s.faze === 'pohyb') return krokPohybu(s, pripravSmerBota(aktualni, s))
        if (s.faze === 'konec-tahu' && s.nabidkaKoupe) {
          const obchod = OBCHODY_PODLE_KLICE[s.nabidkaKoupe]
          if (!obchod) return odmitnoutKoupi(s)
          return melByBotKoupit(aktualni, obchod) ? koupitPole(s) : odmitnoutKoupi(s)
        }
        return s
      })
    }, zpozdeni)
    return () => window.clearTimeout(cas)
  }, [stav, kolostestiAktivni])

  const hrac = aktivniHrac(stav)
  const jeNaTahuBot = hrac?.jeBot ?? false
  const nabidka = stav.nabidkaKoupe ? OBCHODY_PODLE_KLICE[stav.nabidkaKoupe] : null
  const vysledek = stav.konec ? vitezovePodleStavu(stav) : null

  return (
    <div className="trh-page trh-page--hra">
      {kolostestiAktivni && (
        <div className="trh-kolo-overlay">
          <p className="trh-kolo-nadpis">🎡 Kolo štěstí!</p>
          <div className="trh-kolo-wrap">
            <span className="trh-kolo-ukazatel" aria-hidden="true">
              ▼
            </span>
            <div
              className="trh-kolo-disk"
              style={{
                background: conicGradientKola(),
                transform: `rotate(${uhelKola}deg)`,
                transitionDuration: `${DELKA_ANIMACE_KOLA_MS}ms`,
              }}
            />
          </div>
        </div>
      )}

      <header className="trh-top-bar">
        <button className="trh-back-btn" onClick={onZpet}>
          ← Ukončit hru
        </button>
        <h1 className="trh-title">Buddyho Trh</h1>
        {!stav.konec && <p className="trh-cas">⏱ {formatCas(zbyvaCasuMs(stav))}</p>}
      </header>

      <div className="trh-deska-obal">
        {selhalo ? (
          <p className="trh-varovani">3D vykreslení se na tomhle zařízení nepovedlo spustit.</p>
        ) : (
          <div className="trh-deska-canvas" ref={containerRef} />
        )}
      </div>

      <div className="trh-poradi">
        {stav.hraci.map((h) => (
          <span key={h.id} className={`trh-poradi-hrac ${h.id === hrac?.id ? 'je-na-tahu' : ''}`}>
            <span style={{ color: POSTAVY[h.postavaId].barva }}>{POSTAVY[h.postavaId].emoji}</span> {h.jmeno} ·{' '}
            {h.penize} Kč
          </span>
        ))}
      </div>

      {stav.posledniUdalost && !stav.konec && <p className="trh-udalost">{stav.posledniUdalost}</p>}

      {vysledek ? (
        <div className="trh-konec">
          <h2 className="trh-konec-nadpis">
            {vysledek.length > 1 ? '🤝 Remíza!' : `🏆 Vyhrál ${vysledek[0].jmeno}!`}
          </h2>
          <ul className="trh-vysledky">
            {[...stav.hraci]
              .sort((a, b) => b.penize - a.penize)
              .map((h) => (
                <li key={h.id} className={`trh-vysledek-radek ${vysledek.some((v) => v.id === h.id) ? 'je-vitez' : ''}`}>
                  <span style={{ color: POSTAVY[h.postavaId].barva }}>{POSTAVY[h.postavaId].emoji}</span>
                  <span className="trh-vysledek-jmeno">{h.jmeno}</span>
                  <span className="trh-vysledek-penize">{h.penize} Kč</span>
                </li>
              ))}
          </ul>
          <button className="trh-spustit-btn" onClick={onZpet}>
            Zpět do menu
          </button>
        </div>
      ) : (
        <div className="trh-ovladani">
          {hrac && (
            <p className="trh-na-tahu">
              Na tahu: <strong>{hrac.jmeno}</strong>
              {jeNaTahuBot && ' (bot)'}
            </p>
          )}

          {stav.faze === 'hod' && (
            <button
              className="trh-kostka-btn"
              disabled={jeNaTahuBot}
              onClick={() => setStav((s) => krokHodu(s))}
            >
              🎲 Hodit kostkou
            </button>
          )}

          {stav.faze === 'pohyb' && (
            <>
              <p className="trh-zbyva">Zbývá kroků: {stav.zbyvaKroku}</p>
              <div className="trh-dpad">
                <button
                  className="trh-dpad-btn trh-dpad-btn--nahoru"
                  disabled={jeNaTahuBot}
                  onClick={() => setStav((s) => krokPohybu(s, 'nahoru'))}
                >
                  {NAZEV_SMERU.nahoru}
                </button>
                <button
                  className="trh-dpad-btn trh-dpad-btn--vlevo"
                  disabled={jeNaTahuBot}
                  onClick={() => setStav((s) => krokPohybu(s, 'vlevo'))}
                >
                  {NAZEV_SMERU.vlevo}
                </button>
                <button
                  className="trh-dpad-btn trh-dpad-btn--vpravo"
                  disabled={jeNaTahuBot}
                  onClick={() => setStav((s) => krokPohybu(s, 'vpravo'))}
                >
                  {NAZEV_SMERU.vpravo}
                </button>
                <button
                  className="trh-dpad-btn trh-dpad-btn--dolu"
                  disabled={jeNaTahuBot}
                  onClick={() => setStav((s) => krokPohybu(s, 'dolu'))}
                >
                  {NAZEV_SMERU.dolu}
                </button>
              </div>
              <button className="trh-ukoncit-tah-btn" disabled={jeNaTahuBot} onClick={() => setStav((s) => ukonciTah(s))}>
                Ukončit tah
              </button>
            </>
          )}

          {stav.faze === 'konec-tahu' && nabidka && !jeNaTahuBot && (
            <div className="trh-nabidka">
              <p className="trh-nabidka-text">
                Volné pole: <strong>{nabidka.nazev}</strong> — {nabidka.cena} Kč (nájem {nabidka.najem} Kč)
              </p>
              <div className="trh-nabidka-btns">
                <button
                  className="trh-kostka-btn"
                  disabled={!hrac || hrac.penize < nabidka.cena}
                  onClick={() => setStav((s) => koupitPole(s))}
                >
                  Koupit za {nabidka.cena} Kč
                </button>
                <button className="trh-ukoncit-tah-btn" onClick={() => setStav((s) => odmitnoutKoupi(s))}>
                  Nekoupit
                </button>
              </div>
            </div>
          )}

          {stav.faze === 'konec-tahu' && nabidka && jeNaTahuBot && (
            <p className="trh-zbyva">Bot přemýšlí o koupi {nabidka.nazev}…</p>
          )}
        </div>
      )}
    </div>
  )
}

export default Deska
