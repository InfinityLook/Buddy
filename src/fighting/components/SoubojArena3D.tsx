import React, { useEffect, useRef, useState } from 'react'
import { ARENA_SIRKA } from '../combat/engine'
import { POSTAVY } from '../combat/postavy'
import { jeComeback, jeParry, vizualniStavBojovnika } from '../combat/loop'
import { useSoubojScene } from '../arena/useSoubojScene'
import { ARENY, VYCHOZI_ARENA, type Arena, type ArenaId } from '../arena/areny'
import { PostavaGrafika, barvaAkcentuPostavy } from './PostavaGrafika'
import { Jiskry } from './Jiskry'
import type { BojovnikStav, SoubojStav, UtocnaAkce } from '../combat/types'

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

const ZABER_TRVANI_MS = 260

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
//
// Desátého kola další vylepšení přidalo dvě věci do VlastniStavPrekryv:
// krátký "švih" na VLASTNÍ útok (zaberVlastni níž — jediná hranová
// detekce, co tahle jinak čistě prezentační komponenta počítá, stejný
// "porovnej PŘEDCHOZÍ a AKTUÁLNÍ posledniAkce" trik jako Bojiste.tsx's
// vlastní zvuková detekce) a trvalý zlatý odlesk, dokud je vlastní
// vztek nabitý (vlastni.vztekPripraven, combat/engine.ts) — obojí je
// zpětná vazba o VLASTNÍM bojovníkovi, patří tedy sem, ne na sprite
// soupeře. Barva jisker (Jiskry.tsx) a "chyt" třída na soupeřově
// spritu čtou totéž — element ÚTOČNÍKA (tedy vlastního bojovníka
// tady, protože sprite patří soupeři), stejná logika, jen na jiném
// místě než ve 2D záložní aréně.
// ==========================================

/** Zpětná vazba o VLASTNÍM stavu bojovníka, kterého v pohledu z očí
 *  není vidět — poloprůhledný překryv přes celou jeho polovinu
 *  obrazovky místo animace na (neviditelné) vlastní postavě. Čte
 *  přesně stejná hotová pole jako sprite soupeře výš (žádná vlastní
 *  logika), jen jinak vykreslená. */
const VlastniStavPrekryv: React.FC<{
  kamera: 0 | 1
  vlastni: BojovnikStav
  zasazenVlastni: boolean
  zaberVlastni: boolean
}> = ({ kamera, vlastni, zasazenVlastni, zaberVlastni }) => {
  const vizStav = vizualniStavBojovnika(vlastni)
  return (
    <div
      className={`souboj-vlastni-prekryv souboj-vlastni-prekryv--${kamera === 0 ? '1' : '2'} ${
        zasazenVlastni ? 'souboj-vlastni-prekryv--zasah' : ''
      } ${vizStav === 'blok' ? 'souboj-vlastni-prekryv--blok' : ''} ${
        jeParry(vlastni) ? 'souboj-vlastni-prekryv--parry' : ''
      } ${zaberVlastni ? 'souboj-vlastni-prekryv--zaber' : ''} ${
        vlastni.vztekPripraven ? 'souboj-vlastni-prekryv--vztek' : ''
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

  // Desáté kolo vylepšení — krátký "švih" na vlastní útok (viz
  // komponenta výš). Stejná "zachyť PŘECHOD posledniAkce, ne držený
  // stav" disciplína jako Bojiste.tsx's vlastní zvuková detekce, jen
  // tady navíc podmíněná `utokKonci > 0` — appka nechce animaci
  // přehrát znovu na KAŽDÉM dalším snímku, co posledniAkce zůstává
  // "lepivě" stejné dávno po tom, co útok doopravdy doběhl.
  const predchoziAkceRef = useRef<[UtocnaAkce | null, UtocnaAkce | null]>([
    stav.hraci[0].posledniAkce,
    stav.hraci[1].posledniAkce,
  ])
  const [zaber, setZaber] = useState<[boolean, boolean]>([false, false])

  useEffect(() => {
    ;([0, 1] as const).forEach((i) => {
      const b = stav.hraci[i]
      if (b.posledniAkce !== null && b.posledniAkce !== predchoziAkceRef.current[i] && b.utokKonci > 0) {
        setZaber((s) => {
          const dalsi = [...s] as [boolean, boolean]
          dalsi[i] = true
          return dalsi
        })
        window.setTimeout(() => {
          setZaber((s) => {
            const dalsi = [...s] as [boolean, boolean]
            dalsi[i] = false
            return dalsi
          })
        }, ZABER_TRVANI_MS)
      }
      predchoziAkceRef.current[i] = b.posledniAkce
    })
  }, [stav.hraci])

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
        // Desáté kolo vylepšení — chyt, stejná detekce jako
        // SoubojArena2D.tsx's vlastní komentář.
        const jeChyt = vizStav === 'utok' && soupeř.posledniAkce === 'chyt'
        return (
          <React.Fragment key={kamera}>
            <div ref={registrujSprite(kamera, soupeřIdx)} className="souboj-3d-sprite">
              <div
                className={`souboj-bojovnik souboj-bojovnik--${soupeřIdx + 1} souboj-bojovnik--${vizStav} souboj-bojovnik--postava-${postava.id} ${
                  jeParry(soupeř) ? 'souboj-bojovnik--parry' : ''
                } ${jeComeback(soupeř) ? 'souboj-bojovnik--comeback' : ''} ${jeChyt ? 'souboj-bojovnik--chyt' : ''}`}
              >
                <PostavaGrafika postavaId={postava.id} size={54} />
                {zasazen[soupeřIdx] && <Jiskry barva={barvaAkcentuPostavy(vlastni.postavaId)} />}
                {soupeř.stitAktivni && <span className="souboj-stit-znacka">🛡️</span>}
              </div>
            </div>
            <VlastniStavPrekryv
              kamera={kamera}
              vlastni={vlastni}
              zasazenVlastni={zasazen[kamera]}
              zaberVlastni={zaber[kamera]}
            />
          </React.Fragment>
        )
      })}
    </div>
  )
}
