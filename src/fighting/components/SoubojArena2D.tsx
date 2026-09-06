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
}

// ==========================================
// Plochá 2D aréna — teď záložní varianta pro případ, že se skutečná
// 3D scéna (SoubojArena3D.tsx) nepodaří spustit (useSoubojScene.ts's
// `selhalo`, typicky chybějící WebGL). Appka radši ukáže tenhle
// starší vzhled než aby byl zápas úplně nehratelný — beze změny
// oproti verzi před přechodem na 3D, jen přesunuto z Bojiste.tsx do
// vlastního souboru, ať Bojiste.tsx zůstává jen tenký přepínač mezi
// oběma renderery plus společná hlavička (HP/mana pruhy).
// ==========================================

export const SoubojArena2D: React.FC<Props> = ({ stav, zasazen }) => {
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
        return (
          <div
            key={i}
            className={`souboj-bojovnik souboj-bojovnik--${i + 1} souboj-bojovnik--${vizualniStav} souboj-bojovnik--postava-${postava.id} ${
              jeParry(b) ? 'souboj-bojovnik--parry' : ''
            } ${jeComeback(b) ? 'souboj-bojovnik--comeback' : ''} ${jeChyt ? 'souboj-bojovnik--chyt' : ''}`}
            style={{ left: `${poziceProcenta(b, ARENA_SIRKA)}%` }}
          >
            <PostavaGrafika postavaId={postava.id} size={58} />
            {zasazen[i] && <Jiskry barva={barvaAkcentuPostavy(stav.hraci[i === 0 ? 1 : 0].postavaId)} />}
            {b.stitAktivni && <span className="souboj-stit-znacka">🛡️</span>}
          </div>
        )
      })}
    </div>
  )
}
