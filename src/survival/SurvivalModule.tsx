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
// ==========================================

type Obrazovka = 'start' | 'hra' | 'konec'

export const SurvivalModule: React.FC = () => {
  const navigate = useNavigate()
  const [obrazovka, setObrazovka] = useState<Obrazovka>('start')
  const { hud, stavRef, nastavSmer, krok, vysledekBehu, restartovat, ukoncitPredcasne } =
    useSurvivalEngine(VYCHOZI_POSTAVA)

  // Jakmile engine zapíše výsledek běhu (smrt nebo "Ukončit" v HUD),
  // appka přejde na Run End obrazovku — přesně jednou za běh.
  useEffect(() => {
    if (vysledekBehu) setObrazovka('konec')
  }, [vysledekBehu])

  const zacniHru = () => {
    restartovat()
    setObrazovka('hra')
  }

  return (
    <div className="sn-page">
      {obrazovka === 'start' && <StartScreen onHrat={zacniHru} onZpet={() => navigate('/hra')} />}

      {obrazovka === 'hra' && (
        <Hra hud={hud} stavRef={stavRef} nastavSmer={nastavSmer} krok={krok} onUkoncit={ukoncitPredcasne} />
      )}

      {obrazovka === 'konec' && vysledekBehu && (
        <RunEndScreen vysledek={vysledekBehu} onHratZnovu={zacniHru} onHlavniMenu={() => setObrazovka('start')} />
      )}
    </div>
  )
}

export default SurvivalModule
