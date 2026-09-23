import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/core/store/useAppStore'
import { useFormCheck, nastavPredvyberCviku, nastavPredvyberOkruhu } from '@/miniapps/form-check/useFormCheck'
import { NAZEV_CVIKU, type TypCviku } from '@/miniapps/form-check/types'
import { AppIcon } from '@/pages/app/components/AppIcon'
import { plural } from '@/core/utils/pluralCZ'
import { useHasPermission } from '@/core/role'
import { sdilejText } from '@/core/utils/sdileni'
import { stahnoutTextovySoubor } from '@/core/utils/download'
import { FlagshipShell } from '../shared/FlagshipShell'
import { NastrojeSheet } from '../shared/NastrojeSheet'
import {
  spocitatFitnessPrehled,
  formatujRozdil,
  formatujRozdilMesic,
  spocitejOsobniRekordy,
  spocitejSeriiTreninku,
  spocitejTreninkovychDniZaTyden,
  spocitejAktivituPodleDne,
  soucetOdhadKcalZaPosledniDni,
  sestavTydenniShrnutiText,
  sestavFitnessReport,
  spocitatMesicniSrovnaniFitness,
  tydenniKlic,
} from './fitnessStats'
import { useFitnessCil } from './useFitnessCil'
import { useTelesneMiry } from './useTelesneMiry'
import {
  spocitejGrafVahy,
  serazenoPodleData,
  formatujRozdilVahy,
  vypocitejBmi,
  popisBmiKategorie,
  castiZaznamu,
  spocitejStavCileVahy,
  spocitejStavCileObvoduPasu,
} from './telesneMiryStats'
import { useCvicebniPlan, dnesniDenVTydnu, NAZEV_DNE, type HodnotaPlanu, type DenVTydnu } from './useCvicebniPlan'
import { useJidelnicek } from './useJidelnicek'
import { spocitejKalorieDne } from './jidelnicekStats'
import { POTRAVINY } from './data/potraviny'
import { usePitnyRezim } from './usePitnyRezim'
import { useSpanek } from './useSpanek'
import { RUTINY, type Rutina } from './data/rutiny'
import { useFitnessPripomenuti } from './useFitnessPripomenuti'
import { DOPORUCENE_JIDELNICKY, nejblizsiJidelnicek } from './data/doporuceneJidelnicky'
import { KOUCOVACI_TIPY } from './data/koucovaciTipy'
import { RozcvickaCasovac } from './RozcvickaCasovac'
import { Zebricek } from './Zebricek'
import { useBehani } from '@/miniapps/behani/useBehani'
import { NAZEV_AKTIVITY, IKONA_AKTIVITY, formatujVzdalenost, soucetVzdalenostiM } from '@/miniapps/behani/types'
import { usePosilovna } from '@/miniapps/posilovna/usePosilovna'
import { celkovyObjem, formatujObjem } from '@/miniapps/posilovna/types'
import type { FlagshipDlazdice, FlagshipVelkaKarta } from '../shared/types'
import './FitnessRoomModule.css'

// Skromné, historické výchozí hodnoty denního cíle — appka do teď
// netrénovala nic než dřepy, takže šlo od začátku o natvrdo dané číslo,
// ne o vyladěný plán. Od zavedení useFitnessCil.ts jde jen o fallback
// pro chvíli, kdy si uživatel vlastní cíl ještě nenastavil — kdo
// nastavení nikdy neotevře, uvidí přesně tahle čísla jako dřív.
const CIL_KCAL_VYCHOZI = 300
const CIL_TRENINK_MIN_VYCHOZI = 20
// Spánek nemá žádnou historickou hodnotu (appka ho nikdy dřív
// nesledovala vůbec) — 8 h je jen běžně doporučovaný orientační
// odhad, ne vyladěný plán, stejná role jako u kcal/tréninku výš.
const CIL_SPANEK_VYCHOZI = 8

const formatCasMinSek = (sekund: number): string => {
  if (sekund === 0) return '0 s'
  if (sekund < 60) return `${sekund} s`
  return `${Math.floor(sekund / 60)} min ${sekund % 60} s`
}

// new Date(rok, mesic - 1, den), ne new Date(retezec) — stejná
// "zone-less literál, ne UTC posunutý" opatrnost jako Kalendářovo
// zobrazitDatum, jinde v appce.
const formatDatumMiry = (datum: string): string => {
  const [rok, mesic, den] = datum.split('-').map(Number)
  return new Date(rok, mesic - 1, den).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' })
}

const dnesniDatumIso = (): string => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Deterministický "tip dne" podle dne v roce — appka ho nevybírá
 *  náhodně, ať se ve stejný den nikdy neukáže jiný VIP uživatelům. */
const tipDne = (): string => {
  const zacatekRoku = new Date(new Date().getFullYear(), 0, 0)
  const denRoku = Math.floor((Date.now() - zacatekRoku.getTime()) / 86_400_000)
  return KOUCOVACI_TIPY[denRoku % KOUCOVACI_TIPY.length]
}

// ==========================================
// Fitness Room — druhá vlajková appka (viz FlagshipShell.tsx pro celé
// zdůvodnění rozděleného pláště). Na rozdíl od School Roomu nemá
// "Můj widget" panel vůbec — tělo je vlastní přehled/cíle/rychlý
// trénink, proto se sem MujWidgetPanel neimportuje.
//
// Form Check je jediná appka přesunutá sem zatím (jenVeVlajkoveAppce
// v useAppStore.ts) — "Apps" velká karta (na rozdíl od School Roomu
// si tenhle název podržela, referenční návrh ji nepřejmenovával)
// rozbaluje NastrojeSheet.tsx s jednou jedinou položkou. "Soubory"
// deep-linkuje do File Manageru stejně jako School Room — obecná
// appka na ukládání souborů, nic nebrání dvěma vlajkovým appkám
// odkazovat na tu samou.
//
// Skutečná data místo tři: appka nemá krokoměr ani senzor spánku
// nikde v kódu, takže "Kroky"/"Spánek" jsou natvrdo "zatím
// nesledujeme", ne vymyšlené číslo, co by vypadalo jako naměřené.
// "Kalorie" je výslovně označený odhad (fitnessStats.ts), "Trénink"
// jediný skutečně přesný údaj (součet trvaniSekund dnešních sezení
// Form Checku).
//
// Třetí kolo vylepšení přidalo Jídelníček/Pitný režim/Cvičební rutiny/
// rozšířené tělesné míry/víc odznaků/sdílení/report/víc připomenutí a
// čtyři VIP panely (doporučené jídelníčky/měsíční trend/zlatý vzhled/
// denní tip), všechny za cosmetics.premium — stejná brána jako
// Writer's Roomův Zlatý papír a Vzhled aplikace jinde v appce.
//
// Naplánovaný "další appky do fitness roomu" postup (Fáze 1-4, viz
// CLAUDE.md) přidal Běhání/Kardio (miniapps/behani), Posilovnu
// (miniapps/posilovna), Jógu/mobilitu (RozcvickaCasovac.tsx) a nakonec
// Žebříček (Zebricek.tsx) — jediná fáze s vlastní Supabase tabulkou,
// viz Zebricek.tsx/zebricekApi.ts pro celé zdůvodnění.
//
// Grafický dotah a přeskupení (páté kolo) reaguje na to, že se v tomhle
// bodě appka rozrostla na 17 stejně velkých, stejně vypadajících panelů
// v jedné dlouhé řadě — přesně ten "je to tam všechno naplacané" dojem.
// Fix je stejný jako School Roomovo vlastní "seskupené dlaždice" kolo
// (viz CLAUDE.md) — jenže tady appka nemá dlaždicovou mřížku, co by
// MujWidgetPanel.tsx's sekce prop mohl seskupit, jen sekvenci celých
// panelů, takže seskupení žije přímo tady: čtyři nová .fit-sekce
// obalení (Spustit trénink/Denní návyky/Pokrok/VIP), každé s vlastní
// hlavičkou co znovupoužívá FlagshipShell.css's už existující
// .fs-dlazdice-sekce-hlavicka/-ikona třídy (jsou sdílené přes import
// FlagshipShell komponenty výš, žádný nový CSS soubor nepotřebují) —
// stejný malý barevný odznak + UPPERCASE popisek jako School Roomovo
// seskupení, jen aplikovaný na celé karty místo dlaždic. Panely uvnitř
// jedné sekce mají menší mezeru mezi sebou (.fit-sekce's vlastní gap)
// než appčin obecný .app-container gap mezi sekcemi samotnými — to je
// to, co skupiny opticky odliší jednu od druhé. "Dnešní cíl" se navíc
// přesunulo z konce seznamu hned vedle "Moje přehled" (obě jsou
// "dnešní stav", patří vedle sebe), a "Žebříček" z hned-po-hlavičce
// pozice dolů do "Pokrok" vedle Tělesných měr/Aktivity, kam obsahově
// patří o dost víc. Barevný pruh pod hlavičkou je stejný trik jako
// School Roomovo .sr-accent-pruh, jen appčinou vlastní fialovou (viz
// useAppStore.ts's DEFAULT_APPS — 'purple').
// ==========================================

export const FitnessRoomModule: React.FC = () => {
  const navigate = useNavigate()
  const setActiveAppId = useAppStore((s) => s.setActiveAppId)
  const { sezeni } = useFormCheck()
  const cile = useFitnessCil()
  const miry = useTelesneMiry()
  const cvicebniPlan = useCvicebniPlan()
  const jidelnicek = useJidelnicek()
  const behani = useBehani()
  const posilovna = usePosilovna()
  const pitnyRezim = usePitnyRezim()
  const spanek = useSpanek()
  const pripomenuti = useFitnessPripomenuti()
  const smiVip = useHasPermission('cosmetics.premium')
  const [notifOpen, setNotifOpen] = useState(false)
  const [appsOtevrene, setAppsOtevrene] = useState(false)
  const [upravujeCile, setUpravujeCile] = useState(false)
  const [upravujePlan, setUpravujePlan] = useState(false)
  const [rozcvickaOtevrena, setRozcvickaOtevrena] = useState(false)
  const [zebricekOtevren, setZebricekOtevren] = useState(false)
  const [novaVyskaText, setNovaVyskaText] = useState('')

  const handleUlozitVysku = () => {
    // Prázdné pole neznamená "smaž výšku" — appka bez tohohle by
    // klepnutím "Uložit výšku" bez napsání čehokoli (např. jen letmý
    // pohled na už uloženou hodnotu, kterou pole zobrazuje přes svůj
    // vlastní fallback na miry.vyskaCm) tiše vymazala už zadanou
    // výšku na null, protože Number('') je 0. Prázdné pole je tedy
    // no-op, ne mazání — appka nemá žádné samostatné tlačítko na
    // smazání výšky, tohle pole jen ukládá skutečně napsané číslo.
    if (novaVyskaText.trim() === '') return
    const vyska = Number(novaVyskaText)
    miry.setVyska(vyska > 0 ? vyska : null)
  }

  // Deník tělesných měr — přidávací formulář se otevírá/zavírá stejným
  // tlačítkem jako úprava cílů výš, čistě lokální session stav.
  const [pridavaZaznamMiry, setPridavaZaznamMiry] = useState(false)
  const [novyDatumMiry, setNovyDatumMiry] = useState(dnesniDatumIso)
  const [novaVahaText, setNovaVahaText] = useState('')
  const [novyObvodText, setNovyObvodText] = useState('')
  const [novyHrudnikText, setNovyHrudnikText] = useState('')
  const [novyBokyText, setNovyBokyText] = useState('')
  const [novyPazeText, setNovyPazeText] = useState('')
  const [novyTukText, setNovyTukText] = useState('')

  const handleUlozitZaznamMiry = () => {
    const cislo = (text: string): number | null => {
      if (text.trim() === '') return null
      const n = Number(text)
      return n > 0 ? n : null
    }
    const hodnoty = {
      vahaKg: cislo(novaVahaText),
      obvodPasuCm: cislo(novyObvodText),
      hrudnikCm: cislo(novyHrudnikText),
      bokyCm: cislo(novyBokyText),
      pazeCm: cislo(novyPazeText),
      tukProcent: cislo(novyTukText),
    }
    if (Object.values(hodnoty).every((v) => v === null)) return
    miry.pridatZaznam(novyDatumMiry, hodnoty)
    setNovaVahaText('')
    setNovyObvodText('')
    setNovyHrudnikText('')
    setNovyBokyText('')
    setNovyPazeText('')
    setNovyTukText('')
    setPridavaZaznamMiry(false)
  }

  const handleSmazatZaznamMiry = (id: string) => {
    if (!window.confirm('Smazat tenhle záznam?')) return
    miry.smazatZaznam(id)
  }

  const zaznamySerazene = serazenoPodleData(miry.zaznamy)
  const zaznamySVahou = zaznamySerazene.filter((z) => z.vahaKg !== null)
  const posledniVaha = zaznamySVahou.length > 0 ? zaznamySVahou[zaznamySVahou.length - 1].vahaKg : null
  const predposledniVaha = zaznamySVahou.length > 1 ? zaznamySVahou[zaznamySVahou.length - 2].vahaKg : null
  const rozdilVahyText = posledniVaha !== null ? formatujRozdilVahy(posledniVaha, predposledniVaha) : null
  const grafVahy = spocitejGrafVahy(miry.zaznamy, 14)
  const bmi = posledniVaha !== null ? vypocitejBmi(posledniVaha, miry.vyskaCm) : null

  const stavCileVahy = spocitejStavCileVahy(miry.zaznamy, miry.cilVahaKg)
  const stavCileObvoduPasu = spocitejStavCileObvoduPasu(miry.zaznamy, miry.cilObvodPasuCm)
  const [upravujeCileMiry, setUpravujeCileMiry] = useState(false)

  const denDnes = dnesniDenVTydnu()
  const planDnes: HodnotaPlanu | undefined = cvicebniPlan.plan[denDnes]
  const VSECHNY_CVIKY_PLAN: TypCviku[] = ['dřep', 'klik', 'výpad', 'prkno']
  const VSECHNY_DNY: DenVTydnu[] = [1, 2, 3, 4, 5, 6, 7]

  const otevritFormCheck = (predvybranyCvik?: TypCviku) => {
    // Nepovinný předvýběr — jen "Spustit dnešní trénink" ho posílá,
    // všechna ostatní volání (Rychlý trénink, historie, Zobrazit vše…)
    // zůstávají beze změny a Form Check se otevře na svém obyčejném
    // výchozím cviku.
    if (predvybranyCvik) nastavPredvyberCviku(predvybranyCvik)
    setActiveAppId('form-check', '/fitness')
    navigate('/apps')
  }

  const otevritBehani = () => {
    setActiveAppId('behani', '/fitness')
    navigate('/apps')
  }

  const otevritPosilovnu = () => {
    setActiveAppId('posilovna', '/fitness')
    navigate('/apps')
  }

  const otevritRutinu = (rutina: Rutina) => {
    // Cvičební rutiny nespouštějí druhý, nový mechanismus — jen
    // předvyplní Form Checkův už existující okruhový builder (viz
    // useFormCheck.ts's nastavPredvyberOkruhu).
    nastavPredvyberOkruhu(rutina.kroky)
    setActiveAppId('form-check', '/fitness')
    navigate('/apps')
  }

  const { dnes, vcera } = spocitatFitnessPrehled(sezeni)
  const rekordy = spocitejOsobniRekordy(sezeni)
  const serie = spocitejSeriiTreninku(sezeni)
  const treninkovychDniZaTyden = spocitejTreninkovychDniZaTyden(sezeni)
  const aktivita = spocitejAktivituPodleDne(sezeni, 14)
  const maxMinutAktivity = Math.max(1, ...aktivita.map((d) => d.minutTreninku))

  // Oslava splnění týdenního cíle — stejný duch jako Form Checkova živá
  // oslava nového rekordu, jen o úroveň výš (dashboard, ne uprostřed
  // cvičení). Cíl je "splněný" tenhle týden poprvé, když aktuální ISO
  // týdenní klíč ještě neodpovídá tomu, co appka naposledy oslavila —
  // díky tomu se stejná oslava neopakuje při každé návštěvě dashboardu,
  // ale zase se vrátí, jakmile uživatel cíl splní i v příštím týdnu.
  const tydenniCilSplnen =
    cile.cilTreninkuTydne !== null && treninkovychDniZaTyden >= cile.cilTreninkuTydne
  const [tydenniOslavaViditelna, setTydenniOslavaViditelna] = useState(false)
  // Deps schválně jen [tydenniCilSplnen] — cile.posledniOslavenyTydenKlic/
  // setPosledniOslavenyTydenKlic se čtou/volají uvnitř vždycky znovu,
  // ne z uzavřené hodnoty; zařazení celého "cile" objektu do deps by
  // efekt spouštělo při jakékoli změně cíle, ne jen při skutečném
  // přechodu "cíl zrovna splněn".
  useEffect(() => {
    if (!tydenniCilSplnen) return
    const klic = tydenniKlic(new Date())
    if (cile.posledniOslavenyTydenKlic === klic) return
    cile.setPosledniOslavenyTydenKlic(klic)
    setTydenniOslavaViditelna(true)
  }, [tydenniCilSplnen])

  // Sama zmizí po pár vteřinách, stejný "krátká oslava, žádné trvalé
  // tlačítko na zavření" tvar jako Souboj's telefonní bannery výsledku.
  useEffect(() => {
    if (!tydenniOslavaViditelna) return
    const timer = window.setTimeout(() => setTydenniOslavaViditelna(false), 4000)
    return () => window.clearTimeout(timer)
  }, [tydenniOslavaViditelna])

  // Dnešní datum — sdílené Jídelníčkem/Pitným režimem/Spánkem níž,
  // spočítané tady nahoře, ať ho pocetDokoncenychCilu může použít pro
  // dnešní spánek dřív, než appka dojde k Jídelníčkově vlastní sekci.
  const dnesniDatumJidlo = dnesniDatumIso()

  const cilKcal = cile.cilKcal ?? CIL_KCAL_VYCHOZI
  const cilTreninkMin = cile.cilTreninkMin ?? CIL_TRENINK_MIN_VYCHOZI
  const cilSpanekHod = spanek.cilHod ?? CIL_SPANEK_VYCHOZI
  // null, dokud dnešek ještě není zapsaný — appka si nevymýšlí 0 hodin
  // spánku jen proto, že se na to nikdo nepodíval, stejná poctivost
  // jako u "zatím nesledujeme" jinde v appce.
  const spanekDnesHod = spanek.hodiny[dnesniDatumJidlo] ?? null

  const kcalProgres = Math.min(100, Math.round((dnes.odhadKcal / cilKcal) * 100))
  const treninkProgres = Math.min(100, Math.round((dnes.minutTreninku / cilTreninkMin) * 100))
  const spanekProgres = spanekDnesHod !== null ? Math.min(100, Math.round((spanekDnesHod / cilSpanekHod) * 100)) : 0
  const pocetDokoncenychCilu = [kcalProgres, treninkProgres, spanekProgres].filter((p) => p >= 100).length

  const [novySpanekText, setNovySpanekText] = useState('')
  const handleUlozitSpanek = () => {
    const hodiny = Number(novySpanekText)
    if (!(hodiny > 0)) return
    spanek.setHodinySpanku(dnesniDatumJidlo, hodiny)
    setNovySpanekText('')
  }

  // ------------------------------------------
  // Jídelníček — deník snězených jídel s kaloriemi (viz useJidelnicek.ts).
  // ------------------------------------------
  const jidlaDnes = jidelnicek.zaznamy.filter((z) => z.datum === dnesniDatumJidlo)
  const kalorieSnezeno = spocitejKalorieDne(jidelnicek.zaznamy, dnesniDatumJidlo)
  const [vybranaPotravinaId, setVybranaPotravinaId] = useState(POTRAVINY[0].id)
  const [pridavaJidloVlastni, setPridavaJidloVlastni] = useState(false)
  const [vlastniJidloNazev, setVlastniJidloNazev] = useState('')
  const [vlastniJidloKcalText, setVlastniJidloKcalText] = useState('')

  const handlePridatZeSeznamu = () => {
    const potravina = POTRAVINY.find((p) => p.id === vybranaPotravinaId)
    if (!potravina) return
    jidelnicek.pridatJidlo(dnesniDatumJidlo, potravina.nazev, potravina.kcal)
  }

  const handlePridatVlastniJidlo = () => {
    const kcal = Number(vlastniJidloKcalText)
    if (!vlastniJidloNazev.trim() || !(kcal > 0)) return
    jidelnicek.pridatJidlo(dnesniDatumJidlo, vlastniJidloNazev, kcal)
    setVlastniJidloNazev('')
    setVlastniJidloKcalText('')
    setPridavaJidloVlastni(false)
  }

  // ------------------------------------------
  // Pitný režim — denní počet vypitých sklenic (viz usePitnyRezim.ts).
  // ------------------------------------------
  const sklenicDnes = pitnyRezim.pocty[dnesniDatumJidlo] ?? 0
  const cilSklenic = pitnyRezim.cilSklenic ?? 8
  const vodaProgres = Math.min(100, Math.round((sklenicDnes / cilSklenic) * 100))

  // ------------------------------------------
  // Víc časů připomenutí (viz useFitnessPripomenuti.ts).
  // ------------------------------------------
  const [novyPripomenutiCas, setNovyPripomenutiCas] = useState('12:00')

  // ------------------------------------------
  // VIP: zlatý vzhled — session-only, stejný "smí se dívat, ne trvale
  // uložit" tvar jako Writer's Roomův pergamenRezim. Zpráva se sama
  // schová po pár vteřinách, stejná krátká-oslava-bez-tlačítka logika
  // jako u tydenniOslavaViditelna výš.
  // ------------------------------------------
  const [zlatyRezim, setZlatyRezim] = useState(false)
  const [vipZprava, setVipZprava] = useState<string | null>(null)

  useEffect(() => {
    if (!vipZprava) return
    const timer = window.setTimeout(() => setVipZprava(null), 3500)
    return () => window.clearTimeout(timer)
  }, [vipZprava])

  const handleTogglZlaty = () => {
    if (!smiVip) {
      setVipZprava('Zlatý vzhled je jen pro VIP.')
      return
    }
    setZlatyRezim((v) => !v)
  }

  const panelClass = smiVip && zlatyRezim ? 'fit-panel fit-panel--zlaty' : 'fit-panel'

  const doporucenyJidelnicek = nejblizsiJidelnicek(cile.cilKcal)
  const mesicniSrovnani = spocitatMesicniSrovnaniFitness(sezeni)

  const handleSdiletTyden = () => {
    void sdilejText(
      sestavTydenniShrnutiText(treninkovychDniZaTyden, serie, soucetOdhadKcalZaPosledniDni(sezeni)),
      'Fitness Room'
    )
  }

  const handleStahnoutReport = () => {
    stahnoutTextovySoubor(
      'fitness-room-report.txt',
      sestavFitnessReport({
        dnesniKcal: dnes.odhadKcal,
        dnesniMin: dnes.minutTreninku,
        tydenniTreninkovychDni: treninkovychDniZaTyden,
        cilTreninkuTydne: cile.cilTreninkuTydne,
        serieDni: serie,
        nejdelsiSezeniSekund: rekordy.nejdelsiSezeniSekund,
        nejvicOpakovaniZaDen: rekordy.nejvicOpakovaniZaDen,
        posledniVahaKg: posledniVaha,
      })
    )
  }

  const nastroje: FlagshipDlazdice[] = [
    {
      id: 'form-check',
      nazev: 'Form Check',
      popis: 'Počítání cviků přes kameru',
      ikona: 'form-check',
      barva: 'orange',
      onClick: otevritFormCheck,
    },
    {
      id: 'behani',
      nazev: 'Běhání',
      popis: 'GPS sledování běhu, chůze a kola',
      ikona: 'footprints',
      barva: 'green',
      onClick: otevritBehani,
    },
    {
      id: 'posilovna',
      nazev: 'Posilovna',
      popis: 'Deník vah a opakování',
      ikona: 'dumbbell',
      barva: 'purple',
      onClick: otevritPosilovnu,
    },
  ]

  const velkeKarty: FlagshipVelkaKarta[] = [
    {
      id: 'soubory',
      nazev: 'Soubory',
      popis: 'Ukládej tréninky, plány a výsledky',
      ikona: 'file-manager',
      barva: 'cyan',
      onClick: () => {
        setActiveAppId('file-manager', '/fitness')
        navigate('/apps')
      },
    },
    {
      id: 'apps',
      nazev: 'Apps',
      popis: 'Oblíbené fitness aplikace na dosah',
      ikona: 'grid',
      barva: 'purple',
      onClick: () => setAppsOtevrene(true),
    },
  ]

  return (
    <>
      <FlagshipShell
        nazev="Fitness Room"
        popisHlavicky="Trénuj chytře"
        ikonaHlavicky="dumbbell"
        velkeKarty={velkeKarty}
        notifOpen={notifOpen}
        onOpenNotifications={() => setNotifOpen(true)}
        onCloseNotifications={() => setNotifOpen(false)}
      >
        <div className="fit-accent-pruh" aria-hidden="true" />

        {/* ------------------------------------------
            DNEŠNÍ STAV — bez vlastní hlavičky sekce, appka do ní
            vstupuje rovnou po hlavičce/barevném pruhu, eyebrow popisek
            by tu byl jen zbytečné opakování slova "dnes" nad panely,
            co samy říkají "Moje přehled"/"Dnešní cíl".
            ------------------------------------------ */}
        <div className="fit-sekce">
          <div className={panelClass}>
            <div className="fit-panel-hlavicka">
              <div>
                <h2>Moje přehled</h2>
                <p>Dnes je skvělý den na trénink!</p>
              </div>
              <div className="fit-panel-hlavicka-akce">
                <button
                  className={`fit-historie-btn ${smiVip && zlatyRezim ? 'fit-historie-btn--zlaty-aktivni' : ''}`}
                  aria-label="Zlatý vzhled (VIP)"
                  aria-pressed={zlatyRezim}
                  onClick={handleTogglZlaty}
                >
                  <AppIcon name="sparkles" size={18} />
                </button>
                <button className="fit-historie-btn" aria-label="Historie tréninků" onClick={() => otevritFormCheck()}>
                  <AppIcon name="calendar" size={18} />
                </button>
              </div>
            </div>

            {vipZprava && <p className="fit-vip-zprava">{vipZprava}</p>}

            <div className="fit-prehled-telo">
              <div className="fit-postava" aria-hidden="true">
                <span className="fit-postava-emoji">🏋️</span>
              </div>

              <div className="fit-staty">
                <div className="fit-stat-radek">
                  <span className="fit-stat-ikona fs-barva--orange">
                    <AppIcon name="flame" size={18} />
                  </span>
                  <span className="fit-stat-text">
                    <span className="fit-stat-nazev">Kalorie (odhad)</span>
                    <span className="fit-stat-hodnota">
                      {dnes.odhadKcal} <small>kcal</small>
                    </span>
                  </span>
                  <span className="fit-stat-delta">{formatujRozdil(dnes.odhadKcal, vcera.odhadKcal)}</span>
                </div>

                <div className="fit-stat-radek">
                  <span className="fit-stat-ikona fs-barva--purple">
                    <AppIcon name="dumbbell" size={18} />
                  </span>
                  <span className="fit-stat-text">
                    <span className="fit-stat-nazev">Trénink</span>
                    <span className="fit-stat-hodnota">
                      {dnes.minutTreninku} <small>min</small>
                    </span>
                  </span>
                  <span className="fit-stat-delta">{formatujRozdil(dnes.minutTreninku, vcera.minutTreninku)}</span>
                </div>

                <div className="fit-stat-radek fit-stat-radek--nesledujeme">
                  <span className="fit-stat-ikona fs-barva--green">
                    <AppIcon name="footprints" size={18} />
                  </span>
                  <span className="fit-stat-text">
                    <span className="fit-stat-nazev">Kroky</span>
                    <span className="fit-stat-hodnota-nesledujeme">Zatím nesledujeme</span>
                  </span>
                </div>

                <div className="fit-stat-radek">
                  <span className="fit-stat-ikona fs-barva--cyan">
                    <AppIcon name="moon" size={18} />
                  </span>
                  <span className="fit-stat-text">
                    <span className="fit-stat-nazev">Spánek</span>
                    <span className="fit-spanek-radek">
                      <input
                        type="number"
                        min={0}
                        max={24}
                        step="0.5"
                        inputMode="decimal"
                        value={novySpanekText || (spanekDnesHod ?? '')}
                        onChange={(e) => setNovySpanekText(e.target.value)}
                        placeholder="h"
                        className="fit-spanek-input"
                      />
                      <span className="fit-spanek-jednotka">h</span>
                      <button className="fit-spanek-ulozit" onClick={handleUlozitSpanek}>
                        Uložit
                      </button>
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className={panelClass}>
            <div className="fit-panel-hlavicka">
              <div>
                <h2>Dnešní cíl</h2>
                <span className="fit-cile-pocet">{pocetDokoncenychCilu} z 3 dokončeno</span>
              </div>
              <button
                className="fit-historie-btn"
                aria-label="Upravit cíle"
                onClick={() => setUpravujeCile((v) => !v)}
              >
                ✏️
              </button>
            </div>

            {upravujeCile && (
              <div className="fit-cile-editace">
                <label>
                  Cíl kalorií
                  <input
                    type="number"
                    min={1}
                    value={cile.cilKcal ?? ''}
                    placeholder={String(CIL_KCAL_VYCHOZI)}
                    onChange={(e) => cile.setCilKcal(e.target.value === '' ? null : Number(e.target.value))}
                  />
                </label>
                <label>
                  Cíl tréninku (min)
                  <input
                    type="number"
                    min={1}
                    value={cile.cilTreninkMin ?? ''}
                    placeholder={String(CIL_TRENINK_MIN_VYCHOZI)}
                    onChange={(e) => cile.setCilTreninkMin(e.target.value === '' ? null : Number(e.target.value))}
                  />
                </label>
                <label>
                  Tréninky týdně (nepovinné)
                  <input
                    type="number"
                    min={1}
                    value={cile.cilTreninkuTydne ?? ''}
                    placeholder="např. 3"
                    onChange={(e) => cile.setCilTreninkuTydne(e.target.value === '' ? null : Number(e.target.value))}
                  />
                </label>
                <label>
                  Cíl spánku (h)
                  <input
                    type="number"
                    min={1}
                    max={24}
                    value={spanek.cilHod ?? ''}
                    placeholder={String(CIL_SPANEK_VYCHOZI)}
                    onChange={(e) => spanek.setCilHod(e.target.value === '' ? null : Number(e.target.value))}
                  />
                </label>
              </div>
            )}

            <div className="fit-krouzky">
              <div className="fit-krouzek-wrap">
                <div
                  className="fit-krouzek fit-barva-krouzek--orange"
                  style={{ '--fit-progres': `${kcalProgres}%` } as React.CSSProperties}
                >
                  <AppIcon name="flame" size={20} />
                </div>
                <span className="fit-krouzek-nazev">{cilKcal} kcal</span>
                <span className="fit-krouzek-hodnota fit-text--orange">
                  {dnes.odhadKcal} / {cilKcal}
                </span>
              </div>

              <div className="fit-krouzek-wrap">
                <div
                  className="fit-krouzek fit-barva-krouzek--purple"
                  style={{ '--fit-progres': `${treninkProgres}%` } as React.CSSProperties}
                >
                  <AppIcon name="dumbbell" size={20} />
                </div>
                <span className="fit-krouzek-nazev">{cilTreninkMin} min</span>
                <span className="fit-krouzek-hodnota fit-text--purple">
                  {dnes.minutTreninku} / {cilTreninkMin}
                </span>
              </div>

              <div className="fit-krouzek-wrap fit-krouzek-wrap--brzy">
                <div className="fit-krouzek fit-krouzek--brzy">
                  <AppIcon name="footprints" size={20} />
                </div>
                <span className="fit-krouzek-nazev">Kroky</span>
                <span className="fit-krouzek-hodnota">Brzy</span>
              </div>

              <div className="fit-krouzek-wrap">
                <div
                  className="fit-krouzek fit-barva-krouzek--cyan"
                  style={{ '--fit-progres': `${spanekProgres}%` } as React.CSSProperties}
                >
                  <AppIcon name="moon" size={20} />
                </div>
                <span className="fit-krouzek-nazev">{cilSpanekHod} h</span>
                <span className="fit-krouzek-hodnota fit-text--cyan">
                  {spanekDnesHod ?? 0} / {cilSpanekHod}
                </span>
              </div>
            </div>

            {cile.cilTreninkuTydne !== null && (
              <div className="fit-tydenni-cil">
                {tydenniOslavaViditelna && (
                  <p className="fit-tydenni-cil-oslava" role="status">
                    🎉 Týdenní cíl splněn!
                  </p>
                )}
                <div className="fit-tydenni-cil-hlavicka">
                  <span>Tréninky tento týden</span>
                  <span>
                    {treninkovychDniZaTyden} / {cile.cilTreninkuTydne}
                  </span>
                </div>
                <div
                  className="fit-tydenni-cil-pruh"
                  role="progressbar"
                  aria-valuenow={treninkovychDniZaTyden}
                  aria-valuemin={0}
                  aria-valuemax={cile.cilTreninkuTydne}
                >
                  <div
                    className="fit-tydenni-cil-vypln"
                    style={{ width: `${Math.min(100, (treninkovychDniZaTyden / cile.cilTreninkuTydne) * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {sezeni.length > 0 && (
            <div className={panelClass}>
              <div className="fit-panel-hlavicka">
                <h2>🏆 Osobní rekordy</h2>
              </div>

              <div className="fit-rekordy-mrizka">
                <div className="fit-rekord-dlazdice">
                  <span className="fit-rekord-hodnota">{formatCasMinSek(rekordy.nejdelsiSezeniSekund)}</span>
                  <span className="fit-rekord-popis">Nejdelší sezení</span>
                </div>
                <div className="fit-rekord-dlazdice">
                  <span className="fit-rekord-hodnota">{rekordy.nejvicOpakovaniZaDen}</span>
                  <span className="fit-rekord-popis">Nejvíc opakování za den</span>
                </div>
                <div className="fit-rekord-dlazdice">
                  <span className="fit-rekord-hodnota">{serie}</span>
                  <span className="fit-rekord-popis">{plural(serie, 'den v řadě', 'dny v řadě', 'dní v řadě')}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ------------------------------------------
            SPUSTIT TRÉNINK — všechno, co "teď hned něco spustí".
            ------------------------------------------ */}
        <div className="fit-sekce">
          <div className="fs-dlazdice-sekce-hlavicka">
            <span className="fs-dlazdice-sekce-ikona fs-barva--purple">
              <AppIcon name="rocket" size={14} />
            </span>
            <h3>Spustit trénink</h3>
          </div>

          <div className={panelClass}>
            <div className="fit-panel-hlavicka">
              <h2>Rychlý trénink</h2>
              <button className="fit-zobrazit-vse" onClick={() => otevritFormCheck()}>
                Zobrazit vše ›
              </button>
            </div>

            <div className="fit-treninky-mrizka">
              <button className="fit-trenink-dlazdice" onClick={() => otevritFormCheck()}>
                <span className="fit-text--purple">
                  <AppIcon name="dumbbell" size={22} />
                </span>
                <span className="fit-trenink-nazev">Síla</span>
                <span className="fit-trenink-popis">Dřep / Klik / Výpad</span>
              </button>
              <button
                className="fit-trenink-dlazdice"
                onClick={() => setRozcvickaOtevrena(true)}
              >
                <span className="fit-text--cyan">
                  <AppIcon name="moon" size={22} />
                </span>
                <span className="fit-trenink-nazev">Mobilita</span>
                <span className="fit-trenink-popis">Rozcvička / strečink / jóga</span>
              </button>
              {[
                { nazev: 'Kardio', popis: '20 min', ikona: 'flame', barva: 'orange' },
                { nazev: 'Core', popis: '10 min', ikona: 'bar-chart', barva: 'green' },
              ].map((t) => (
                <button key={t.nazev} className="fit-trenink-dlazdice fit-trenink-dlazdice--brzy" disabled>
                  <span className={`fit-text--${t.barva}`}>
                    <AppIcon name={t.ikona} size={22} />
                  </span>
                  <span className="fit-trenink-nazev">{t.nazev}</span>
                  <span className="fit-trenink-popis">{t.popis}</span>
                  <span className="fit-trenink-brzy">Brzy</span>
                </button>
              ))}
            </div>
          </div>

          <div className={panelClass}>
            <div className="fit-panel-hlavicka">
              <div>
                <h2>🏃 Běhání a kardio</h2>
                <p>
                  {behani.sezeni.length > 0
                    ? `Celkem ${formatujVzdalenost(soucetVzdalenostiM(behani.sezeni))} · ${behani.sezeni.length} ${plural(behani.sezeni.length, 'sezení', 'sezení', 'sezení')}`
                    : 'Zatím žádné sezení — GPS sledování běhu, chůze a kola.'}
                </p>
              </div>
            </div>
            {behani.sezeni.length > 0 && (
              <p className="fit-behani-posledni">
                Poslední: {IKONA_AKTIVITY[behani.sezeni[0].typ]} {NAZEV_AKTIVITY[behani.sezeni[0].typ]} — {formatujVzdalenost(behani.sezeni[0].vzdalenostM)}
              </p>
            )}
            <button className="fit-behani-spustit" onClick={otevritBehani}>
              ▶ Spustit Běhání
            </button>
          </div>

          <div className={panelClass}>
            <div className="fit-panel-hlavicka">
              <div>
                <h2>🏋️ Posilovna</h2>
                <p>
                  {posilovna.sezeni.length > 0
                    ? `Celkem ${formatujObjem(celkovyObjem(posilovna.sezeni))} objem · ${posilovna.sezeni.length} ${plural(posilovna.sezeni.length, 'trénink', 'tréninky', 'tréninků')}`
                    : 'Zatím žádný trénink — deník vah a opakování pro cviky, co kamera neověří.'}
                </p>
              </div>
            </div>
            <button className="fit-behani-spustit" onClick={otevritPosilovnu}>
              ▶ Otevřít Posilovnu
            </button>
          </div>

          <div className={panelClass}>
            <div className="fit-panel-hlavicka">
              <h2>📋 Cvičební rutiny</h2>
            </div>

            <div className="fit-rutiny-seznam">
              {RUTINY.map((r) => (
                <div key={r.id} className="fit-rutina-radek">
                  <div className="fit-rutina-text">
                    <span className="fit-rutina-nazev">{r.nazev}</span>
                    <span className="fit-rutina-popis">{r.popis}</span>
                  </div>
                  <button className="fit-rutina-spustit" onClick={() => otevritRutinu(r)}>
                    ▶ Spustit
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ------------------------------------------
            DENNÍ NÁVYKY — plán/připomenutí/jídlo/pití, co si appka
            nechává zapisovat den co den.
            ------------------------------------------ */}
        <div className="fit-sekce">
          <div className="fs-dlazdice-sekce-hlavicka">
            <span className="fs-dlazdice-sekce-ikona fs-barva--cyan">
              <AppIcon name="calendar" size={14} />
            </span>
            <h3>Denní návyky</h3>
          </div>

          <div className={panelClass}>
            <div className="fit-panel-hlavicka">
              <div>
                <h2>📅 Cvičební plán</h2>
                {planDnes === undefined && <p>Dnes ({NAZEV_DNE[denDnes]}) není nic naplánováno.</p>}
                {planDnes === 'odpocinek' && <p>Dnes ({NAZEV_DNE[denDnes]}) je den odpočinku. 😌</p>}
                {planDnes && planDnes !== 'odpocinek' && (
                  <p>
                    Dnes ({NAZEV_DNE[denDnes]}): <strong>{NAZEV_CVIKU[planDnes]}</strong>
                  </p>
                )}
              </div>
              <button
                className="fit-historie-btn"
                aria-label="Upravit cvičební plán"
                onClick={() => setUpravujePlan((v) => !v)}
              >
                ✏️
              </button>
            </div>

            {planDnes && planDnes !== 'odpocinek' && !upravujePlan && (
              <button className="fit-plan-spustit" onClick={() => otevritFormCheck(planDnes)}>
                Spustit dnešní trénink ›
              </button>
            )}

            {upravujePlan && (
              <div className="fit-plan-editace">
                {VSECHNY_DNY.map((den) => (
                  <div key={den} className="fit-plan-radek">
                    <span className="fit-plan-den">{NAZEV_DNE[den]}</span>
                    <select
                      value={cvicebniPlan.plan[den] ?? ''}
                      onChange={(e) =>
                        cvicebniPlan.nastavDen(den, e.target.value === '' ? null : (e.target.value as HodnotaPlanu))
                      }
                    >
                      <option value="">Nenastaveno</option>
                      <option value="odpocinek">Den odpočinku</option>
                      {VSECHNY_CVIKY_PLAN.map((c) => (
                        <option key={c} value={c}>
                          {NAZEV_CVIKU[c]}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={panelClass}>
            <div className="fit-panel-hlavicka">
              <h2>🔔 Připomenutí tréninku</h2>
            </div>

            <div className="fit-pripomenuti-seznam">
              {pripomenuti.casy.map((c) => (
                <span key={c} className="fit-pripomenuti-chip">
                  {c}
                  <button aria-label={`Odebrat čas ${c}`} onClick={() => pripomenuti.odebratCas(c)}>
                    ✕
                  </button>
                </span>
              ))}
            </div>

            <div className="fit-pripomenuti-pridat">
              <input type="time" value={novyPripomenutiCas} onChange={(e) => setNovyPripomenutiCas(e.target.value)} />
              <button className="fit-jidlo-pridat-btn" onClick={() => pripomenuti.pridatCas(novyPripomenutiCas)}>
                + Přidat čas
              </button>
            </div>
          </div>

          <div className={panelClass}>
            <div className="fit-panel-hlavicka">
              <div>
                <h2>🍽️ Jídelníček</h2>
                <p>
                  Dnes snězeno: <strong>{kalorieSnezeno} kcal</strong> · spáleno cvičením: {dnes.odhadKcal} kcal
                </p>
              </div>
              <button
                className="fit-historie-btn"
                aria-label="Přidat vlastní jídlo"
                onClick={() => setPridavaJidloVlastni((v) => !v)}
              >
                <AppIcon name="plus" size={18} />
              </button>
            </div>

            <div className="fit-jidlo-rychle">
              <select value={vybranaPotravinaId} onChange={(e) => setVybranaPotravinaId(e.target.value)}>
                {POTRAVINY.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nazev} — {p.kcal} kcal
                  </option>
                ))}
              </select>
              <button className="fit-jidlo-pridat-btn" onClick={handlePridatZeSeznamu}>
                Přidat
              </button>
            </div>

            {pridavaJidloVlastni && (
              <div className="fit-jidlo-vlastni-form">
                <input
                  type="text"
                  placeholder="Název jídla"
                  value={vlastniJidloNazev}
                  onChange={(e) => setVlastniJidloNazev(e.target.value)}
                />
                <input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  placeholder="kcal"
                  value={vlastniJidloKcalText}
                  onChange={(e) => setVlastniJidloKcalText(e.target.value)}
                />
                <button className="fit-jidlo-pridat-btn" onClick={handlePridatVlastniJidlo}>
                  Přidat vlastní
                </button>
              </div>
            )}

            {jidlaDnes.length > 0 ? (
              <div className="fit-jidlo-seznam">
                {jidlaDnes.map((j) => (
                  <div key={j.id} className="fit-jidlo-radek">
                    <span className="fit-jidlo-nazev">{j.nazev}</span>
                    <span className="fit-jidlo-kcal">{j.kcal} kcal</span>
                    <button
                      className="fit-miry-smazat"
                      aria-label="Smazat jídlo"
                      onClick={() => jidelnicek.smazatJidlo(j.id)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="fit-miry-prazdno">Dnes zatím nic nezaznamenáno.</p>
            )}
          </div>

          <div className={panelClass}>
            <div className="fit-panel-hlavicka">
              <div>
                <h2>💧 Pitný režim</h2>
                <p>
                  {sklenicDnes} z {cilSklenic} {plural(cilSklenic, 'sklenice', 'sklenic', 'sklenic')} dnes
                </p>
              </div>
            </div>

            <div className="fit-voda-radek">
              <div
                className="fit-krouzek fit-barva-krouzek--cyan"
                style={{ '--fit-progres': `${vodaProgres}%` } as React.CSSProperties}
              >
                <AppIcon name="droplet" size={20} />
              </div>
              <div className="fit-voda-ovladani">
                <button
                  className="fit-voda-btn"
                  aria-label="Ubrat sklenici"
                  onClick={() => pitnyRezim.odebratSklenici(dnesniDatumJidlo)}
                >
                  −
                </button>
                <button className="fit-voda-btn fit-voda-btn--pridat" onClick={() => pitnyRezim.pridatSklenici(dnesniDatumJidlo)}>
                  + Sklenice
                </button>
              </div>
            </div>

            <label className="fit-voda-cil-pole">
              Denní cíl (sklenic)
              <input
                type="number"
                min={1}
                inputMode="numeric"
                value={pitnyRezim.cilSklenic ?? ''}
                onChange={(e) => pitnyRezim.setCilSklenic(e.target.value === '' ? null : Number(e.target.value))}
              />
            </label>
          </div>
        </div>

        {/* ------------------------------------------
            POKROK — trendy v čase a srovnání, ne "udělej něco teď".
            ------------------------------------------ */}
        <div className="fit-sekce">
          <div className="fs-dlazdice-sekce-hlavicka">
            <span className="fs-dlazdice-sekce-ikona fs-barva--green">
              <AppIcon name="trending-up" size={14} />
            </span>
            <h3>Pokrok</h3>
          </div>

          <div className={panelClass}>
            <div className="fit-panel-hlavicka">
              <div>
                <h2>📏 Tělesné míry</h2>
                {posledniVaha !== null ? (
                  <p>
                    {posledniVaha} kg{rozdilVahyText ? ` · ${rozdilVahyText}` : ''}
                    {bmi !== null && ` · BMI ${bmi} (${popisBmiKategorie(bmi)})`}
                  </p>
                ) : (
                  <p>Zatím žádný záznam</p>
                )}
              </div>
              <span className="fit-miry-hlavicka-tlacitka">
                <button
                  className="fit-historie-btn"
                  aria-label="Upravit cíle váhy a obvodu pasu"
                  onClick={() => setUpravujeCileMiry((v) => !v)}
                >
                  🎯
                </button>
                <button
                  className="fit-historie-btn"
                  aria-label="Přidat záznam tělesných měr"
                  onClick={() => setPridavaZaznamMiry((v) => !v)}
                >
                  <AppIcon name="plus" size={18} />
                </button>
              </span>
            </div>

            {upravujeCileMiry && (
              <div className="fit-cile-editace">
                <label>
                  Cíl váhy (kg)
                  <input
                    type="number"
                    min={1}
                    value={miry.cilVahaKg ?? ''}
                    placeholder="nepovinné"
                    onChange={(e) => miry.setCilVahaKg(e.target.value === '' ? null : Number(e.target.value))}
                  />
                </label>
                <label>
                  Cíl obvodu pasu (cm)
                  <input
                    type="number"
                    min={1}
                    value={miry.cilObvodPasuCm ?? ''}
                    placeholder="nepovinné"
                    onChange={(e) => miry.setCilObvodPasuCm(e.target.value === '' ? null : Number(e.target.value))}
                  />
                </label>
              </div>
            )}

            {pridavaZaznamMiry && (
              <div className="fit-miry-form">
                <label>
                  Datum
                  <input
                    type="date"
                    value={novyDatumMiry}
                    onChange={(e) => setNovyDatumMiry(e.target.value)}
                  />
                </label>
                <label>
                  Váha (kg)
                  <input
                    type="number"
                    min={1}
                    step="0.1"
                    inputMode="decimal"
                    value={novaVahaText}
                    onChange={(e) => setNovaVahaText(e.target.value)}
                    placeholder="např. 72.5"
                  />
                </label>
                <label>
                  Obvod pasu (cm, nepovinné)
                  <input
                    type="number"
                    min={1}
                    inputMode="numeric"
                    value={novyObvodText}
                    onChange={(e) => setNovyObvodText(e.target.value)}
                    placeholder="nepovinné"
                  />
                </label>
                <label>
                  Hrudník (cm, nepovinné)
                  <input
                    type="number"
                    min={1}
                    inputMode="numeric"
                    value={novyHrudnikText}
                    onChange={(e) => setNovyHrudnikText(e.target.value)}
                    placeholder="nepovinné"
                  />
                </label>
                <label>
                  Boky (cm, nepovinné)
                  <input
                    type="number"
                    min={1}
                    inputMode="numeric"
                    value={novyBokyText}
                    onChange={(e) => setNovyBokyText(e.target.value)}
                    placeholder="nepovinné"
                  />
                </label>
                <label>
                  Paže (cm, nepovinné)
                  <input
                    type="number"
                    min={1}
                    inputMode="numeric"
                    value={novyPazeText}
                    onChange={(e) => setNovyPazeText(e.target.value)}
                    placeholder="nepovinné"
                  />
                </label>
                <label>
                  Tělesný tuk (%, nepovinné)
                  <input
                    type="number"
                    min={1}
                    max={100}
                    step="0.1"
                    inputMode="decimal"
                    value={novyTukText}
                    onChange={(e) => setNovyTukText(e.target.value)}
                    placeholder="nepovinné"
                  />
                </label>
                <button className="fit-miry-ulozit" onClick={handleUlozitZaznamMiry}>
                  Uložit záznam
                </button>

                <label className="fit-miry-vyska-pole">
                  Výška (cm) — pro výpočet BMI, stačí zadat jednou
                  <span className="fit-miry-vyska-radek">
                    <input
                      type="number"
                      min={1}
                      inputMode="numeric"
                      value={novaVyskaText || (miry.vyskaCm ?? '')}
                      onChange={(e) => setNovaVyskaText(e.target.value)}
                      placeholder="např. 175"
                    />
                    <button className="fit-miry-vyska-ulozit" onClick={handleUlozitVysku}>
                      Uložit výšku
                    </button>
                  </span>
                </label>
              </div>
            )}

            {(stavCileVahy !== null || stavCileObvoduPasu !== null) && (
              <div className="fit-miry-cile">
                {stavCileVahy !== null && (
                  <div className="fit-tydenni-cil">
                    <div className="fit-tydenni-cil-hlavicka">
                      <span>Cíl váhy</span>
                      <span>
                        {stavCileVahy.aktualniHodnota} / {stavCileVahy.cilHodnota} kg
                      </span>
                    </div>
                    <div
                      className="fit-tydenni-cil-pruh"
                      role="progressbar"
                      aria-valuenow={stavCileVahy.procenta}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div className="fit-tydenni-cil-vypln" style={{ width: `${stavCileVahy.procenta}%` }} />
                    </div>
                  </div>
                )}
                {stavCileObvoduPasu !== null && (
                  <div className="fit-tydenni-cil">
                    <div className="fit-tydenni-cil-hlavicka">
                      <span>Cíl obvodu pasu</span>
                      <span>
                        {stavCileObvoduPasu.aktualniHodnota} / {stavCileObvoduPasu.cilHodnota} cm
                      </span>
                    </div>
                    <div
                      className="fit-tydenni-cil-pruh"
                      role="progressbar"
                      aria-valuenow={stavCileObvoduPasu.procenta}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div className="fit-tydenni-cil-vypln" style={{ width: `${stavCileObvoduPasu.procenta}%` }} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {grafVahy.length > 1 && (
              <div className="fit-graf" role="img" aria-label="Sloupcový graf váhy v čase">
                {grafVahy.map((b) => (
                  <div key={b.id} className="fit-graf-sloupec-wrap">
                    <div
                      className="fit-graf-sloupec fit-graf-sloupec--aktivni"
                      style={{ height: `${b.vyskaProcent}%` }}
                      title={`${formatDatumMiry(b.datum)}: ${b.vahaKg} kg`}
                    />
                  </div>
                ))}
              </div>
            )}

            {miry.zaznamy.length > 0 && (
              <div className="fit-miry-seznam">
                {zaznamySerazene
                  .slice(-5)
                  .reverse()
                  .map((z) => (
                    <div key={z.id} className="fit-miry-radek">
                      <span className="fit-miry-datum">{formatDatumMiry(z.datum)}</span>
                      <span className="fit-miry-hodnoty">{castiZaznamu(z)}</span>
                      <button
                        className="fit-miry-smazat"
                        aria-label="Smazat záznam"
                        onClick={() => handleSmazatZaznamMiry(z.id)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
              </div>
            )}

            {miry.zaznamy.length === 0 && !pridavaZaznamMiry && (
              <p className="fit-miry-prazdno">Zatím žádný záznam. Přidej první váhu tlačítkem výš.</p>
            )}
          </div>

          <div className={panelClass}>
            <div className="fit-panel-hlavicka">
              <h2>Aktivita za 14 dní</h2>
            </div>

            <div className="fit-graf" role="img" aria-label="Sloupcový graf tréninkových minut za posledních 14 dní">
              {aktivita.map((d) => (
                <div key={d.datum} className="fit-graf-sloupec-wrap">
                  <div
                    className={`fit-graf-sloupec ${d.minutTreninku > 0 ? 'fit-graf-sloupec--aktivni' : ''}`}
                    style={{ height: `${Math.max(6, (d.minutTreninku / maxMinutAktivity) * 100)}%` }}
                    title={`${new Date(d.datum).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' })}: ${d.minutTreninku} min`}
                  />
                </div>
              ))}
            </div>

            <div className="fit-akce-radek">
              <button className="fit-sdilet-btn" onClick={handleSdiletTyden}>
                📤 Sdílet týden
              </button>
              <button className="fit-stahnout-btn" onClick={handleStahnoutReport}>
                ⬇ Stáhnout report
              </button>
            </div>
          </div>

          <div className={panelClass}>
            <div className="fit-panel-hlavicka">
              <div>
                <h2>🏆 Žebříček</h2>
                <p>Porovnej si celkové fitness XP s ostatními</p>
              </div>
            </div>
            <button type="button" className="fit-otevrit-zebricek-btn" onClick={() => setZebricekOtevren(true)}>
              Otevřít žebříček →
            </button>
          </div>
        </div>

        {/* ------------------------------------------
            VIP — všechny čtyři panely za cosmetics.premium.
            ------------------------------------------ */}
        <div className="fit-sekce">
          <div className="fs-dlazdice-sekce-hlavicka">
            <span className="fs-dlazdice-sekce-ikona fs-barva--gold">
              <AppIcon name="sparkles" size={14} />
            </span>
            <h3>VIP</h3>
          </div>

          <div className={panelClass}>
            <div className="fit-panel-hlavicka">
              <div>
                <h2>👑 VIP: Doporučené jídelníčky</h2>
                <p>Podle tvého kalorického cíle</p>
              </div>
            </div>

            {smiVip ? (
              <div className="fit-jidelnicky-seznam">
                {DOPORUCENE_JIDELNICKY.map((j) => (
                  <div
                    key={j.id}
                    className={`fit-jidelnicek-karta ${j.id === doporucenyJidelnicek.id ? 'fit-jidelnicek-karta--doporuceny' : ''}`}
                  >
                    <div className="fit-jidelnicek-hlavicka">
                      <span>
                        {j.nazev}
                        {j.id === doporucenyJidelnicek.id && <span className="fit-jidelnicek-znacka"> · pro tebe</span>}
                      </span>
                      <span>{j.cilovaKcal} kcal</span>
                    </div>
                    <ul className="fit-jidelnicek-polozky">
                      {j.polozky.map((p, i) => (
                        <li key={i}>
                          <span>{p.nazev}</span>
                          <span>{p.kcal} kcal</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <button
                className="fit-vip-zamceno"
                onClick={() => setVipZprava('Doporučené jídelníčky jsou jen pro VIP.')}
              >
                🔒 Odemkni doporučené jídelníčky s VIP
              </button>
            )}
          </div>

          <div className={panelClass}>
            <div className="fit-panel-hlavicka">
              <h2>👑 VIP: Měsíční trend</h2>
            </div>

            {smiVip ? (
              <div className="fit-mesicni-srovnani">
                <div className="fit-mesicni-radek">
                  <span>Kalorie (odhad)</span>
                  <span>
                    {mesicniSrovnani.tentoMesicKcal} kcal{' '}
                    <small>({formatujRozdilMesic(mesicniSrovnani.tentoMesicKcal, mesicniSrovnani.minulyMesicKcal)})</small>
                  </span>
                </div>
                <div className="fit-mesicni-radek">
                  <span>Trénink</span>
                  <span>
                    {mesicniSrovnani.tentoMesicMin} min{' '}
                    <small>({formatujRozdilMesic(mesicniSrovnani.tentoMesicMin, mesicniSrovnani.minulyMesicMin)})</small>
                  </span>
                </div>
                <div className="fit-mesicni-radek">
                  <span>Tréninkové dny</span>
                  <span>
                    {mesicniSrovnani.tentoMesicDni}{' '}
                    <small>({formatujRozdilMesic(mesicniSrovnani.tentoMesicDni, mesicniSrovnani.minulyMesicDni)})</small>
                  </span>
                </div>
              </div>
            ) : (
              <button className="fit-vip-zamceno" onClick={() => setVipZprava('Měsíční trend je jen pro VIP.')}>
                🔒 Odemkni měsíční trend s VIP
              </button>
            )}
          </div>

          <div className={panelClass}>
            <div className="fit-panel-hlavicka">
              <h2>👑 VIP: Trenérský tip dne</h2>
            </div>

            {smiVip ? (
              <p className="fit-tip-dne">
                <AppIcon name="lightbulb" size={16} /> {tipDne()}
              </p>
            ) : (
              <button className="fit-vip-zamceno" onClick={() => setVipZprava('Denní trenérský tip je jen pro VIP.')}>
                🔒 Odemkni denní tip s VIP
              </button>
            )}
          </div>
        </div>
      </FlagshipShell>

      {appsOtevrene && <NastrojeSheet nadpis="Apps" nastroje={nastroje} onZavrit={() => setAppsOtevrene(false)} />}
      {rozcvickaOtevrena && <RozcvickaCasovac onZavrit={() => setRozcvickaOtevrena(false)} />}
      {zebricekOtevren && <Zebricek onZavrit={() => setZebricekOtevren(false)} />}
    </>
  )
}

export default FitnessRoomModule
