import React, { useEffect, useRef, useState } from 'react'
import { POSTAVY } from '../combat/postavy'
import { hpProcenta, komboAktivni, manaProcenta, zbyvaSekund } from '../combat/loop'
import { zahrajRemizu, zahrajSpecial, zahrajVyhra, zahrajZasah } from '../sound'
import { SoubojArena3D } from './SoubojArena3D'
import { SoubojArena2D } from './SoubojArena2D'
import type { SoubojStav, UtocnaAkce } from '../combat/types'
import type { ArenaId } from '../arena/areny'

interface Props {
  stav: SoubojStav
  jmena: [string, string]
  /** Vylepšení — kterou scénu TV vybrala (viz arena/areny.ts).
   *  Ovlivňuje jen SoubojArena3D, 2D záloha zůstává beze změny. */
  arenaId?: ArenaId
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
//
// Čtvrté kolo vylepšení přidalo časový countdown (zbyvaSekund,
// combat/loop.ts — čistě odvozené ze stav.cas a enginu vlastního
// CAS_LIMIT_MS, žádný nový stav navíc) a arenaId prop pro výběr
// scény (arena/areny.ts), vybranou na TV ještě před startem zápasu —
// Bojiste ji jen provlíká dál do SoubojArena3D, samo neví, co která
// scéna znamená.
//
// Páté kolo vylepšení přidalo screen shake a KO zoom (hit-stop, ta
// třetí část stejné "šťávy", žije v TvHost.tsx — viz jeho vlastní
// komentář, proč to musí být tam) — obojí čistě CSS třídy na obalu
// arény, odvozené ze stejného `zasah`/`stav.stavKola`, co appka už
// stejně počítala. Kombo odznak (komboAktivni, combat/loop.ts) je
// stejná "čti hotové číslo z props" disciplína jako HP/mana pruhy.
// ==========================================

export const Bojiste: React.FC<Props> = ({ stav, jmena, arenaId }) => {
  const predchoziHp = useRef<[number, number]>([stav.hraci[0].hp, stav.hraci[1].hp])
  const [zasazen, setZasazen] = useState<[boolean, boolean]>([false, false])
  // Vylepšení — screen shake. Jeden boolean pro celou arénu (na
  // rozdíl od zasazen, co je per-bojovník), nastavovaný ve STEJNÉM
  // efektu a se STEJNÝM časovačem jako zasazen — je to reakce na tu
  // samou "hp kleslo" událost, jen na jiném vizuálním místě.
  const [otres, setOtres] = useState(false)
  const [arena3dSelhala, setArena3dSelhala] = useState(false)
  // Vylepšení — zvuk (viz sound.ts). Poslední ZAHÁJENÁ akce každého
  // bojovníka, ať appka pozná přechod NA 'specialni' (whoosh), ne jen
  // že postava speciál pořád ještě drží z dřívějška — posledniAkce je
  // v enginu záměrně "lepivé" (viz engine.ts's komentář), nemění se
  // zpátky na null, jen na další zahájenou akci.
  const predchoziAkce = useRef<[UtocnaAkce | null, UtocnaAkce | null]>([
    stav.hraci[0].posledniAkce,
    stav.hraci[1].posledniAkce,
  ])
  // Ať appka nespustí fanfáru/tón na KAŽDÉM snímku, co soubojStav
  // zůstává zamrzlé na stejné hodnotě stavKola 'konec' (viz engine.ts's
  // krokSouboje) — jen na skutečném PŘECHODU, stejná disciplína jako
  // TvHost.tsx's vlastní stavPredTikem porovnání pro oznamKonecZapasu.
  const konecOznamen = useRef(false)

  useEffect(() => {
    const noveZasazen: [boolean, boolean] = [false, false]
    let zasah = false
    ;([0, 1] as const).forEach((i) => {
      if (stav.hraci[i].hp < predchoziHp.current[i]) {
        noveZasazen[i] = true
        zasah = true
      }
      predchoziHp.current[i] = stav.hraci[i].hp

      if (stav.hraci[i].posledniAkce === 'specialni' && predchoziAkce.current[i] !== 'specialni') {
        zahrajSpecial()
      }
      predchoziAkce.current[i] = stav.hraci[i].posledniAkce
    })
    if (zasah) zahrajZasah()
    if (!zasah) return
    setZasazen(noveZasazen)
    setOtres(true)
    const id = window.setTimeout(() => {
      setZasazen([false, false])
      setOtres(false)
    }, ZABLESK_MS)
    return () => window.clearTimeout(id)
  }, [stav.hraci])

  useEffect(() => {
    if (stav.stavKola !== 'konec') {
      konecOznamen.current = false
      return
    }
    if (konecOznamen.current) return
    konecOznamen.current = true
    // Bojiste je sdílená TV obrazovka, ne ničí "vlastní" — appka tu
    // proto nerozlišuje výhra/prohra podle slotu (to dělá až telefon,
    // viz Ovladac.tsx's konecZapasu handler a haptika.ts), jen jestli
    // kolo mělo vítěze, nebo skončilo remízou.
    if (stav.vitez === null) zahrajRemizu()
    else zahrajVyhra()
  }, [stav.stavKola, stav.vitez])

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
                {komboAktivni(b) >= 2 && <span className="souboj-kombo-znacka">🔥×{komboAktivni(b)}</span>}
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

      {stav.stavKola === 'probiha' && (
        <span
          className={`souboj-casovac ${zbyvaSekund(stav) <= 10 ? 'souboj-casovac--dochazi' : ''}`}
          aria-label="Zbývající čas kola"
        >
          ⏱️ {zbyvaSekund(stav)}s
        </span>
      )}

      <div
        className={`souboj-arena-obal ${otres ? 'souboj-arena-obal--otres' : ''} ${
          stav.stavKola === 'konec' && stav.vitez !== null ? 'souboj-arena-obal--zoom' : ''
        }`}
      >
        {arena3dSelhala ? (
          <SoubojArena2D stav={stav} zasazen={zasazen} />
        ) : (
          <SoubojArena3D stav={stav} zasazen={zasazen} arenaId={arenaId} onSelhalo={() => setArena3dSelhala(true)} />
        )}
      </div>

      {stav.stavKola === 'konec' && (
        <div className="souboj-konec-kola">
          <span className="souboj-konec-text">{stav.vitez === null ? 'Remíza!' : `${jmena[stav.vitez]} vyhrává!`}</span>
        </div>
      )}
    </div>
  )
}
