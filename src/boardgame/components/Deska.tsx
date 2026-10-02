import React, { useEffect, useRef, useState } from 'react'
import {
  melByBotKoupit,
  melByBotPrijmoutObchod,
  melByBotSabotovat,
  melByBotZvysitNabidkuDrazby,
  pripravKartuBotuPexesa,
  pripravPresnostBotuRychleAukce,
  pripravSmerBota,
  zvazBotuNabidkuObchodu,
} from '../ai'
import {
  aktivniHrac,
  koupitPole,
  krokHodu,
  krokPohybu,
  navrhniObchod,
  navrhniProtinabidku,
  odmitnoutKoupi,
  odmitnoutObchod,
  odstupOdDrazby,
  otocitKartuPexesa,
  potvrdNeshoduPexesa,
  prijmoutObchod,
  provedSabotaz,
  ukonciTah,
  vitezovePodleStavu,
  vyhodnotRychlouAukci,
  vytvorTrhStav,
  zbyvaCasuMs,
  zkontrolujCas,
  zrusitObchod,
  zvysNabidkuDrazby,
} from '../engine'
import { conicGradientKola, stredovyUhelVysledku } from '../data/kolaStesti'
import { SABOTAZNI_AKCE, type SabotazniAkce } from '../data/sabotaze'
import { MINIHRY_PODLE_TYPU, POLOZKY_DRAZBY_PODLE_ID, PRIHOZ_DRAZBY } from '../data/minihry'
import { OBCHODY_PODLE_KLICE } from '../obchody'
import { POSTAVY } from '../postavy'
import { useTrhScene } from '../scene/useTrhScene'
import type { Hrac, LimitMinut, Smer } from '../types'

// ==========================================
// Buddyho Trh — herní obrazovka: 3D deska + kostka + pohyb + Fáze 1
// ekonomika (nabídka koupě, nájmy, časový limit), Fáze 2 Osud, Fáze 3
// kolo štěstí, Fáze 4 sabotáž a Fáze 5 obchodování mezi hráči. Boti
// hrají a rozhodují automaticky přes efekt sledující `stav` — stejný
// "efekt reaguje na změnu stavu, nastaví jeden timeout, sám se uklidí"
// vzor jako typing indikátor/notifikace jinde v appce, ne samostatná
// herní smyčka.
// ==========================================

const ZPOZDENI_HODU_MS = 650
const ZPOZDENI_KROKU_MS = 420
const ZPOZDENI_KONCE_TAHU_MS = 500
const ZPOZDENI_ROZHODNUTI_MS = 700
// Sabotáž (Fáze 4) — záměrně KRATŠÍ než ZPOZDENI_KONCE_TAHU_MS výš.
// Na rozdíl od nabídky koupě (appka při čekající nabídce vůbec
// nenaplánuje auto-konec tahu, viz ten useEffect níž) sabotáž žádnou
// takovou pojistku nemá — konec-tahu bez nabídky koupě VŽDYCKY
// odpočítává k automatickému ukonciTah, i když bot zrovna zvažuje
// sabotáž. Kratší zpoždění je to, co botovi sabotáž vůbec dává šanci
// proběhnout dřív, než appka tah sama ukončí.
const ZPOZDENI_SABOTAZE_MS = 300
// Obchodování (Fáze 5) — dva samostatné timeouty, stejná "bot
// nepotřebuje stihnout nic jiného dřív" filozofie jako výš u sabotáže.
// Návrh bota aktivnímu hráči (appka ho dá KAŽDÉMU botovi jen jednou na
// vstup do konec-tahu, viz jeho vlastní useEffect níž) smí trvat o
// trochu dýl, ať ho hráč stihne zaregistrovat dřív, než mu samotná
// odpověď (druhý timeout) hned zmizí. Odpověď bota na cizí nabídku je
// kratší, ze stejného důvodu jako ZPOZDENI_SABOTAZE_MS — appka
// automatický konec tahu zastaví jen, dokud nabídka běží, takže bot
// musí stihnout zareagovat dřív, než appka tah sama ukončí.
const ZPOZDENI_NABIDKY_BOTU_MS = 500
const ZPOZDENI_ODPOVEDI_BOTU_MS = 300

// Minihry (Fáze 6) — stejná "bot nepotřebuje stihnout nic jiného dřív"
// filozofie jako sabotáž/obchod výš, jen o chlup delší zpoždění, ať
// appka stihne krátce ukázat, co se zrovna stalo (otočenou kartu,
// přihození v dražbě), než bot pokračuje dál.
const ZPOZDENI_MINIHRY_MS = 550

// Rychlá aukce s časovačem — appka SCHVÁLNĚ opouští injektovatelné
// `nahodne` tady v komponentě: ukazatel se pohybuje podle skutečně
// uplynulého reálného času (performance.now()), ne podle enginu,
// protože celá minihra je "reaguj na pohybující se cíl" — appka nemá
// jak reálnou reakční dobu hráče jinak simulovat. Samotné VYHODNOCENÍ
// (engine.ts's vyhodnotRychlouAukci) zůstává plně deterministické,
// bere jen hotové číslo `presnost` jako vstup (viz data/minihry.ts's
// vlastní komentář u ODMENY_RYCHLE_AUKCE).
const RYCHLOST_AUKCE_MS = 1400

const RychlaAukceHra: React.FC<{ onChytit: (presnost: number) => void }> = ({ onChytit }) => {
  const [pozice, setPozice] = useState(50)
  const poziceRef = useRef(50)
  useEffect(() => {
    const start = performance.now()
    let id: number
    const krok = (cas: number) => {
      const t = cas - start
      const nova = 50 + 50 * Math.sin((t / RYCHLOST_AUKCE_MS) * Math.PI * 2)
      poziceRef.current = nova
      setPozice(nova)
      id = requestAnimationFrame(krok)
    }
    id = requestAnimationFrame(krok)
    return () => cancelAnimationFrame(id)
  }, [])

  const chytit = () => {
    const presnost = Math.max(0, 100 - Math.abs(poziceRef.current - 50) * 2)
    onChytit(presnost)
  }

  return (
    <div className="trh-aukce-hra">
      <div className="trh-aukce-draha">
        <div className="trh-aukce-cil" aria-hidden="true" />
        <div className="trh-aukce-znacka" style={{ left: `${pozice}%` }} aria-hidden="true" />
      </div>
      <button className="trh-kostka-btn" onClick={chytit}>
        ⚡ Chyť moment!
      </button>
    </div>
  )
}

// Kolo štěstí (Fáze 3) — čistě kosmetická animace dotočení, viz jeho
// vlastní komentář u stavu níž. Appka respektuje prefers-reduced-motion
// zkontrolovaným jednou při startu modulu (stejný "PODPORUJE_X"
// jednorázový feature-detect jako jinde v appce) — bez toho by overlay
// visel celou dlouhou animaci, zatímco samotné kolo by se díky
// sitewide kill-switchi v global.css vizuálně otočilo skoro okamžitě.
const PREFERUJE_REDUKOVANY_POHYB =
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const POCET_OTOCEK_KOLA = 4
const DELKA_ANIMACE_KOLA_MS = PREFERUJE_REDUKOVANY_POHYB ? 300 : 2600

interface Props {
  pocatecniHraci: Hrac[]
  limitMinut: LimitMinut
  onZpet: () => void
}

const NAZEV_SMERU: Record<Smer, string> = {
  nahoru: '↑',
  dolu: '↓',
  vlevo: '←',
  vpravo: '→',
}

const formatCas = (ms: number): string => {
  const celkemSekund = Math.ceil(ms / 1000)
  const min = Math.floor(celkemSekund / 60)
  const sek = celkemSekund % 60
  return `${min}:${sek.toString().padStart(2, '0')}`
}

export const Deska: React.FC<Props> = ({ pocatecniHraci, limitMinut, onZpet }) => {
  const [stav, setStav] = useState(() => vytvorTrhStav(pocatecniHraci, limitMinut))
  const [, setTik] = useState(0)
  const { containerRef, selhalo } = useTrhScene({ stav })

  // Kolo štěstí (Fáze 3) — engine rozhodne výsledek OKAMŽITĚ uvnitř
  // krokPohybu (peníze/bonusový hod se do `stav` promítnou hned), tenhle
  // stav jen zpožďuje jeho ODHALENÍ hráči animací roztočeného kola.
  // `uhelKola` roste monotónně (appka ho nikdy nevrací zpátky na 0) —
  // CSS transition tak kolo při každém dalším vytažení prostě točí dál,
  // žádné "poskočení" zpátky na začátek.
  const [uhelKola, setUhelKola] = useState(0)
  const [kolostestiAktivni, setKolostestiAktivni] = useState(false)
  const poslKolostestiPocetRef = useRef(stav.kolostestiPocet)

  // Hlídá rostoucí `stav.kolostestiPocet`, ne jen `posledniVysledekKolaId`
  // samotné — dva různé tahy mohou vytáhnout STEJNÝ výsledek (stejné
  // id), takže porovnání jen podle id by druhé vytažení v řadě tiše
  // přehlédlo (stará a nová hodnota by byly identické).
  useEffect(() => {
    if (stav.kolostestiPocet === poslKolostestiPocetRef.current) return
    poslKolostestiPocetRef.current = stav.kolostestiPocet
    if (!stav.posledniVysledekKolaId) return
    const cilovyUhel = stredovyUhelVysledku(stav.posledniVysledekKolaId)
    // Ukazatel je pevně nahoře (0°) — appka kolo musí otočit tak, aby
    // střed trefeného segmentu skončil POD ním, tedy o (360 - cílový
    // úhel), plus pár celých otoček navíc jen pro vizuální efekt.
    setUhelKola((u) => u + POCET_OTOCEK_KOLA * 360 + (360 - cilovyUhel))
    setKolostestiAktivni(true)
    const cas = window.setTimeout(() => setKolostestiAktivni(false), DELKA_ANIMACE_KOLA_MS)
    return () => window.clearTimeout(cas)
  }, [stav.kolostestiPocet, stav.posledniVysledekKolaId])

  // Sabotáž (Fáze 4) — čistě lokální UI stav pro dvoukrokový sheet
  // (vyber akci → vyber cíl), engine sám o "otevřeném sheetu" nic
  // neví, jen o výsledku `provedSabotaz`. Appka sheet zavře pokaždé,
  // když se `aktivniIndex` doopravdy přesune na jiného hráče (kryje
  // jak normální předání tahu, tak "přeskoč celý tah" větev) — NE při
  // bonusovém hodu kola štěstí (stejný index, pořád stejný tah), takže
  // nehrozí zavření sheetu, dokud by ho hráč pořád mohl chtít použít.
  const [sabotazOtevrena, setSabotazOtevrena] = useState(false)
  const [vybranaAkce, setVybranaAkce] = useState<SabotazniAkce | null>(null)
  useEffect(() => {
    setSabotazOtevrena(false)
    setVybranaAkce(null)
  }, [stav.aktivniIndex])

  // Obchodování (Fáze 5) — čistě lokální UI stav pro stavbu nabídky
  // (nový návrh i protinabídka sdílí stejná pole, viz `obchodStrany`
  // níž), engine sám o "otevřeném sheetu" nic neví, jen o výsledku
  // navrhniObchod/navrhniProtinabidku. `obchodCilId` appka potřebuje
  // jen pro ČERSTVÝ návrh ve hře o 3+ hráčích — protinabídka cíl vždy
  // zná z `stav.nabidkaObchodu` samotné, žádný výběr netřeba.
  const [obchodOtevren, setObchodOtevren] = useState(false)
  const [protinabidkaOtevrena, setProtinabidkaOtevrena] = useState(false)
  const [obchodCilId, setObchodCilId] = useState<string | null>(null)
  const [obchodNabizenaPole, setObchodNabizenaPole] = useState<Set<string>>(new Set())
  const [obchodPozadovanaPole, setObchodPozadovanaPole] = useState<Set<string>>(new Set())
  const [obchodNabizenePenize, setObchodNabizenePenize] = useState('')
  const [obchodPozadovanePenize, setObchodPozadovanePenize] = useState('')
  useEffect(() => {
    setObchodOtevren(false)
    setProtinabidkaOtevrena(false)
    setObchodCilId(null)
  }, [stav.aktivniIndex])

  // Boti mohou sami navrhnout obchod aktivnímu hráči (Fáze 5) — appka
  // každému eliminovanému botovi dá přesně JEDNU šanci na vstup do
  // 'konec-tahu' bez čekajícího rozhodnutí, ne při každém dalším
  // vykreslení té samé fáze (třeba po odmítnutí jiné nabídky) — jinak
  // by to působilo jako nekonečný spam. `posledniZvazenyIndexRef`
  // appka resetuje jen SKUTEČNÝM posunem `aktivniIndex`, nikdy jen tím,
  // že `nabidkaObchodu` zpátky spadlo na null (odmítnutí/zrušení v
  // rámci stejného tahu dalšího pokusu botovi nedává).
  const posledniZvazenyIndexRef = useRef<number | null>(null)
  useEffect(() => {
    if (
      stav.faze !== 'konec-tahu' ||
      stav.konec ||
      stav.nabidkaKoupe ||
      stav.nabidkaObchodu ||
      stav.minihra ||
      kolostestiAktivni ||
      sabotazOtevrena ||
      obchodOtevren
    ) {
      return
    }
    if (posledniZvazenyIndexRef.current === stav.aktivniIndex) return
    posledniZvazenyIndexRef.current = stav.aktivniIndex
    const cil = aktivniHrac(stav)
    if (!cil) return

    for (const bot of stav.hraci.filter((h) => h.jeBot && h.id !== cil.id)) {
      const navrh = zvazBotuNabidkuObchodu(bot, cil, stav)
      if (!navrh) continue
      const cas = window.setTimeout(() => {
        setStav((s) =>
          navrhniObchod(s, bot.id, cil.id, navrh.nabizenePenize, navrh.nabizenaPole, navrh.pozadovanePenize, navrh.pozadovanaPole)
        )
      }, ZPOZDENI_NABIDKY_BOTU_MS)
      return () => window.clearTimeout(cas)
    }
  }, [stav, kolostestiAktivni, sabotazOtevrena, obchodOtevren])

  // Bot automaticky odpoví na čekající nabídku, pokud je PŘÍJEMCE bota
  // — pokrývá jak člověkem navrženou nabídku botovi, tak i bota
  // navrhujícího jinému botovi (když je sám aktivní hráč bot a jiný
  // bot mu obchod nabídne, viz efekt výš) — appka mezi oběma případy
  // vůbec nerozlišuje. Bot nikdy neposílá protinabídku, jen
  // přijme/odmítne (viz ai.ts's melByBotPrijmoutObchod).
  useEffect(() => {
    const n = stav.nabidkaObchodu
    if (!n || stav.konec) return
    const prijemce = stav.hraci.find((h) => h.id === n.komu)
    if (!prijemce?.jeBot) return

    const cas = window.setTimeout(() => {
      setStav((s) => {
        if (!s.nabidkaObchodu) return s
        return melByBotPrijmoutObchod(prijemce, s.nabidkaObchodu) ? prijmoutObchod(s) : odmitnoutObchod(s)
      })
    }, ZPOZDENI_ODPOVEDI_BOTU_MS)
    return () => window.clearTimeout(cas)
  }, [stav])

  // Čistě zobrazovací tik jednou za sekundu — appka tak umí ukázat
  // odpočet i beze změny `stav` samotného (`zkontrolujCas` je no-op,
  // dokud čas doopravdy nevyprší, takže by React jinak nepřekreslil).
  // Ve stejném intervalu appka zavolá i skutečnou kontrolu limitu.
  useEffect(() => {
    const id = window.setInterval(() => {
      setTik((t) => t + 1)
      setStav((s) => zkontrolujCas(s))
    }, 1000)
    return () => window.clearInterval(id)
  }, [])

  // Automatický konec tahu, jakmile dojdou kroky — ale ne dokud čeká
  // nerozhodnutá nabídka koupě (tu musí nejdřív někdo vyřešit), dokud
  // běží animace kola štěstí (Fáze 3), dokud má hráč otevřený sabotážní
  // sheet (Fáze 4), ani dokud čeká (nebo se právě staví) nabídka
  // obchodu (Fáze 5) — appka by jinak tah ukončila (a u bonusového hodu
  // rovnou otočila na druhý hod) dřív, než se stihne cokoli z toho
  // vyřídit. `ukonciTah` samo navíc blokuje, dokud `nabidkaObchodu` běží
  // (viz engine.ts), takže appka tu stejnou podmínku přidává hlavně
  // proto, aby vůbec NEPLÁNOVALA timeout, ne proto, že by bez ní
  // doopravdy něco rozbila.
  useEffect(() => {
    if (
      stav.faze !== 'konec-tahu' ||
      stav.nabidkaKoupe ||
      stav.konec ||
      kolostestiAktivni ||
      sabotazOtevrena ||
      obchodOtevren ||
      protinabidkaOtevrena ||
      stav.nabidkaObchodu ||
      stav.minihra
    ) {
      return
    }
    const cas = window.setTimeout(() => setStav((s) => ukonciTah(s)), ZPOZDENI_KONCE_TAHU_MS)
    return () => window.clearTimeout(cas)
  }, [
    stav.faze,
    stav.nabidkaKoupe,
    stav.konec,
    kolostestiAktivni,
    sabotazOtevrena,
    obchodOtevren,
    protinabidkaOtevrena,
    stav.nabidkaObchodu,
    stav.minihra,
  ])

  // Bot hraje sám — hodí kostkou, pak krok po kroku dojde, kam může,
  // jakmile na cestě narazí na nabídku koupě, sám ji vyřídí, a jakmile
  // doběhne do konce tahu bez nabídky koupě, zvažuje i sabotáž (Fáze
  // 4). Stejná kolostestiAktivni pojistka jako výš, ať appka bota
  // nenechá "myslet" dál, zatímco ještě běží animace jeho vlastního
  // kola štěstí — a nová `stav.nabidkaObchodu` pojistka (Fáze 5) ze
  // stejného důvodu: dokud čeká obchod (ať ho navrhl bot sám sobě
  // jiným botem, nebo lidský hráč botovi), žádné jiné rozhodnutí
  // aktivního bota se nemá dít, o odpověď se postará samostatný efekt
  // výš. Jakmile bot sabotáž tenhle tah použil (nebo nemá co dál
  // rozhodovat), appka žádný další timeout nenaplánuje — zbytek
  // obstará samostatný "automatický konec tahu" efekt výš.
  useEffect(() => {
    if (stav.konec || kolostestiAktivni || stav.nabidkaObchodu) return
    // Dražba (Fáze 6) se může týkat hráče, co zrovna NENÍ aktivniHrac
    // (appka jde kolem stolu, viz StavDrazby's vlastní komentář v
    // types.ts) — o tu se stará samostatný efekt níž.
    if (stav.minihra?.typ === 'drazba') return
    const hrac = aktivniHrac(stav)
    if (!hrac?.jeBot) return

    if (stav.minihra?.typ === 'pexeso') {
      const cas = window.setTimeout(() => {
        setStav((s) => {
          const m = s.minihra
          if (!m || m.typ !== 'pexeso') return s
          return m.cekaNaPotvrzeni ? potvrdNeshoduPexesa(s) : otocitKartuPexesa(s, pripravKartuBotuPexesa(m))
        })
      }, ZPOZDENI_MINIHRY_MS)
      return () => window.clearTimeout(cas)
    }

    if (stav.minihra?.typ === 'rychla-aukce') {
      const cas = window.setTimeout(() => {
        setStav((s) => (s.minihra?.typ === 'rychla-aukce' ? vyhodnotRychlouAukci(s, pripravPresnostBotuRychleAukce()) : s))
      }, ZPOZDENI_MINIHRY_MS)
      return () => window.clearTimeout(cas)
    }

    if (stav.faze === 'konec-tahu' && !stav.nabidkaKoupe && hrac.sabotazPouzita) return

    let zpozdeni: number
    if (stav.faze === 'hod') zpozdeni = ZPOZDENI_HODU_MS
    else if (stav.faze === 'pohyb') zpozdeni = ZPOZDENI_KROKU_MS
    else if (stav.faze === 'konec-tahu' && stav.nabidkaKoupe) zpozdeni = ZPOZDENI_ROZHODNUTI_MS
    else zpozdeni = ZPOZDENI_SABOTAZE_MS

    const cas = window.setTimeout(() => {
      setStav((s) => {
        const aktualni = aktivniHrac(s)
        if (!aktualni) return s
        if (s.faze === 'hod') return krokHodu(s)
        if (s.faze === 'pohyb') return krokPohybu(s, pripravSmerBota(aktualni, s))
        if (s.faze === 'konec-tahu' && s.nabidkaKoupe) {
          const obchod = OBCHODY_PODLE_KLICE[s.nabidkaKoupe]
          if (!obchod) return odmitnoutKoupi(s)
          return melByBotKoupit(aktualni, obchod) ? koupitPole(s) : odmitnoutKoupi(s)
        }
        if (s.faze === 'konec-tahu' && !s.nabidkaKoupe) {
          const sabotaz = melByBotSabotovat(aktualni, s.hraci)
          if (sabotaz) return provedSabotaz(s, sabotaz.akceId, sabotaz.cilId)
        }
        return s
      })
    }, zpozdeni)
    return () => window.clearTimeout(cas)
  }, [stav, kolostestiAktivni])

  // Dražba (Fáze 6) — samostatný efekt, protože hráč, co je zrovna
  // "na tahu v dražbě" (StavDrazby's poradiUcastniku/indexNaTahu),
  // nemusí být aktivniHrac (ten, co má zrovna svůj herní tah) — stejná
  // "může se to týkat i ne-aktivního hráče" situace jako u botí
  // obchodní nabídky/odpovědi výš.
  useEffect(() => {
    const m = stav.minihra
    if (!m || m.typ !== 'drazba' || stav.konec) return
    const naTahu = stav.hraci.find((h) => h.id === m.poradiUcastniku[m.indexNaTahu])
    if (!naTahu?.jeBot) return
    const polozka = POLOZKY_DRAZBY_PODLE_ID[m.polozkaId]
    if (!polozka) return

    const cas = window.setTimeout(() => {
      setStav((s) => {
        const aktualniM = s.minihra
        if (!aktualniM || aktualniM.typ !== 'drazba') return s
        return melByBotZvysitNabidkuDrazby(naTahu, aktualniM, polozka)
          ? zvysNabidkuDrazby(s, naTahu.id)
          : odstupOdDrazby(s, naTahu.id)
      })
    }, ZPOZDENI_MINIHRY_MS)
    return () => window.clearTimeout(cas)
  }, [stav])

  const hrac = aktivniHrac(stav)
  const jeNaTahuBot = hrac?.jeBot ?? false
  const nabidka = stav.nabidkaKoupe ? OBCHODY_PODLE_KLICE[stav.nabidkaKoupe] : null
  const vysledek = stav.konec ? vitezovePodleStavu(stav) : null

  // Vybere akci — na dvouhráčovou hru appka rovnou aplikuje (jediný
  // soupeř je jednoznačný cíl), jinak teprve otevře výběr cíle.
  const vyberAkciSabotaze = (akce: SabotazniAkce) => {
    if (!hrac) return
    const ostatni = stav.hraci.filter((h) => h.id !== hrac.id)
    if (ostatni.length === 1) {
      setStav((s) => provedSabotaz(s, akce.id, ostatni[0].id))
      setSabotazOtevrena(false)
    } else {
      setVybranaAkce(akce)
    }
  }

  const pouzitSabotazNaCil = (cilId: string) => {
    if (!vybranaAkce) return
    setStav((s) => provedSabotaz(s, vybranaAkce.id, cilId))
    setVybranaAkce(null)
    setSabotazOtevrena(false)
  }

  // Obchodování (Fáze 5) — která pole daný hráč zrovna vlastní, pro
  // checkbox seznamy ve stavebním sheetu níž.
  const poleHrace = (hracId: string): string[] =>
    Object.entries(stav.vlastnictvi)
      .filter(([, v]) => v === hracId)
      .map(([klic]) => klic)

  // Kdo je navrhovatel a kdo cíl stavěné nabídky — u čerstvého návrhu
  // appka to bere z `hrac`/`obchodCilId`, u protinabídky z aktuální
  // `stav.nabidkaObchodu` (role prohozené, viz engine.ts's
  // `navrhniProtinabidku`'s vlastní komentář). `null`, pokud se zrovna
  // nestaví žádná nabídka — appka pak sheet vůbec nevykreslí.
  const obchodStrany = protinabidkaOtevrena
    ? stav.nabidkaObchodu
      ? { navrhovatelId: stav.nabidkaObchodu.komu, cilId: stav.nabidkaObchodu.odKoho }
      : null
    : obchodOtevren && hrac && obchodCilId
      ? { navrhovatelId: hrac.id, cilId: obchodCilId }
      : null

  const otevritObchod = () => {
    if (!hrac) return
    const ostatni = stav.hraci.filter((h) => h.id !== hrac.id)
    setSabotazOtevrena(false)
    setVybranaAkce(null)
    setObchodCilId(ostatni.length === 1 ? ostatni[0].id : null)
    setObchodNabizenaPole(new Set())
    setObchodPozadovanaPole(new Set())
    setObchodNabizenePenize('')
    setObchodPozadovanePenize('')
    setObchodOtevren(true)
  }

  const otevritProtinabidku = () => {
    const n = stav.nabidkaObchodu
    if (!n) return
    // Předvyplní obráceně (co po mně chtěli, teď nabízím já, a naopak)
    // — výchozí bod, co se dá upravit, ne prázdný formulář.
    setObchodNabizenaPole(new Set(n.pozadovanaPole))
    setObchodPozadovanaPole(new Set(n.nabizenaPole))
    setObchodNabizenePenize(n.pozadovanePenize > 0 ? String(n.pozadovanePenize) : '')
    setObchodPozadovanePenize(n.nabizenePenize > 0 ? String(n.nabizenePenize) : '')
    setProtinabidkaOtevrena(true)
  }

  const zavritObchodSheet = () => {
    setObchodOtevren(false)
    setProtinabidkaOtevrena(false)
    setObchodCilId(null)
  }

  const prepnoutPole = (sada: Set<string>, nastav: (s: Set<string>) => void, klic: string) => {
    const nova = new Set(sada)
    if (nova.has(klic)) nova.delete(klic)
    else nova.add(klic)
    nastav(nova)
  }

  const odeslatObchodniFormular = () => {
    if (!obchodStrany) return
    const penizeOd = Math.max(0, Math.round(Number(obchodNabizenePenize)) || 0)
    const penizeKomu = Math.max(0, Math.round(Number(obchodPozadovanePenize)) || 0)
    setStav((s) =>
      protinabidkaOtevrena
        ? navrhniProtinabidku(s, penizeOd, Array.from(obchodNabizenaPole), penizeKomu, Array.from(obchodPozadovanaPole))
        : navrhniObchod(
            s,
            obchodStrany.navrhovatelId,
            obchodStrany.cilId,
            penizeOd,
            Array.from(obchodNabizenaPole),
            penizeKomu,
            Array.from(obchodPozadovanaPole)
          )
    )
    zavritObchodSheet()
  }

  return (
    <div className="trh-page trh-page--hra">
      {kolostestiAktivni && (
        <div className="trh-kolo-overlay">
          <p className="trh-kolo-nadpis">🎡 Kolo štěstí!</p>
          <div className="trh-kolo-wrap">
            <span className="trh-kolo-ukazatel" aria-hidden="true">
              ▼
            </span>
            <div
              className="trh-kolo-disk"
              style={{
                background: conicGradientKola(),
                transform: `rotate(${uhelKola}deg)`,
                transitionDuration: `${DELKA_ANIMACE_KOLA_MS}ms`,
              }}
            />
          </div>
        </div>
      )}

      <div className="trh-hra-layout">
        <div className="trh-deska-obal">
          {selhalo ? (
            <p className="trh-varovani">3D vykreslení se na tomhle zařízení nepovedlo spustit.</p>
          ) : (
            <div className="trh-deska-canvas" ref={containerRef} />
          )}
        </div>

        <div className="trh-hra-info">
          <header className="trh-top-bar">
            <button className="trh-back-btn" onClick={onZpet}>
              ← Ukončit hru
            </button>
            <h1 className="trh-title">Buddyho Trh</h1>
            {!stav.konec && <p className="trh-cas">⏱ {formatCas(zbyvaCasuMs(stav))}</p>}
          </header>

          <div className="trh-poradi">
            {stav.hraci.map((h) => (
              <span key={h.id} className={`trh-poradi-hrac ${h.id === hrac?.id ? 'je-na-tahu' : ''}`}>
                <span style={{ color: POSTAVY[h.postavaId].barva }}>{POSTAVY[h.postavaId].emoji}</span> {h.jmeno} ·{' '}
                {h.penize} kreditů
              </span>
            ))}
          </div>

          {stav.posledniUdalost && !stav.konec && <p className="trh-udalost">{stav.posledniUdalost}</p>}

          {vysledek ? (
            <div className="trh-konec">
              <h2 className="trh-konec-nadpis">
                {vysledek.length > 1 ? '🤝 Remíza!' : `🏆 Vyhrál ${vysledek[0].jmeno}!`}
              </h2>
              <ul className="trh-vysledky">
                {[...stav.hraci]
                  .sort((a, b) => b.penize - a.penize)
                  .map((h) => (
                    <li key={h.id} className={`trh-vysledek-radek ${vysledek.some((v) => v.id === h.id) ? 'je-vitez' : ''}`}>
                      <span style={{ color: POSTAVY[h.postavaId].barva }}>{POSTAVY[h.postavaId].emoji}</span>
                      <span className="trh-vysledek-jmeno">{h.jmeno}</span>
                      <span className="trh-vysledek-penize">{h.penize} kreditů</span>
                    </li>
                  ))}
              </ul>
              <button className="trh-spustit-btn" onClick={onZpet}>
                Zpět do menu
              </button>
            </div>
          ) : (
            <div className="trh-ovladani">
              {hrac && (
                <p className="trh-na-tahu">
                  Na tahu: <strong>{hrac.jmeno}</strong>
                  {jeNaTahuBot && ' (bot)'}
                </p>
              )}

              {stav.faze === 'hod' && (
                <button
                  className="trh-kostka-btn"
                  disabled={jeNaTahuBot}
                  onClick={() => setStav((s) => krokHodu(s))}
                >
                  🎲 Hodit kostkou
                </button>
              )}

              {stav.faze === 'pohyb' && (
                <>
                  <p className="trh-zbyva">Zbývá kroků: {stav.zbyvaKroku}</p>
                  <div className="trh-dpad">
                    <button
                      className="trh-dpad-btn trh-dpad-btn--nahoru"
                      disabled={jeNaTahuBot}
                      onClick={() => setStav((s) => krokPohybu(s, 'nahoru'))}
                    >
                      {NAZEV_SMERU.nahoru}
                    </button>
                    <button
                      className="trh-dpad-btn trh-dpad-btn--vlevo"
                      disabled={jeNaTahuBot}
                      onClick={() => setStav((s) => krokPohybu(s, 'vlevo'))}
                    >
                      {NAZEV_SMERU.vlevo}
                    </button>
                    <button
                      className="trh-dpad-btn trh-dpad-btn--vpravo"
                      disabled={jeNaTahuBot}
                      onClick={() => setStav((s) => krokPohybu(s, 'vpravo'))}
                    >
                      {NAZEV_SMERU.vpravo}
                    </button>
                    <button
                      className="trh-dpad-btn trh-dpad-btn--dolu"
                      disabled={jeNaTahuBot}
                      onClick={() => setStav((s) => krokPohybu(s, 'dolu'))}
                    >
                      {NAZEV_SMERU.dolu}
                    </button>
                  </div>
                  <button className="trh-ukoncit-tah-btn" disabled={jeNaTahuBot} onClick={() => setStav((s) => ukonciTah(s))}>
                    Ukončit tah
                  </button>
                </>
              )}

              {stav.faze === 'konec-tahu' && nabidka && !jeNaTahuBot && (
                <div className="trh-nabidka">
                  <p className="trh-nabidka-text">
                    Volné pole: <strong>{nabidka.nazev}</strong> — {nabidka.cena} kreditů (nájem {nabidka.najem} kreditů)
                  </p>
                  <div className="trh-nabidka-btns">
                    <button
                      className="trh-kostka-btn"
                      disabled={!hrac || hrac.penize < nabidka.cena}
                      onClick={() => setStav((s) => koupitPole(s))}
                    >
                      Koupit za {nabidka.cena} kreditů
                    </button>
                    <button className="trh-ukoncit-tah-btn" onClick={() => setStav((s) => odmitnoutKoupi(s))}>
                      Nekoupit
                    </button>
                  </div>
                </div>
              )}

              {stav.faze === 'konec-tahu' && nabidka && jeNaTahuBot && (
                <p className="trh-zbyva">Bot přemýšlí o koupi {nabidka.nazev}…</p>
              )}

              {stav.faze === 'konec-tahu' && !nabidka && (
                <div className="trh-akce-panel">
                  {stav.minihra ? (
                    (() => {
                      const m = stav.minihra

                      if (m.typ === 'pexeso') {
                        return (
                          <div className="trh-pexeso">
                            <p className="trh-sabotaz-nadpis">
                              🧠 Tržní pexeso — najdi všechny dvojice! (pokusy: {m.pokusy})
                            </p>
                            <div className="trh-pexeso-mrizka">
                              {m.karty.map((k, index) => {
                                const odkryta = k.nalezena || m.otevrene.includes(index)
                                return (
                                  <button
                                    key={index}
                                    className={`trh-pexeso-karta ${odkryta ? 'je-odkryta' : ''} ${k.nalezena ? 'je-nalezena' : ''}`}
                                    disabled={jeNaTahuBot || k.nalezena || m.otevrene.includes(index) || m.cekaNaPotvrzeni}
                                    onClick={() => setStav((s) => otocitKartuPexesa(s, index))}
                                  >
                                    {odkryta ? k.symbol : '❓'}
                                  </button>
                                )
                              })}
                            </div>
                            {jeNaTahuBot ? (
                              <p className="trh-zbyva">Bot hraje pexeso…</p>
                            ) : m.cekaNaPotvrzeni ? (
                              <button className="trh-kostka-btn" onClick={() => setStav((s) => potvrdNeshoduPexesa(s))}>
                                Pokračovat
                              </button>
                            ) : null}
                          </div>
                        )
                      }

                      if (m.typ === 'drazba') {
                        const polozka = POLOZKY_DRAZBY_PODLE_ID[m.polozkaId]
                        const vede = m.vedeId ? stav.hraci.find((h) => h.id === m.vedeId) : null
                        const naTahuId = m.indexNaTahu < m.poradiUcastniku.length ? m.poradiUcastniku[m.indexNaTahu] : null
                        const naTahuHrac = naTahuId ? stav.hraci.find((h) => h.id === naTahuId) : null
                        const dalsiNabidka = m.aktualniNabidka + PRIHOZ_DRAZBY
                        return (
                          <div className="trh-drazba">
                            <p className="trh-sabotaz-nadpis">
                              🔨 Dražba — {polozka?.ikona} <strong>{polozka?.nazev ?? '?'}</strong>
                            </p>
                            <p className="trh-zbyva">
                              Aktuální nabídka: <strong>{m.aktualniNabidka} kreditů</strong> (vede:{' '}
                              {vede ? vede.jmeno : 'nikdo zatím'})
                            </p>
                            {naTahuHrac?.jeBot ? (
                              <p className="trh-zbyva">Bot {naTahuHrac.jmeno} přemýšlí…</p>
                            ) : naTahuHrac ? (
                              <>
                                <p className="trh-sabotaz-nadpis">Na tahu: {naTahuHrac.jmeno}</p>
                                <div className="trh-obchod-akce">
                                  <button
                                    className="trh-kostka-btn"
                                    disabled={naTahuHrac.penize < dalsiNabidka}
                                    onClick={() => setStav((s) => zvysNabidkuDrazby(s, naTahuHrac.id))}
                                  >
                                    Přihodit na {dalsiNabidka} kreditů
                                  </button>
                                  <button
                                    className="trh-ukoncit-tah-btn"
                                    onClick={() => setStav((s) => odstupOdDrazby(s, naTahuHrac.id))}
                                  >
                                    Vzdát se
                                  </button>
                                </div>
                              </>
                            ) : null}
                          </div>
                        )
                      }

                      // 'rychla-aukce'
                      return jeNaTahuBot ? (
                        <p className="trh-zbyva">
                          {MINIHRY_PODLE_TYPU['rychla-aukce'].ikona} Bot zkouší rychlou aukci…
                        </p>
                      ) : (
                        <div className="trh-rychla-aukce">
                          <p className="trh-sabotaz-nadpis">⚡ Rychlá aukce — chyť ukazatel uprostřed!</p>
                          <RychlaAukceHra onChytit={(presnost) => setStav((s) => vyhodnotRychlouAukci(s, presnost))} />
                        </div>
                      )
                    })()
                  ) : stav.nabidkaObchodu && !protinabidkaOtevrena ? (
                    (() => {
                      const n = stav.nabidkaObchodu
                      const navrhovatel = stav.hraci.find((h) => h.id === n.odKoho)
                      const cil = stav.hraci.find((h) => h.id === n.komu)
                      const popisStrany = (penize: number, pole: string[]): string => {
                        const casti: string[] = []
                        if (penize > 0) casti.push(`${penize} kreditů`)
                        casti.push(...pole.map((k) => OBCHODY_PODLE_KLICE[k]?.nazev ?? k))
                        return casti.length > 0 ? casti.join(', ') : 'nic'
                      }
                      return (
                        <div className="trh-obchod-nabidka">
                          <p className="trh-obchod-nadpis">
                            🤝 <strong>{navrhovatel?.jmeno ?? '?'}</strong> nabízí obchod hráči{' '}
                            <strong>{cil?.jmeno ?? '?'}</strong>
                          </p>
                          <p className="trh-obchod-detail">
                            Nabízí: <strong>{popisStrany(n.nabizenePenize, n.nabizenaPole)}</strong>
                          </p>
                          <p className="trh-obchod-detail">
                            Chce: <strong>{popisStrany(n.pozadovanePenize, n.pozadovanaPole)}</strong>
                          </p>
                          {cil?.jeBot ? (
                            <p className="trh-zbyva">Bot zvažuje nabídku…</p>
                          ) : (
                            <div className="trh-obchod-akce">
                              <button className="trh-kostka-btn" onClick={() => setStav((s) => prijmoutObchod(s))}>
                                Přijmout
                              </button>
                              <button className="trh-ukoncit-tah-btn" onClick={() => setStav((s) => odmitnoutObchod(s))}>
                                Odmítnout
                              </button>
                              <button className="trh-ukoncit-tah-btn" onClick={otevritProtinabidku}>
                                Upravit a poslat zpět
                              </button>
                            </div>
                          )}
                          <button
                            className="trh-obchod-zrusit-link"
                            onClick={() => setStav((s) => zrusitObchod(s))}
                          >
                            Zrušit nabídku
                          </button>
                        </div>
                      )
                    })()
                  ) : !jeNaTahuBot && (obchodOtevren || protinabidkaOtevrena) ? (
                    <div className="trh-obchod-sheet">
                      {obchodOtevren && !protinabidkaOtevrena && !obchodCilId ? (
                        <>
                          <p className="trh-sabotaz-nadpis">Komu nabídnout obchod?</p>
                          {stav.hraci
                            .filter((h) => h.id !== hrac?.id)
                            .map((h) => (
                              <button key={h.id} className="trh-sabotaz-cil" onClick={() => setObchodCilId(h.id)}>
                                <span style={{ color: POSTAVY[h.postavaId].barva }}>{POSTAVY[h.postavaId].emoji}</span>{' '}
                                {h.jmeno}
                              </button>
                            ))}
                          <button className="trh-ukoncit-tah-btn" onClick={zavritObchodSheet}>
                            Zrušit
                          </button>
                        </>
                      ) : (
                        obchodStrany && (
                          <>
                            <p className="trh-sabotaz-nadpis">
                              {protinabidkaOtevrena
                                ? 'Uprav a pošli zpátky'
                                : `Nabídka pro ${stav.hraci.find((h) => h.id === obchodStrany.cilId)?.jmeno ?? '?'}`}
                            </p>
                            <div className="trh-obchod-sloupec">
                              <p className="trh-obchod-sloupec-nadpis">Nabízíš</p>
                              <input
                                className="trh-obchod-penize-input"
                                type="number"
                                min={0}
                                inputMode="numeric"
                                placeholder="Peníze (kreditů)"
                                value={obchodNabizenePenize}
                                onChange={(e) => setObchodNabizenePenize(e.target.value)}
                              />
                              {poleHrace(obchodStrany.navrhovatelId).map((klic) => (
                                <label key={klic} className="trh-obchod-pole-radek">
                                  <input
                                    type="checkbox"
                                    checked={obchodNabizenaPole.has(klic)}
                                    onChange={() => prepnoutPole(obchodNabizenaPole, setObchodNabizenaPole, klic)}
                                  />
                                  {OBCHODY_PODLE_KLICE[klic]?.nazev ?? klic}
                                </label>
                              ))}
                            </div>
                            <div className="trh-obchod-sloupec">
                              <p className="trh-obchod-sloupec-nadpis">Chceš</p>
                              <input
                                className="trh-obchod-penize-input"
                                type="number"
                                min={0}
                                inputMode="numeric"
                                placeholder="Peníze (kreditů)"
                                value={obchodPozadovanePenize}
                                onChange={(e) => setObchodPozadovanePenize(e.target.value)}
                              />
                              {poleHrace(obchodStrany.cilId).map((klic) => (
                                <label key={klic} className="trh-obchod-pole-radek">
                                  <input
                                    type="checkbox"
                                    checked={obchodPozadovanaPole.has(klic)}
                                    onChange={() => prepnoutPole(obchodPozadovanaPole, setObchodPozadovanaPole, klic)}
                                  />
                                  {OBCHODY_PODLE_KLICE[klic]?.nazev ?? klic}
                                </label>
                              ))}
                            </div>
                            <div className="trh-obchod-akce">
                              <button className="trh-kostka-btn" onClick={odeslatObchodniFormular}>
                                {protinabidkaOtevrena ? 'Poslat protinabídku' : 'Navrhnout obchod'}
                              </button>
                              <button className="trh-ukoncit-tah-btn" onClick={zavritObchodSheet}>
                                Zrušit
                              </button>
                            </div>
                          </>
                        )
                      )}
                    </div>
                  ) : !jeNaTahuBot && sabotazOtevrena ? (
                    <div className="trh-sabotaz-sheet">
                      {!vybranaAkce ? (
                        <>
                          <p className="trh-sabotaz-nadpis">Vyber sabotáž:</p>
                          {SABOTAZNI_AKCE.map((akce) => (
                            <button
                              key={akce.id}
                              className="trh-sabotaz-akce"
                              disabled={!hrac || hrac.penize < akce.cena}
                              onClick={() => vyberAkciSabotaze(akce)}
                            >
                              <span className="trh-sabotaz-akce-ikona" aria-hidden="true">
                                {akce.ikona}
                              </span>
                              <span className="trh-sabotaz-akce-text">
                                <strong>
                                  {akce.nazev} — {akce.cena} kreditů
                                </strong>
                                <span>{akce.popis}</span>
                              </span>
                            </button>
                          ))}
                          <button className="trh-ukoncit-tah-btn" onClick={() => setSabotazOtevrena(false)}>
                            Zrušit
                          </button>
                        </>
                      ) : (
                        <>
                          <p className="trh-sabotaz-nadpis">Na koho použít {vybranaAkce.nazev}?</p>
                          {stav.hraci
                            .filter((h) => h.id !== hrac?.id)
                            .map((h) => (
                              <button key={h.id} className="trh-sabotaz-cil" onClick={() => pouzitSabotazNaCil(h.id)}>
                                <span style={{ color: POSTAVY[h.postavaId].barva }}>{POSTAVY[h.postavaId].emoji}</span>{' '}
                                {h.jmeno}
                              </button>
                            ))}
                          <button className="trh-ukoncit-tah-btn" onClick={() => setVybranaAkce(null)}>
                            Zpět
                          </button>
                        </>
                      )}
                    </div>
                  ) : !jeNaTahuBot ? (
                    <div className="trh-akce-tlacitka">
                      <button
                        className="trh-sabotaz-otevrit-btn"
                        disabled={!hrac || hrac.sabotazPouzita}
                        onClick={() => {
                          setObchodOtevren(false)
                          setSabotazOtevrena(true)
                        }}
                      >
                        ⚔️ Sabotovat soupeře
                      </button>
                      <button className="trh-obchod-otevrit-btn" onClick={otevritObchod}>
                        🤝 Obchodovat
                      </button>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Deska
