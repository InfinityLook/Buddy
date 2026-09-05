import React, { useEffect, useRef, useState } from 'react'
import { POSTAVY } from '../combat/postavy'
import { ARENA_SIRKA, PICKUP_DOSTUPNY_OD_MS } from '../combat/engine'
import { hpProcenta, jeComeback, jeParry, komboAktivni, manaProcenta, zbyvaSekund } from '../combat/loop'
import { zahrajParry, zahrajRemizu, zahrajSpecial, zahrajVyhra, zahrajZasah } from '../sound'
import {
  oznamKnokaut,
  oznamPerfektniBlok,
  oznamRemizu,
  oznamVitezstvi,
  oznamZacatekKola,
} from '../komentator'
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
  /** Osmé kolo vylepšení — rychlý emote za hráče 0/1 (types.ts's
   *  RYCHLE_EMOTE), null = nic k zobrazení. Vlastník obrazovky
   *  (TvHost.tsx přes network.ts, LocalniZapas.tsx čistě lokálně) si
   *  sám hlídá časovač, po kterém emote zase zmizí — Bojiste jen
   *  vykresluje, co dostane, stejná disciplína jako zbytek komponenty. */
  emotes?: [string | null, string | null]
}

const ZABLESK_MS = 350

/** Deváté kolo vylepšení — "zpomalený" knokaut. O kolik appka schválně
 *  zpozdí odhalení vítězného pruhu/textu na SKUTEČNÝ knokaut (hp <= 0),
 *  ne na rozhodnutí časovým limitem/náhlou smrtí — sladěno s
 *  combat/loop.ts's KO_HIT_STOP_MS, ať vizuální pauza (tenhle časovač)
 *  a skutečné zamrznutí simulace (hit-stop v TvHost.tsx/LocalniZapas.tsx)
 *  působí jako JEDNA delší dramatická chvíle, ne dvě nesouvisející. */
const KO_BANNER_ZPOZDENI_MS = 550

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
//
// Deváté kolo vylepšení přidalo hlasového komentátora (komentator.ts,
// stejné přechodové hlídání jako zvuk — appka spouští hlášku PŘESNĚ
// na hraně, ne na každém snímku zamrzlého stavu), "zpomalený" knokaut
// (KO_BANNER_ZPOZDENI_MS výš — appka poctivě NEPŘEHRÁVÁ žádný skutečný
// replay, jen zpozdí odhalení vítězného textu, ať sladěná pauza s
// combat/loop.ts's KO_HIT_STOP_MS působí dramaticky) a bonusový
// předmět v aréně (stav.pickupPozice/pickupTyp/pickupSebran,
// combat/engine.ts) — čistě odvozený odznak nad arénou, žádná vlastní
// logika, appka jen čte hotová pole z props stejně jako všechno
// ostatní v týhle komponentě.
// ==========================================

export const Bojiste: React.FC<Props> = ({ stav, jmena, arenaId, emotes }) => {
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
  // Vylepšení — parry. Stejný "zachyť PŘECHOD, ne držený stav" trik
  // jako predchoziAkce výš — parryZablesk zůstává > 0 po celé okno
  // (PARRY_ZABLESK_MS), appka chce zvuk spustit jen jednou, na tiku,
  // kdy se poprvé rozsvítí.
  const predchoziParry = useRef<[boolean, boolean]>([jeParry(stav.hraci[0]), jeParry(stav.hraci[1])])
  // Ať appka nespustí fanfáru/tón na KAŽDÉM snímku, co soubojStav
  // zůstává zamrzlé na stejné hodnotě stavKola 'konec' (viz engine.ts's
  // krokSouboje) — jen na skutečném PŘECHODU, stejná disciplína jako
  // TvHost.tsx's vlastní stavPredTikem porovnání pro oznamKonecZapasu.
  const konecOznamen = useRef(false)
  // Deváté kolo vylepšení — komentátor na začátku kola ("Boj!") a
  // "zpomalený" knokaut. `zacatekOznamenRef` sleduje stejný přechod
  // jako konecOznamen výš, jen obráceně (konec → probiha, ne probiha
  // → konec) — appka ho resetuje pokaždé, když kolo skončí, ať se
  // "Boj!" spustí znovu, jakmile začne další.
  const zacatekOznamenRef = useRef(false)
  // Kdy se smí ukázat vítězný pruh/text (souboj-konec-kola) — appka ho
  // schválně NEUKAZUJE hned na přechodu do 'konec', ale až po
  // KO_BANNER_ZPOZDENI_MS, sladěno s TvHost.tsx/LocalniZapas.tsx's
  // delším hit-stopem na skutečný knokaut (viz KO_HIT_STOP_MS).
  const [bannerViditelny, setBannerViditelny] = useState(false)
  const [koZpomaleni, setKoZpomaleni] = useState(false)

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

      const jeParryTeto = jeParry(stav.hraci[i])
      if (jeParryTeto && !predchoziParry.current[i]) {
        zahrajParry()
        oznamPerfektniBlok()
      }
      predchoziParry.current[i] = jeParryTeto
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
      setBannerViditelny(false)
      setKoZpomaleni(false)
      return
    }
    if (konecOznamen.current) return
    konecOznamen.current = true
    // Bojiste je sdílená TV obrazovka, ne ničí "vlastní" — appka tu
    // proto nerozlišuje výhra/prohra podle slotu (to dělá až telefon,
    // viz Ovladac.tsx's konecZapasu handler a haptika.ts), jen jestli
    // kolo mělo vítěze, nebo skončilo remízou.
    if (stav.vitez === null) {
      zahrajRemizu()
      oznamRemizu()
      setBannerViditelny(true)
      return
    }
    zahrajVyhra()
    // Deváté kolo vylepšení — skutečný knokaut (poražený má hp <= 0)
    // dostane jinou hlášku ("Knokaut!") a delší, "zpomalenou" pauzu
    // před odhalením vítězného textu, než rozhodnutí časovým limitem/
    // náhlou smrtí (tam nikdo formálně "nevypadl", jen měl víc HP).
    const porazeny = stav.vitez === 0 ? 1 : 0
    const jeSkutecnyKo = stav.hraci[porazeny].hp <= 0
    if (jeSkutecnyKo) {
      oznamKnokaut()
      setKoZpomaleni(true)
      const id = window.setTimeout(() => {
        setKoZpomaleni(false)
        setBannerViditelny(true)
      }, KO_BANNER_ZPOZDENI_MS)
      return () => window.clearTimeout(id)
    }
    oznamVitezstvi(jmena[stav.vitez])
    setBannerViditelny(true)
  }, [stav.stavKola, stav.vitez])

  // Deváté kolo vylepšení — "Boj!" na začátku každého kola (viz
  // zacatekOznamenRef výš), včetně toho úplně prvního po mountu.
  useEffect(() => {
    if (stav.stavKola === 'konec') {
      zacatekOznamenRef.current = false
      return
    }
    if (zacatekOznamenRef.current) return
    zacatekOznamenRef.current = true
    oznamZacatekKola()
  }, [stav.stavKola])

  // Deváté kolo vylepšení — bonusový předmět v aréně, čistě odvozeno z
  // props (žádný vlastní stav) — appka ho ukazuje, jen jakmile je
  // sebratelný (PICKUP_DOSTUPNY_OD_MS uplynulo) a ještě ho nikdo
  // nesebral. Procento na ose arény, stejná přepočtová logika jako
  // combat/loop.ts's poziceProcenta pro bojovníky.
  const pickupViditelny = !stav.pickupSebran && stav.cas >= PICKUP_DOSTUPNY_OD_MS && stav.stavKola === 'probiha'
  const pickupProcenta = (stav.pickupPozice / ARENA_SIRKA) * 100
  const pickupIkona = stav.pickupTyp === 'mana' ? '🔷' : '🌟'
  const pickupPopisek = stav.pickupTyp === 'mana' ? 'Plná mana' : 'Štít'

  return (
    <div className="souboj-bojiste">
      <div className="souboj-bojiste-hlavicky">
        {([0, 1] as const).map((i) => {
          const b = stav.hraci[i]
          const postava = POSTAVY[b.postavaId]
          return (
            <div
              key={i}
              className={`souboj-bojovnik-hlavicka souboj-bojovnik-hlavicka--${i + 1} ${
                jeComeback(b) ? 'souboj-bojovnik-hlavicka--comeback' : ''
              }`}
            >
              <span className="souboj-bojovnik-jmeno">
                {postava.ikona} {jmena[i]}
                {komboAktivni(b) >= 2 && <span className="souboj-kombo-znacka">🔥×{komboAktivni(b)}</span>}
                {jeParry(b) && <span className="souboj-parry-znacka">✋ PARRY!</span>}
              </span>
              {/* Osmé kolo vylepšení — rychlý emote (viz Props výš). */}
              {emotes?.[i] && (
                <span className="souboj-emote-bublina" aria-hidden="true">
                  {emotes[i]}
                </span>
              )}
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

      {/* Osmé kolo vylepšení — trénink nemá časový limit vůbec (žádný
          countdown dává smysl ukazovat) a náhlá smrt nahrazuje countdown
          vlastním odznakem, dokud běží — obojí čte stav.moznosti/
          stav.suddenDeath, žádnou vlastní logiku Bojiste nepočítá. */}
      {stav.stavKola === 'probiha' &&
        (stav.moznosti.treninkovyRezim ? (
          <span className="souboj-casovac souboj-casovac--trenink" aria-label="Trénink bez časového limitu">
            🎯 TRÉNINK
          </span>
        ) : stav.suddenDeath ? (
          <span className="souboj-casovac souboj-casovac--sudden" aria-label="Náhlá smrt">
            ⚔️ NÁHLÁ SMRT
          </span>
        ) : (
          <span
            className={`souboj-casovac ${zbyvaSekund(stav) <= 10 ? 'souboj-casovac--dochazi' : ''}`}
            aria-label="Zbývající čas kola"
          >
            ⏱️ {zbyvaSekund(stav)}s
          </span>
        ))}

      <div
        className={`souboj-arena-obal ${otres ? 'souboj-arena-obal--otres' : ''} ${
          bannerViditelny && stav.vitez !== null ? 'souboj-arena-obal--zoom' : ''
        } ${koZpomaleni ? 'souboj-arena-obal--ko-zpomaleni' : ''}`}
      >
        {arena3dSelhala ? (
          <SoubojArena2D stav={stav} zasazen={zasazen} />
        ) : (
          <SoubojArena3D stav={stav} zasazen={zasazen} arenaId={arenaId} onSelhalo={() => setArena3dSelhala(true)} />
        )}

        {/* Deváté kolo vylepšení — bonusový předmět, vykreslen NAD
            arénou (jednoduchý absolutně umístěný odznak, ne skutečný
            3D/2D objekt uvnitř SoubojArena3D/2D — nemá vliv na
            vykreslení bojovníků, jen na to, kde se dá sebrat). */}
        {pickupViditelny && (
          <span
            className={`souboj-pickup-znacka souboj-pickup-znacka--${stav.pickupTyp}`}
            style={{ left: `${pickupProcenta}%` }}
            aria-label={`Bonusový předmět: ${pickupPopisek}`}
          >
            {pickupIkona}
          </span>
        )}
      </div>

      {stav.stavKola === 'konec' && bannerViditelny && (
        <div className="souboj-konec-kola">
          <span className="souboj-konec-text">{stav.vitez === null ? 'Remíza!' : `${jmena[stav.vitez]} vyhrává!`}</span>
        </div>
      )}
    </div>
  )
}
