import React, { useEffect, useRef, useState } from 'react'
import { POSTAVY } from '../combat/postavy'
import { hpProcenta, manaProcenta } from '../combat/loop'
import { SoubojArena3D } from './SoubojArena3D'
import { SoubojArena2D } from './SoubojArena2D'
import type { SoubojStav } from '../combat/types'

interface Props {
  stav: SoubojStav
  jmena: [string, string]
}

const ZABLESK_MS = 350

// ==========================================
// Fáze 3 — čistě prezentační komponenta: dostane hotový SoubojStav a
// jména obou hráčů jako props, nic sama nepočítá (veškerá matematika
// je v combat/loop.ts) a nesahá na síť — to dělá výhradně TvHost.tsx.
// Stejná hranice "engine neví, odkud vstup přišel" (viz engine.ts)
// platí i tady na vykreslovací straně: Bojiste neví, odkud SoubojStav
// přišel, ani jak se aktualizuje.
//
// Fáze 6 přidala jediný vlastní stav, jaký kdy tahle komponenta mívá
// — "právě zasažen" pro krátký záblesk HP pruhu (souboj-hp-zablesk) a
// jiskry v aréně, odvozené porovnáním hp mezi dvěma po sobě jdoucími
// snímky. Pořád to není herní logika, jen vizuální reakce na to, co
// číslo v props právě udělalo.
//
// Třetí kolo vylepšení (skutečná 3D aréna, viz CLAUDE.md) přidalo
// druhý vlastní stav — jestli se 3D scéna (SoubojArena3D.tsx) vůbec
// podařilo spustit. Bojiste samo pořád nesahá na requestAnimationFrame
// ani na Three.js přímo — tu práci teď dělá SoubojArena3D/
// useSoubojScene.ts, Bojiste jen rozhoduje MEZI 3D a 2D záložní
// variantou (SoubojArena2D.tsx, beze změny oproti stavu před touhle
// fází) a drží společnou hlavičku (HP/mana pruhy), kterou obě arény
// sdílí beze změny.
// ==========================================

export const Bojiste: React.FC<Props> = ({ stav, jmena }) => {
  const predchoziHp = useRef<[number, number]>([stav.hraci[0].hp, stav.hraci[1].hp])
  const [zasazen, setZasazen] = useState<[boolean, boolean]>([false, false])
  const [arena3dSelhala, setArena3dSelhala] = useState(false)

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

      {arena3dSelhala ? (
        <SoubojArena2D stav={stav} zasazen={zasazen} />
      ) : (
        <SoubojArena3D stav={stav} zasazen={zasazen} onSelhalo={() => setArena3dSelhala(true)} />
      )}

      {stav.stavKola === 'konec' && (
        <div className="souboj-konec-kola">
          <span className="souboj-konec-text">{stav.vitez === null ? 'Remíza!' : `${jmena[stav.vitez]} vyhrává!`}</span>
        </div>
      )}
    </div>
  )
}
