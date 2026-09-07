import React from 'react'
import { ARENA_SIRKA } from '../combat/engine'
import { POSTAVY } from '../combat/postavy'
import { jeComeback, jeParry, poziceProcenta, vizualniStavBojovnika } from '../combat/loop'
import { PostavaGrafika, barvaAkcentuPostavy } from './PostavaGrafika'
import { Jiskry } from './Jiskry'
import type { SoubojStav } from '../combat/types'

interface Props {
  stav: SoubojStav
  zasazen: [boolean, boolean]
  /** Jedenácté kolo vylepšení — motion trail. Appka schválně nepočítá
   *  žádnou skutečnou rychlost (px/s) — jen hrubý odhad z toho, o
   *  kolik se pozice posunula mezi dvěma po sobě jdoucími snímky
   *  (Bojiste.tsx), dost pro čistě dekorativní efekt, ne pro přesné
   *  měření. Nepovinné, starší volání bez tohohle prop appka bere jako
   *  "nikdo se nehýbe rychle". */
  svizny?: [boolean, boolean]
}

// ==========================================
// Plochá 2D aréna — záložní varianta pro případ, že se skutečná 3D
// scéna (SoubojArena3D.tsx) nepodaří spustit (useSoubojScene.ts's
// `selhalo`, typicky chybějící WebGL). Appka radši ukáže tuhle
// jednodušší vrstvu než aby byl zápas úplně nehratelný.
//
// Vylepšení — volný pohyb. Dřív šlo o postavičky stojící na jedné
// vodorovné ose (jen `left`); teď appka kreslí skutečný TOP-DOWN
// pohled shora — poziceProcenta (combat/loop.ts) vrací obě souřadnice
// (x/z) najednou, appka je nastaví jako `left`/`top` na stejném
// elementu (viz FightingModule.css's vlastní pravidlo, proč `top`
// nahrazuje dřívější pevné `bottom` jen tady, ne ve skutečné 3D aréně).
// ==========================================

export const SoubojArena2D: React.FC<Props> = ({ stav, zasazen, svizny }) => {
  return (
    <div className="souboj-arena">
      <div className="souboj-arena-podlaha" aria-hidden="true" />
      {([0, 1] as const).map((i) => {
        const b = stav.hraci[i]
        const postava = POSTAVY[b.postavaId]
        const vizualniStav = vizualniStavBojovnika(b)
        // Desáté kolo vylepšení — chyt (grab). `posledniAkce` je v
        // enginu záměrně "lepivé" (viz engine.ts's komentář), takže
        // společně s `vizualniStav === 'utok'` (útok ještě probíhá,
        // ne dávno dohraný) appka pozná právě PROBÍHAJÍCÍ chyt, ne
        // jakýkoli chyt kdykoli dřív v kole.
        const jeChyt = vizualniStav === 'utok' && b.posledniAkce === 'chyt'
        // Jedenácté kolo vylepšení — vítězná póza. Reaguje na `stav`
        // přímo (ne na Bojiste.tsx's zpožděný bannerViditelny) — obojí
        // se odehrává souběžně s dolly-in kamerou/knokautovými
        // finishery, co taky nečekají na zpožděný text.
        const jeVitez = stav.stavKola === 'konec' && stav.vitez === i
        const { xProcenta, zProcenta } = poziceProcenta(b, ARENA_SIRKA)
        return (
          <div
            key={i}
            className={`souboj-bojovnik souboj-bojovnik--${i + 1} souboj-bojovnik--${vizualniStav} souboj-bojovnik--postava-${postava.id} ${
              jeParry(b) ? 'souboj-bojovnik--parry' : ''
            } ${jeComeback(b) ? 'souboj-bojovnik--comeback' : ''} ${jeChyt ? 'souboj-bojovnik--chyt' : ''} ${
              jeVitez ? 'souboj-bojovnik--vitez' : ''
            } ${svizny?.[i] ? 'souboj-bojovnik--svizny' : ''}`}
            style={{ left: `${xProcenta}%`, top: `${zProcenta}%` }}
          >
            <PostavaGrafika postavaId={postava.id} size={58} vizualniStav={vizualniStav} jeChyt={jeChyt} jeVitez={jeVitez} />
            {zasazen[i] && <Jiskry barva={barvaAkcentuPostavy(stav.hraci[i === 0 ? 1 : 0].postavaId)} />}
            {b.stitAktivni && <span className="souboj-stit-znacka">🛡️</span>}
          </div>
        )
      })}
    </div>
  )
}
