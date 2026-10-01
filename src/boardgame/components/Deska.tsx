import React, { useEffect, useRef, useState } from 'react'
import { melByBotKoupit, melByBotSabotovat, pripravSmerBota } from '../ai'
import {
  aktivniHrac,
  koupitPole,
  krokHodu,
  krokPohybu,
  odmitnoutKoupi,
  provedSabotaz,
  ukonciTah,
  vitezovePodleStavu,
  vytvorTrhStav,
  zbyvaCasuMs,
  zkontrolujCas,
} from '../engine'
import { conicGradientKola, stredovyUhelVysledku } from '../data/kolaStesti'
import { SABOTAZNI_AKCE, type SabotazniAkce } from '../data/sabotaze'
import { OBCHODY_PODLE_KLICE } from '../obchody'
import { POSTAVY } from '../postavy'
import { useTrhScene } from '../scene/useTrhScene'
import type { Hrac, LimitMinut, Smer } from '../types'

// ==========================================
// Buddyho Trh — herní obrazovka: 3D deska + kostka + pohyb + Fáze 1
// ekonomika (nabídka koupě, nájmy, časový limit), Fáze 2 Osud, Fáze 3
// kolo štěstí a Fáze 4 sabotáž. Boti hrají a rozhodují automaticky
// přes efekt sledující `stav` — stejný "efekt reaguje na změnu stavu,
// nastaví jeden timeout, sám se uklidí" vzor jako typing
// indikátor/notifikace jinde v appce, ne samostatná herní smyčka.
// ==========================================

const ZPOZDENI_HODU_MS = 650
const ZPOZDENI_KROKU_MS = 420
const ZPOZDENI_KONCE_TAHU_MS = 500
const ZPOZDENI_ROZHODNUTI_MS = 700
// Sabotáž (Fáze 4) — záměrně KRATŠÍ než ZPOZDENI_KONCE_TAHU_MS výš.
// Na rozdíl od nabídky koupě (appka při čekající nabídce vůbec
// nenaplánuje auto-konec tahu, viz ten useEffect níž) sabotáž žádnou
// takovou pojistku nemá — konec-tahu bez nabídky koupě VŽDYCKY
// odpočítává k automatickému ukonciTah, i když bot zrovna zvažuje
// sabotáž. Kratší zpoždění je to, co botovi sabotáž vůbec dává šanci
// proběhnout dřív, než appka tah sama ukončí.
const ZPOZDENI_SABOTAZE_MS = 300

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

  // Sabotáž (Fáze 4) — čistě lokální UI stav pro dvoukrokový sheet
  // (vyber akci → vyber cíl), engine sám o "otevřeném sheetu" nic
  // neví, jen o výsledku `provedSabotaz`. Appka sheet zavře pokaždé,
  // když se `aktivniIndex` doopravdy přesune na jiného hráče (kryje
  // jak normální předání tahu, tak "přeskoč celý tah" větev) — NE při
  // bonusovém hodu kola štěstí (stejný index, pořád stejný tah), takže
  // nehrozí zavření sheetu, dokud by ho hráč pořád mohl chtít použít.
  const [sabotazOtevrena, setSabotazOtevrena] = useState(false)
  const [vybranaAkce, setVybranaAkce] = useState<SabotazniAkce | null>(null)
  useEffect(() => {
    setSabotazOtevrena(false)
    setVybranaAkce(null)
  }, [stav.aktivniIndex])

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
  // nerozhodnutá nabídka koupě (tu musí nejdřív někdo vyřešit), dokud
  // běží animace kola štěstí (Fáze 3), ani dokud má hráč otevřený
  // sabotážní sheet (Fáze 4) — appka by jinak tah ukončila (a u
  // bonusového hodu rovnou otočila na druhý hod) dřív, než hráč vůbec
  // stihne sabotáž vybrat a potvrdit.
  useEffect(() => {
    if (stav.faze !== 'konec-tahu' || stav.nabidkaKoupe || stav.konec || kolostestiAktivni || sabotazOtevrena) return
    const cas = window.setTimeout(() => setStav((s) => ukonciTah(s)), ZPOZDENI_KONCE_TAHU_MS)
    return () => window.clearTimeout(cas)
  }, [stav.faze, stav.nabidkaKoupe, stav.konec, kolostestiAktivni, sabotazOtevrena])

  // Bot hraje sám — hodí kostkou, pak krok po kroku dojde, kam může,
  // jakmile na cestě narazí na nabídku koupě, sám ji vyřídí, a jakmile
  // doběhne do konce tahu bez nabídky koupě, zvažuje i sabotáž (Fáze
  // 4). Stejná kolostestiAktivni pojistka jako výš, ať appka bota
  // nenechá "myslet" dál, zatímco ještě běží animace jeho vlastního
  // kola štěstí. Jakmile bot sabotáž tenhle tah použil (nebo nemá co
  // dál rozhodovat), appka žádný další timeout nenaplánuje — zbytek
  // obstará samostatný "automatický konec tahu" efekt výš.
  useEffect(() => {
    if (stav.konec || kolostestiAktivni) return
    const hrac = aktivniHrac(stav)
    if (!hrac?.jeBot) return
    if (stav.faze === 'konec-tahu' && !stav.nabidkaKoupe && hrac.sabotazPouzita) return

    let zpozdeni: number
    if (stav.faze === 'hod') zpozdeni = ZPOZDENI_HODU_MS
    else if (stav.faze === 'pohyb') zpozdeni = ZPOZDENI_KROKU_MS
    else if (stav.faze === 'konec-tahu' && stav.nabidkaKoupe) zpozdeni = ZPOZDENI_ROZHODNUTI_MS
    else zpozdeni = ZPOZDENI_SABOTAZE_MS

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
        if (s.faze === 'konec-tahu' && !s.nabidkaKoupe) {
          const sabotaz = melByBotSabotovat(aktualni, s.hraci)
          if (sabotaz) return provedSabotaz(s, sabotaz.akceId, sabotaz.cilId)
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

  // Vybere akci — na dvouhráčovou hru appka rovnou aplikuje (jediný
  // soupeř je jednoznačný cíl), jinak teprve otevře výběr cíle.
  const vyberAkciSabotaze = (akce: SabotazniAkce) => {
    if (!hrac) return
    const ostatni = stav.hraci.filter((h) => h.id !== hrac.id)
    if (ostatni.length === 1) {
      setStav((s) => provedSabotaz(s, akce.id, ostatni[0].id))
      setSabotazOtevrena(false)
    } else {
      setVybranaAkce(akce)
    }
  }

  const pouzitSabotazNaCil = (cilId: string) => {
    if (!vybranaAkce) return
    setStav((s) => provedSabotaz(s, vybranaAkce.id, cilId))
    setVybranaAkce(null)
    setSabotazOtevrena(false)
  }

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
            {h.penize} kreditů
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
                  <span className="trh-vysledek-penize">{h.penize} kreditů</span>
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
                Volné pole: <strong>{nabidka.nazev}</strong> — {nabidka.cena} kreditů (nájem {nabidka.najem} kreditů)
              </p>
              <div className="trh-nabidka-btns">
                <button
                  className="trh-kostka-btn"
                  disabled={!hrac || hrac.penize < nabidka.cena}
                  onClick={() => setStav((s) => koupitPole(s))}
                >
                  Koupit za {nabidka.cena} kreditů
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

          {stav.faze === 'konec-tahu' && !nabidka && !jeNaTahuBot && (
            <div className="trh-sabotaz-panel">
              {!sabotazOtevrena ? (
                <button
                  className="trh-sabotaz-otevrit-btn"
                  disabled={!hrac || hrac.sabotazPouzita}
                  onClick={() => setSabotazOtevrena(true)}
                >
                  ⚔️ Sabotovat soupeře
                </button>
              ) : !vybranaAkce ? (
                <div className="trh-sabotaz-sheet">
                  <p className="trh-sabotaz-nadpis">Vyber sabotáž:</p>
                  {SABOTAZNI_AKCE.map((akce) => (
                    <button
                      key={akce.id}
                      className="trh-sabotaz-akce"
                      disabled={!hrac || hrac.penize < akce.cena}
                      onClick={() => vyberAkciSabotaze(akce)}
                    >
                      <span className="trh-sabotaz-akce-ikona" aria-hidden="true">
                        {akce.ikona}
                      </span>
                      <span className="trh-sabotaz-akce-text">
                        <strong>
                          {akce.nazev} — {akce.cena} kreditů
                        </strong>
                        <span>{akce.popis}</span>
                      </span>
                    </button>
                  ))}
                  <button className="trh-ukoncit-tah-btn" onClick={() => setSabotazOtevrena(false)}>
                    Zrušit
                  </button>
                </div>
              ) : (
                <div className="trh-sabotaz-sheet">
                  <p className="trh-sabotaz-nadpis">Na koho použít {vybranaAkce.nazev}?</p>
                  {stav.hraci
                    .filter((h) => h.id !== hrac?.id)
                    .map((h) => (
                      <button key={h.id} className="trh-sabotaz-cil" onClick={() => pouzitSabotazNaCil(h.id)}>
                        <span style={{ color: POSTAVY[h.postavaId].barva }}>{POSTAVY[h.postavaId].emoji}</span>{' '}
                        {h.jmeno}
                      </button>
                    ))}
                  <button className="trh-ukoncit-tah-btn" onClick={() => setVybranaAkce(null)}>
                    Zpět
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Deska
