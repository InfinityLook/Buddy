import React, { useEffect, useRef, useState } from 'react'
import { ARENA_SIRKA } from '../combat/engine'
import { POSTAVY } from '../combat/postavy'
import { hpProcenta, manaProcenta, poziceProcenta, vizualniStavBojovnika } from '../combat/loop'
import { PostavaGrafika } from './PostavaGrafika'
import type { SoubojStav } from '../combat/types'

interface Props {
  stav: SoubojStav
  jmena: [string, string]
}

const ZABLESK_MS = 350

/** Šest pevných úhlů pro jiskry z jednoho zásahu — viz komentář u
 *  vykreslení níž. */
const UHLY_JISKER = [0, 60, 120, 180, 240, 300]

// ==========================================
// Fáze 3 — čistě prezentační komponenta: dostane hotový SoubojStav a
// jména obou hráčů jako props, nic sama nepočítá (veškerá matematika
// je v combat/loop.ts) a nesahá na requestAnimationFrame ani na síť —
// to dělá výhradně TvHost.tsx. Stejná hranice "engine neví, odkud
// vstup přišel" (viz engine.ts) platí i tady na vykreslovací straně:
// Bojiste neví, odkud SoubojStav přišel, ani jak se aktualizuje.
//
// Fáze 6 přidala jediný vlastní stav, jaký kdy tahle komponenta mívá
// — "právě zasažen" pro krátký záblesk HP pruhu (souboj-hp-zablesk),
// odvozený porovnáním hp mezi dvěma po sobě jdoucími snímky. Pořád to
// není herní logika, jen vizuální reakce na to, co číslo v props
// právě udělalo — kdyby TvHost tenhle stav místo toho posílal jako
// prop, komponenta by musela mít dvojí zdroj pravdy (svoje "zasažen"
// i cizí "hp"), zatímco takhle stačí jedno malé useEffect uvnitř.
// ==========================================

export const Bojiste: React.FC<Props> = ({ stav, jmena }) => {
  const predchoziHp = useRef<[number, number]>([stav.hraci[0].hp, stav.hraci[1].hp])
  const [zasazen, setZasazen] = useState<[boolean, boolean]>([false, false])

  useEffect(() => {
    const nove: [boolean, boolean] = [false, false]
    let zmena = false
    ;([0, 1] as const).forEach((i) => {
      if (stav.hraci[i].hp < predchoziHp.current[i]) {
        nove[i] = true
        zmena = true
      }
      predchoziHp.current[i] = stav.hraci[i].hp
    })
    if (!zmena) return
    setZasazen(nove)
    const id = window.setTimeout(() => setZasazen([false, false]), ZABLESK_MS)
    return () => window.clearTimeout(id)
  }, [stav.hraci])

  return (
    <div className="souboj-bojiste">
      <div className="souboj-bojiste-hlavicky">
        {([0, 1] as const).map((i) => {
          const b = stav.hraci[i]
          const postava = POSTAVY[b.postavaId]
          return (
            <div key={i} className={`souboj-bojovnik-hlavicka souboj-bojovnik-hlavicka--${i + 1}`}>
              <span className="souboj-bojovnik-jmeno">
                {postava.ikona} {jmena[i]}
              </span>
              <div className={`souboj-hp-bar ${zasazen[i] ? 'souboj-hp-bar--zasazen' : ''}`}>
                {/* "Duch" pruh vzadu — stejná šířka jako výplň vpředu, jen
                    pomalejší CSS přechod (viz FightingModule.css) — čistě
                    deklarativní verze klasického "afterimage" HP pruhu z
                    bojových her, bez jediného řádku JS navíc: obě děti
                    dostávají stejné číslo z props, jen s jinou rychlostí
                    přechodu, takže duch viditelně dohání teprve po zásahu. */}
                <div className="souboj-hp-bar-duch" style={{ width: `${hpProcenta(b)}%` }} />
                <div className="souboj-hp-bar-vypln" style={{ width: `${hpProcenta(b)}%` }} />
              </div>
              <div className={`souboj-mana-bar ${b.mana >= b.maxMana ? 'souboj-mana-bar--plna' : ''}`}>
                <div className="souboj-mana-bar-vypln" style={{ width: `${manaProcenta(b)}%` }} />
              </div>
            </div>
          )
        })}
      </div>

      <div className="souboj-arena">
        <div className="souboj-arena-podlaha" aria-hidden="true" />
        {([0, 1] as const).map((i) => {
          const b = stav.hraci[i]
          const postava = POSTAVY[b.postavaId]
          const vizualniStav = vizualniStavBojovnika(b)
          return (
            <div
              key={i}
              className={`souboj-bojovnik souboj-bojovnik--${i + 1} souboj-bojovnik--${vizualniStav}`}
              style={{ left: `${poziceProcenta(b, ARENA_SIRKA)}%` }}
            >
              <PostavaGrafika postavaId={postava.id} size={58} />
              {/* Jiskry při zásahu — stejný "zasazen" stav jako záblesk HP
                  pruhu výš, znovupoužitý tady pro krátký, jednorázový
                  výbuch šesti čárek do stran (viz FightingModule.css). Šest
                  pevných úhlů, ne trigonometrie v CSS — širší podpora
                  prohlížečů a žádný výpočet navíc. */}
              {zasazen[i] && (
                <div className="souboj-impact" aria-hidden="true">
                  {UHLY_JISKER.map((uhel) => (
                    <span key={uhel} className="souboj-impact-jiskra" style={{ '--uhel': `${uhel}deg` } as React.CSSProperties} />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {stav.stavKola === 'konec' && (
        <div className="souboj-konec-kola">
          <span className="souboj-konec-text">{stav.vitez === null ? 'Remíza!' : `${jmena[stav.vitez]} vyhrává!`}</span>
        </div>
      )}
    </div>
  )
}
