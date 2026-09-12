import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSurvivalEngine } from './useSurvivalEngine'
import { VYCHOZI_POSTAVA } from './data/postavy'
import { StartScreen } from './components/StartScreen'
import { Hra } from './components/Hra'
import { RunEndScreen } from './components/RunEndScreen'
import './SurvivalModule.css'

// ==========================================
// Survival Night — orchestrátor obrazovek (bod 30 zadání: Game Menu →
// Start Game → Game → Run End → zpátky). Jedna instance
// useSurvivalEngine žije po celou dobu, co je tahle komponenta
// namontovaná — přechod start→hra→konec jen mění, co se z jejího
// stavu zrovna zobrazuje, engine sám neresetuje nic, dokud appka
// nezavolá restartovat().
//
// Landscape, stejný postup jako BuddyZone/Souboj: appka se snaží
// telefon zamknout na šířku (screen.orientation.lock, best-effort —
// nefunguje mimo fullscreen a vůbec na iOS Safari), ale skutečnou
// zárukou je čistě CSS "otoč telefon" výzva v SurvivalModule.css přes
// @media (orientation: portrait), co skutečný obsah schová, dokud
// telefon doopravdy na šířku neleží.
// ==========================================

type Obrazovka = 'start' | 'hra' | 'konec'

export const SurvivalModule: React.FC = () => {
  const navigate = useNavigate()
  const [obrazovka, setObrazovka] = useState<Obrazovka>('start')
  const {
    hud,
    stavRef,
    nastavSmer,
    krok,
    vysledekBehu,
    restartovat,
    ukoncitPredcasne,
    extrahovat,
    pokracovat,
    vyberPerk,
  } = useSurvivalEngine(VYCHOZI_POSTAVA)

  // Jakmile engine zapíše výsledek běhu (smrt nebo "Ukončit" v HUD),
  // appka přejde na Run End obrazovku — přesně jednou za běh.
  useEffect(() => {
    if (vysledekBehu) setObrazovka('konec')
  }, [vysledekBehu])

  useEffect(() => {
    // DOM lib netypuje `.lock()` (pořád experimentální metoda) — místní
    // cast stejný jako GamesHubModule.tsx/Ovladac.tsx jinde v appce.
    const orientaceSZamkem = screen.orientation as ScreenOrientation & {
      lock?: (orientace: string) => Promise<void>
    }
    orientaceSZamkem.lock?.('landscape').catch(() => {})
  }, [])

  const zacniHru = () => {
    restartovat()
    setObrazovka('hra')
  }

  return (
    <div className="sn-page">
      <div className="sn-rotate-prompt" aria-hidden="true">
        <span className="sn-rotate-ikona">🔄</span>
        <p>Otoč telefon na šířku</p>
      </div>

      <div className="sn-shell">
        {obrazovka === 'start' && <StartScreen onHrat={zacniHru} onZpet={() => navigate('/hra')} />}

        {obrazovka === 'hra' && (
          <Hra
            hud={hud}
            stavRef={stavRef}
            nastavSmer={nastavSmer}
            krok={krok}
            onUkoncit={ukoncitPredcasne}
            onExtrahovat={extrahovat}
            onPokracovat={pokracovat}
            onVyberPerk={vyberPerk}
          />
        )}

        {obrazovka === 'konec' && vysledekBehu && (
          <RunEndScreen vysledek={vysledekBehu} onHratZnovu={zacniHru} onHlavniMenu={() => setObrazovka('start')} />
        )}
      </div>
    </div>
  )
}

export default SurvivalModule
