import React, { useEffect } from 'react'
import { ARENA_SIRKA } from '../combat/engine'
import { POSTAVY } from '../combat/postavy'
import { vizualniStavBojovnika } from '../combat/loop'
import { useSoubojScene } from '../arena/useSoubojScene'
import { PostavaGrafika } from './PostavaGrafika'
import { Jiskry } from './Jiskry'
import type { SoubojStav } from '../combat/types'

interface Props {
  stav: SoubojStav
  zasazen: [boolean, boolean]
  /** Zavolá se přesně jednou, pokud se WebGL scénu nepodaří vytvořit
   *  (useSoubojScene.ts's `selhalo`) — Bojiste.tsx na to reaguje
   *  přepnutím na SoubojArena2D, ať zápas zůstává hratelný i na
   *  zařízení bez WebGL. */
  onSelhalo: () => void
}

// ==========================================
// Skutečná 3D aréna (viz useSoubojScene.ts pro celé zdůvodnění) —
// rozdělená obrazovka, vlastní kamera pro každého hráče, tráva/
// stromy/voda jako primitivní geometrie, bojovníci jako ploché SVG
// "billboardy" pozicované podle 3D projekce. Tahle komponenta sama
// nepočítá nic navíc — jen zapojí hook (containerRef pro canvas,
// aktualizujPozice při každé změně stav.hraci) a vykreslí 4 instance
// stejného "bojovník" markupu, jaký SoubojArena2D.tsx používá jednou
// za bojovníka — tady dvakrát (jednou za kameru), protože obě
// poloviny obrazovky ukazují OBA bojovníky, jen z jiného úhlu.
// ==========================================

export const SoubojArena3D: React.FC<Props> = ({ stav, zasazen, onSelhalo }) => {
  const { containerRef, selhalo, aktualizujPozice, registrujSprite } = useSoubojScene({ arenaSirka: ARENA_SIRKA })

  useEffect(() => {
    aktualizujPozice(stav.hraci[0].pozice, stav.hraci[1].pozice)
  }, [stav.hraci, aktualizujPozice])

  useEffect(() => {
    if (selhalo) onSelhalo()
  }, [selhalo, onSelhalo])

  // Bojiste.tsx se o chvilku později přepne na SoubojArena2D — do té
  // doby nevykreslovat nic (žádný prázdný canvas navíc).
  if (selhalo) return null

  return (
    <div className="souboj-arena souboj-arena--3d" ref={containerRef}>
      <div className="souboj-arena-3d-delic" aria-hidden="true" />
      <span className="souboj-arena-3d-stitek souboj-arena-3d-stitek--1">🎮 Pohled hráče 1</span>
      <span className="souboj-arena-3d-stitek souboj-arena-3d-stitek--2">🎮 Pohled hráče 2</span>

      {([0, 1] as const).flatMap((kamera) =>
        ([0, 1] as const).map((i) => {
          const b = stav.hraci[i]
          const postava = POSTAVY[b.postavaId]
          const vizStav = vizualniStavBojovnika(b)
          return (
            <div key={`${kamera}-${i}`} ref={registrujSprite(kamera, i)} className="souboj-3d-sprite">
              <div className={`souboj-bojovnik souboj-bojovnik--${i + 1} souboj-bojovnik--${vizStav}`}>
                <PostavaGrafika postavaId={postava.id} size={54} />
                {zasazen[i] && <Jiskry />}
                {b.stitAktivni && <span className="souboj-stit-znacka">🛡️</span>}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
