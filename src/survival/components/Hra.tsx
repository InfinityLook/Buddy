import React, { useEffect } from 'react'
import { useSurvivalScene } from '../scene/useSurvivalScene'
import { VirtualniJoystick } from '@/game/components/VirtualniJoystick'
import { HUD } from './HUD'
import { SurvivalHerniStav } from '../types'

// ==========================================
// Herní obrazovka — JEDNA sdílená requestAnimationFrame smyčka (bod 26
// zadání: appka nechce dvě nezávislé smyčky pro engine a scénu zvlášť)
// volá v každém snímku engine.krok() (mutuje sdílený stavRef) a hned
// nato scene.aktualizuj() se stejným, už aktualizovaným stavem — engine
// i vykreslení tak vždycky vidí přesně tentýž snímek dat, stejný vzor
// jako Souboj's TvHost.tsx.
//
// Znovupoužívá appčin existující VirtualniJoystick.tsx (z Buddyheim's
// 3D průzkumu) beze změny — bod 3 zadání se ptá, jestli je vhodné mít
// virtuální joystick; appka ho už má hotový, stačí ho zapojit.
// ==========================================

interface Props {
  hud: SurvivalHerniStav
  stavRef: React.RefObject<SurvivalHerniStav>
  nastavSmer: (x: number, z: number) => void
  krok: (dtMs: number) => void
  onUkoncit: () => void
}

export const Hra: React.FC<Props> = ({ hud, stavRef, nastavSmer, krok, onUkoncit }) => {
  const scene = useSurvivalScene()

  useEffect(() => {
    let smycka = 0
    let posledniCas = performance.now()

    const tik = (ted: number) => {
      smycka = requestAnimationFrame(tik)
      const dt = Math.min(ted - posledniCas, 100)
      posledniCas = ted
      krok(dt)
      if (stavRef.current) scene.aktualizuj(stavRef.current)
    }
    smycka = requestAnimationFrame(tik)

    return () => cancelAnimationFrame(smycka)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="sn-arena">
      <div className="sn-arena-canvas" ref={scene.containerRef}>
        {scene.selhalo && (
          <div className="sn-arena-selhalo">
            <p>3D vykreslení se na tomhle zařízení nepovedlo spustit.</p>
          </div>
        )}
      </div>

      <HUD stav={hud} onUkoncit={onUkoncit} />

      <VirtualniJoystick onZmena={nastavSmer} />
    </div>
  )
}
