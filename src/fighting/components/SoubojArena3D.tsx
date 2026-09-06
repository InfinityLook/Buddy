import React, { useEffect } from 'react'
import { ARENA_SIRKA } from '../combat/engine'
import { POSTAVY } from '../combat/postavy'
import { jeComeback, jeParry, vizualniStavBojovnika } from '../combat/loop'
import { useSoubojScene } from '../arena/useSoubojScene'
import { ARENY, VYCHOZI_ARENA, type Arena, type ArenaId } from '../arena/areny'
import { PostavaGrafika } from './PostavaGrafika'
import { Jiskry } from './Jiskry'
import type { BojovnikStav, SoubojStav } from '../combat/types'

interface Props {
  stav: SoubojStav
  zasazen: [boolean, boolean]
  /** Vylepšení — kterou scénu (areny.ts) TV vybrala na čekací
   *  obrazovce před startem zápasu. Chybí-li (starší volání), padne
   *  appka na výchozí louku, ne na chybu. */
  arenaId?: ArenaId
  /** Zavolá se přesně jednou, pokud se WebGL scénu nepodaří vytvořit
   *  (useSoubojScene.ts's `selhalo`) — Bojiste.tsx na to reaguje
   *  přepnutím na SoubojArena2D, ať zápas zůstává hratelný i na
   *  zařízení bez WebGL. */
  onSelhalo: () => void
}

// ==========================================
// Skutečná 3D aréna (viz useSoubojScene.ts pro celé zdůvodnění) —
// rozdělená obrazovka, vlastní kamera pro každého hráče, tráva/
// stromy/voda jako primitivní geometrie, soupeř jako plochý SVG
// "billboard" pozicovaný podle 3D projekce. Tahle komponenta sama
// nepočítá nic navíc — jen zapojí hook (containerRef pro canvas,
// aktualizujPozice při každé změně stav.hraci).
//
// Desáté kolo vylepšení (skutečný pohled z očí, viz useSoubojScene.ts's
// vlastní komentář) změnilo, co se vlastně vykresluje: dřív appka
// kreslila OBA bojovníky do OBOU kamer (bojovník × kamera, 4 sprity) —
// teď každá kamera vykresluje jen sprite SOUPEŘE, protože vlastní
// bojovník je přesně tam, kde "je" kamera sama, a v pohledu z očí ho
// není vidět. Zpětnou vazbu o vlastním stavu (zásah/blok/štít/
// perfektní blok), co dřív nesla animace na (teď neviditelné) vlastní
// postavě, nese místo toho VlastniStavPrekryv níž — poloprůhledný
// překryv přes celou svou půlku obrazovky, čtoucí přesně ta samá pole
// z BojovnikStav (vizualniStavBojovnika/jeParry/stitAktivni), jen na
// jiném vizuálním místě.
// ==========================================

/** Zpětná vazba o VLASTNÍM stavu bojovníka, kterého v pohledu z očí
 *  není vidět — poloprůhledný překryv přes celou jeho polovinu
 *  obrazovky místo animace na (neviditelné) vlastní postavě. Čte
 *  přesně stejná hotová pole jako sprite soupeře výš (žádná vlastní
 *  logika), jen jinak vykreslená. */
const VlastniStavPrekryv: React.FC<{ kamera: 0 | 1; vlastni: BojovnikStav; zasazenVlastni: boolean }> = ({
  kamera,
  vlastni,
  zasazenVlastni,
}) => {
  const vizStav = vizualniStavBojovnika(vlastni)
  return (
    <div
      className={`souboj-vlastni-prekryv souboj-vlastni-prekryv--${kamera === 0 ? '1' : '2'} ${
        zasazenVlastni ? 'souboj-vlastni-prekryv--zasah' : ''
      } ${vizStav === 'blok' ? 'souboj-vlastni-prekryv--blok' : ''} ${
        jeParry(vlastni) ? 'souboj-vlastni-prekryv--parry' : ''
      }`}
      aria-hidden="true"
    >
      {vlastni.stitAktivni && <span className="souboj-vlastni-stit">🛡️</span>}
    </div>
  )
}

export const SoubojArena3D: React.FC<Props> = ({ stav, zasazen, arenaId, onSelhalo }) => {
  const arena: Arena = ARENY[arenaId ?? VYCHOZI_ARENA]
  const { containerRef, selhalo, aktualizujPozice, registrujSprite } = useSoubojScene({
    arenaSirka: ARENA_SIRKA,
    arena,
  })

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
      <span className="souboj-arena-3d-stitek souboj-arena-3d-stitek--1">👁️ Hráč 1 — z očí</span>
      <span className="souboj-arena-3d-stitek souboj-arena-3d-stitek--2">👁️ Hráč 2 — z očí</span>

      {([0, 1] as const).map((kamera) => {
        // Kamera `kamera` je hráč `kamera` — vidí SOUPEŘE (druhý
        // bojovník), sebe sama v pohledu z očí vidět nemůže.
        const soupeřIdx = kamera === 0 ? 1 : 0
        const soupeř = stav.hraci[soupeřIdx]
        const vlastni = stav.hraci[kamera]
        const postava = POSTAVY[soupeř.postavaId]
        const vizStav = vizualniStavBojovnika(soupeř)
        return (
          <React.Fragment key={kamera}>
            <div ref={registrujSprite(kamera, soupeřIdx)} className="souboj-3d-sprite">
              <div
                className={`souboj-bojovnik souboj-bojovnik--${soupeřIdx + 1} souboj-bojovnik--${vizStav} souboj-bojovnik--postava-${postava.id} ${
                  jeParry(soupeř) ? 'souboj-bojovnik--parry' : ''
                } ${jeComeback(soupeř) ? 'souboj-bojovnik--comeback' : ''}`}
              >
                <PostavaGrafika postavaId={postava.id} size={54} />
                {zasazen[soupeřIdx] && <Jiskry />}
                {soupeř.stitAktivni && <span className="souboj-stit-znacka">🛡️</span>}
              </div>
            </div>
            <VlastniStavPrekryv kamera={kamera} vlastni={vlastni} zasazenVlastni={zasazen[kamera]} />
          </React.Fragment>
        )
      })}
    </div>
  )
}
