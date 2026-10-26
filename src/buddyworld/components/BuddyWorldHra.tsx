import { CampaignPanel, Achievements } from './CampaignPanel'
import { BuddyPanel } from './BuddyPanel'
import { GameSettings } from './GameSettings'
import { CAMPAIGN, currentMission, useAdventureStore, type CampaignProgress } from '../adventure'
import { useBuddyWorldStore } from '../useBuddyWorldStore'
import { herniCas, herniDatum, jePauza, nastavPauzu } from '../gameClock'
import { playCue } from '../audio'
import { SezonaPanel } from './SezonaPanel'
import { type Pokrok } from '../milestones'
import { oznamVizualniFaziHlidace } from '../scene/hlidacRuin3D'
import { novyRealTimeHlidac, utokVRealnemCase, uhybVRealnemCase, tikHlidace, hlidacVaruje } from '../hlidacRealtime'
import { HLIDAC_MAX_HP, vDosahuHlidace, nactiHlidace, ulozHlidace } from '../hlidacRuin'
import { FRAGMENTY_RUIN, fragmentVDosahu, nactiFragmentyRuin, ulozFragmentyRuin } from '../fragmentyRuin'
import { RUNY, RUNOVE_NAZVY, vDosahuRuin, nactiRuiny, ulozRuiny, stiskniRunu, type RunaId } from '../ruinovaHadanka'
import { LESNI_OBJEVY, nejblizsiLesniObjev, nactiLesniObjevy, ulozLesniObjevy } from '../magickyLesObjevy'
import { MIRA_CIL, MIRA_STAVBA_ODMENA, fazeMiraStavby, pocetMiraStaveb } from '../miraStavba'
import { KronikaSveta } from './KronikaSveta'
import { elaraFaze, elaraText, zapisElaraObjev } from '../elaraPribeh'
import { KAEL_VYCVIK_ODMENA, pocetVycvikuV2, stavVycvikuV2 } from '../kaelTrainingV2'
import { nactiRozhodnuti, ulozRozhodnuti, reakceNaRozhodnuti } from '../npcDecisionMemory'
import { volbyProNpc, odpovedNpc } from '../npcDialogChoices'
import { CIL_POMOCI, ODMENA_POMOCI, nactiPomoc, ulozPomoc, prijmiPomoc, navstivObyvatele, odevzdejPomoc, type StavPomoci } from '../pomocObyvateli'
import { BODY_STEZKY, ODMENA_STEZKY, nactiStezku, ulozStezku, prijmiStezku, navstivBod, odevzdejStezku, type StavStezky } from '../vedlejsiNastenka'
import { muzeOtevritNastenku, vzdalenostOdNastenky, polozkyNastenky } from '../questBoard'
import { krokyPrvniVypravy, dalsiDemoKrok } from '../demoPruchod'
import { rezervujOdmenu, dokonceniOdmeny } from '../rewardJournal'
import { loadQuest, saveQuest, validQuestShape } from '../questSave'
import { diagnostikaOdmen } from '../rewardDiagnostics'
import { KRYSTALOVY_STRAZCE_HP, KRYSTALOVY_HRAC_HP, KRYSTALOVY_ODMENA, KRYSTALOVY_ARENA_DOSAH, hracDosahneNaBosse, poziceKristalovehoStrazce, vzdalenostOdKristaloveAreny, lzeVyzvatKristalovehoStrazce, novyKristalovySouboj, zasahniKristalovehoStrazce, uhniKristalovemuStrazci, tikKristalovehoStrazce, kristalovyUtokVaruje, type KristalovySouboj } from '../data/kristalovyStrazce'
import { nactiTretiVypravu, dalsiTretiVyprava, popisTreti, TRETI_ODMENA, type TretiVyprava, type TretiAkce } from '../tretiVyprava'
import { nactiDruhouVypravu, dalsiDruhaVyprava, popisDruhe, DRUHA_ODMENA, type DruhaVyprava, type DruhaAkce } from '../druhaVyprava'
import { oblastNaPozici } from '../data/oblasti'
import { KristalovaVypravaUI } from './KristalovaVypravaUI'
import './KristalovaVypravaUI.css'
import { nactiKristalovouVypravu, zpracujVypravu, VYPRAVA_ODMENA, type KristalovaVyprava, type VypravaAkce, synchronizujDriveSebraneUlomky } from '../kristalovaVyprava'
import { ULOMKY_MYTINY, ODMENA_ULOMKU, nejblizsiUlomek, nactiSebraneUlomky, ulozSebraneUlomky } from '../data/ulomkyMytiny'
import { BRANY_REGIONU, DOSAH_BRANY } from '../data/prechodyRegionu'
import { nactiGrafickouKvalitu, ulozGrafickouKvalitu, PROFILY_KVALITY, type GrafickaKvalita } from '../scene/grafickaKvalita'
import { novySouboj, utokHrace, kryjSe, uhni, tikSouboje, lzeVyzvatStrazce, vzdalenostOdStrazce, DOSAH_UTOKU, polomerUderu, stavVarovani, zbyvaDoUtoku, type StavSouboje, STRAZCE_MAX_HP, HRAC_MAX_HP } from '../data/chramovyBoss'
import { CHRAMOVE_RUNY, dalsiRuna, DOSAH_RUNY, ODMENA_PODZEMI, PODZEMI_PRIBEH } from '../data/chramovePodzemi'
import { CHRAM_POZICE, CHRAM_DOSAH, CHRAM_ODMENA, CHRAM_PRIBEH, vzdalenostOdChramu } from '../data/chramStrazcu'
import { TRI_PECETE_ID, TRI_PECETE_ODMENA, TRI_PECETE_PRIBEH, jsouPeceteAktivni } from '../data/triPecete'
import { NPC_VYPRAVY, stavVypravy } from '../npcVypravy'
import { udalostProObyvatele } from '../npcUdalosti'
import { urovenDůvěry, textDůvěry, ODMENA_VZTAHU } from '../npcVztahy'
import { vedlejsiUkolyObyvatele, rozhovorObyvatele, stavVedlejsihoUkolu } from '../npcInteractions'
import { RELIKVIE } from '../data/relikvie'
import { OBLASTI_SVETA } from '../data/oblasti'
import { Minimapa } from './Minimapa'
import { PribehovyDenik } from './PribehovyDenik'
import { scenaUkolu } from '../storyScenes'
import { oblastUkolu, cilNavigace, navigacniUdaje } from '../data/navigace'
import { aktivniUkol } from '../questTracker'
import { Zbran, zbranJeDostupna } from '../combat/weapons'
import { buddyElementPoskozeni } from '../combat/buddySkills'
import React, { useEffect, useRef, useState } from 'react'
import { useBuddyWorldScene } from '../scene/useBuddyWorldScene'
import { VirtualniJoystick } from '@/game/components/VirtualniJoystick'
import { HUD } from './HUD'
import { SurfaceThemeScope } from '@/features/appearance/SurfaceAppearance'
import { AktivniUkolHud } from './AktivniUkolHud'
import { useVillageStore } from '../useVillageStore'
import { ukolProObyvatele, stavUkolu } from '../npcQuests'
import { OsadaPanel } from './OsadaPanel'
import { MaskotDef, BuddyWorldHracStav } from '../types'
import { BossDef } from '../data/bossove'

// ==========================================
// Buddy World — "hra" obrazovka appka vytáhla do SAMOSTATNÉ komponenty
// ze stejného důvodu, co appka už jednou vyřešila u Buddyho Trhu
// (useCtyriKralovstviScene.ts/HerniDeska): useBuddyWorldScene() si
// svůj Threejs renderer/scénu/RAF smyčku postaví jen JEDNOU, uvnitř
// useEffectu s pevnou závislostí [maskot, bossDef] — a appčin
// canvas-container div (.bw-arena-canvas) existuje v DOMu jen na téhle
// obrazovce, ne na appčině dřívější obrazovce výběru maskota.
//
// Dřív appka volala useBuddyWorldScene() přímo z BuddyWorldModule.tsx,
// co je namountovaný od prvního appčina vykreslení (appčina obrazovka
// 'vyber') — appčin useEffect se tak spustil JEDNOU, s
// containerRef.current === null (appčin canvas div na 'vyber'
// obrazovce vůbec neexistuje), tiše appku vrátil (`if (!container)
// return`) a appka ho PAK UŽ NIKDY ZNOVU NESPUSTILA: appčin maskot i
// bossDef jsou appkou stabilní reference (maskotPodleId/bossPodleId
// appku vrací přímo appčin objekt z appčina modulového pole, ne nový
// klon), appka proto React effect depsů nikdy "nezmění identitu", i
// když appka obrazovku přepne na 'hra'. Výsledek na reálném appčině
// telefonu: renderer/scéna/RAF smyčka appku nikdy nevznikly, appčin
// canvas zůstal prázdný div a appka viděla jen zamrzlý, appkou
// nehýbající se obraz — appčina chyba appku nikdy neukázala v appčině
// sandboxu, protože appčina dřívější komponentová ověřovací appka
// mountovala appku už přímo na 'hra', ne přes appčin skutečný tok
// (appka mountuje nejdřív na 'vyber', appka přepne teprve po klikutí).
//
// Fix: appka tuhle komponentu namountuje poprvé přesně tehdy, kdy
// appka přepne na 'hra' — appčin canvas div v tu chvíli UŽ existuje
// (React appku připojí ref dřív, než appka spustí efekty téhož
// commitu), takže appčin useBuddyWorldScene() efekt teď poprvé běží
// se skutečným, správně rozměřeným containerem.
// ==========================================

const PANEL_NAMES = {campaign:'Příběh', quests:'Deník', world:'Svět', town:'Osada', buddy:'Buddy', achievements:'Úspěchy', settings:'Nastavení', npc:'Rozhovor'}
const PANEL_ICONS = {campaign:'✦', quests:'☷', world:'◎', town:'⌂', buddy:'♡', achievements:'✧', settings:'⚙'}
function lehciSouboj<T extends {hracHp:number;faze:string}>(before:T,after:T):T {
  if(after.hracHp>=before.hracHp)return after
  const hp=Math.max(0,before.hracHp-Math.ceil((before.hracHp-after.hracHp)*(useAdventureStore.getState().difficulty==='pribehova'?.55:1)*(useVillageStore.getState().inventar.amulet>0?.9:1)))
  return {...after,hracHp:hp,faze:hp<=0?'prohra':after.faze==='prohra'?'boj':after.faze}
}
function trapFocus(e:React.KeyboardEvent<HTMLElement>) {
  if(e.key!=='Tab')return
  const items=Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),input:not([hidden]),select,textarea,summary,[tabindex="0"]')).filter(x=>x.getClientRects().length>0)
  const first=items[0],last=items[items.length-1]
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}
}

interface Props {
  maskot: MaskotDef
  bossDef: BossDef
  pocatecniHracStav: BuddyWorldHracStav
  onZabitiNepritele: (xpOdmena: number) => void
  onZabitiBosse: (xpOdmena: number) => void
  onPostupZmena: (level: number, xp: number) => void
  onOdmenaVypravy: (xp: number) => void
  onZpet: () => void
  // v47 — appka tenhle prop přidala, aby appčin nový FrontierGame (hlavní
  // appčina hra od téhle dodávky) mohl appce otevřít tuhle PŮVODNÍ appku
  // jen jako "osadu/kroniku", bez appčiny vlastní, nové kampaně (campaign
  // panel) nad ní — appčin BuddyWorldModule.tsx appku takhle volá přesně
  // tehdy, když appka přes FrontierGame's onVillage zvolí appčinu starou
  // appku, ne appčinu novou. Appka to řeší jen appčiným omezením, které
  // appčiny tři panely se appce vůbec ukážou (town/buddy/settings), ne
  // novým appčiným stavem.
  villageOnly?: boolean
}

export const BuddyWorldHra: React.FC<Props> = ({
  maskot,
  bossDef,
  pocatecniHracStav,
  onZabitiNepritele,
  onZabitiBosse,
  onPostupZmena,
  onOdmenaVypravy,
  onZpet,
  villageOnly = false,
}) => {
  const [panel, setPanel] = useState<'campaign'|'quests'|'world'|'town'|'buddy'|'achievements'|'settings'|'npc'|null>(villageOnly ? 'town' : 'campaign')
  const adventure = useAdventureStore()
  const mission = currentMission(adventure.campaign)
  const [toast, setToast] = useState('')
  const [bossCooldown, setBossCooldown] = useState(0)
  const bossBuddyRef = useRef(-Infinity)
  const [kristalovaVyprava, setKristalovaVyprava] = useState<KristalovaVyprava>(() => {
    return loadQuest('buddyworld-ztracene-svetlo-v1', nactiKristalovouVypravu, localStorage, validQuestShape)
  })
  // Quest rewards are guarded by a durable claim marker written BEFORE any side effects.
  // This is at-most-once locally, not a cross-store atomic transaction.
  const KLIC_ODMENY = 'buddyworld-ztracene-svetlo-odmena-v1'
  const vypravaRef = useRef(kristalovaVyprava)
  vypravaRef.current = kristalovaVyprava
  const vypravaAkce = (akce: VypravaAkce) => {
    const pred = vypravaRef.current
    let dalsi = zpracujVypravu(pred, akce)
    if (akce.type === 'zahajit') dalsi = synchronizujDriveSebraneUlomky(dalsi, sebraneUlomkyRef.current)
    if (dalsi === pred) return
    vypravaRef.current = dalsi
    setKristalovaVyprava(dalsi)
    const ulozeno = saveQuest('buddyworld-ztracene-svetlo-v1', dalsi, localStorage)
    if (!ulozeno) { vypravaRef.current = pred; setKristalovaVyprava(pred); return }
    if (!pred.odmenaPrevzata && dalsi.odmenaPrevzata) {
      if (!ulozeno) return // Nepřipisovat odměnu bez trvale uloženého dokončení.
      if (!rezervujOdmenu(localStorage, KLIC_ODMENY)) return
      useVillageStore.setState(stav => ({
        drevo: Math.min(1_000_000, stav.drevo + VYPRAVA_ODMENA.drevo),
        kamen: Math.min(1_000_000, stav.kamen + VYPRAVA_ODMENA.kamen),
        krystaly: Math.min(1_000_000, stav.krystaly + VYPRAVA_ODMENA.krystaly),
      }))
      useBuddyWorldStore.getState().pridejXp(VYPRAVA_ODMENA.xp, 'crystal:1'); onOdmenaVypravy(VYPRAVA_ODMENA.xp)
      dokonceniOdmeny(localStorage, KLIC_ODMENY)
    }
  }
  const [druhaVyprava, setDruhaVyprava] = useState<DruhaVyprava>(() => {
    return loadQuest('buddyworld-ozveny-krystalu-v1', nactiDruhouVypravu, localStorage, validQuestShape)
  })
  const druhaRef = useRef(druhaVyprava)
  druhaRef.current = druhaVyprava
  const druhaAkce = (akce: DruhaAkce) => {
    const pred = druhaRef.current
    const dalsi = dalsiDruhaVyprava(pred, akce)
    if (dalsi === pred) return
    druhaRef.current = dalsi
    setDruhaVyprava(dalsi)
    const ulozeno = saveQuest('buddyworld-ozveny-krystalu-v1', dalsi, localStorage)
    if (!ulozeno) { druhaRef.current = pred; setDruhaVyprava(pred); return }
    if (!pred.odmenaPrevzata && dalsi.odmenaPrevzata) {
      if (!ulozeno) return // Nepřipisovat odměnu bez trvale uloženého dokončení.
      if (!rezervujOdmenu(localStorage, 'buddyworld-ozveny-krystalu-odmena-v1')) return
      useVillageStore.setState(stav => ({
        drevo: Math.min(1_000_000, stav.drevo + DRUHA_ODMENA.drevo),
        kamen: Math.min(1_000_000, stav.kamen + DRUHA_ODMENA.kamen),
        krystaly: Math.min(1_000_000, stav.krystaly + DRUHA_ODMENA.krystaly),
      }))
      useBuddyWorldStore.getState().pridejXp(DRUHA_ODMENA.xp, 'crystal:2'); onOdmenaVypravy(DRUHA_ODMENA.xp)
      dokonceniOdmeny(localStorage, 'buddyworld-ozveny-krystalu-odmena-v1')
    }
  }
  useEffect(() => {
    if (kristalovaVyprava.faze === 'dokoncena') druhaAkce({ type: 'odemknout' })
  }, [kristalovaVyprava.faze])
  const [tretiVyprava, setTretiVyprava] = useState<TretiVyprava>(() => {
    return loadQuest('buddyworld-srdce-mytiny-v1', nactiTretiVypravu, localStorage, validQuestShape)
  })
  const tretiRef = useRef(tretiVyprava)
  tretiRef.current = tretiVyprava
  const tretiAkce = (akce: TretiAkce) => {
    const pred = tretiRef.current
    const dalsi = dalsiTretiVyprava(pred, akce)
    if (dalsi === pred) return
    tretiRef.current = dalsi
    setTretiVyprava(dalsi)
    const ulozeno = saveQuest('buddyworld-srdce-mytiny-v1', dalsi, localStorage)
    if (!ulozeno) { tretiRef.current = pred; setTretiVyprava(pred); return }
    if (!pred.odmenaPrevzata && dalsi.odmenaPrevzata) {
      if (!ulozeno) return // Nepřipisovat odměnu bez trvale uloženého dokončení.
      if (!rezervujOdmenu(localStorage, 'buddyworld-srdce-mytiny-odmena-v1')) return
      useVillageStore.setState(stav => ({
        drevo: Math.min(1_000_000, stav.drevo + TRETI_ODMENA.drevo),
        kamen: Math.min(1_000_000, stav.kamen + TRETI_ODMENA.kamen),
        krystaly: Math.min(1_000_000, stav.krystaly + TRETI_ODMENA.krystaly),
      }))
      useBuddyWorldStore.getState().pridejXp(TRETI_ODMENA.xp, 'crystal:3'); onOdmenaVypravy(TRETI_ODMENA.xp)
      dokonceniOdmeny(localStorage, 'buddyworld-srdce-mytiny-odmena-v1')
    }
  }
  useEffect(() => {
    if (druhaVyprava.faze === 'dokoncena') tretiAkce({ type: 'odemknout' })
  }, [druhaVyprava.faze])
  const [sebraneUlomky, setSebraneUlomky] = useState<string[]>([])
  const sebraneUlomkyRef = useRef<string[]>([])
  sebraneUlomkyRef.current = sebraneUlomky
  useEffect(() => {
    const sebrane = nactiSebraneUlomky()
    sebraneUlomkyRef.current = sebrane
    setSebraneUlomky(sebrane)
    const migrovano = synchronizujDriveSebraneUlomky(vypravaRef.current, sebrane)
    if (migrovano !== vypravaRef.current) {
      vypravaRef.current = migrovano
      setKristalovaVyprava(migrovano)
      saveQuest('buddyworld-ztracene-svetlo-v1', migrovano, localStorage)
    }
  }, [])
  const [grafickaKvalita, setGrafickaKvalita] = useState<GrafickaKvalita>('vyvazeny')
  useEffect(() => { setGrafickaKvalita(nactiGrafickouKvalitu()) }, [])
  useEffect(() => {
    const varovani = diagnostikaOdmen(localStorage)
    if (varovani.length) console.warn('[Buddy World] Kontrola konzistence odměn:', varovani)
  }, [])
  const [kristalovyBossPorazen, setKristalovyBossPorazen] = useState<boolean>(() => {
    try { return localStorage.getItem('buddyworld-kristalovy-strazce-v1') === 'claimed' } catch { return false }
  })
  const [kristalovySouboj, setKristalovySouboj] = useState<KristalovySouboj | null>(null)
  const kristalovySoubojRef = useRef<KristalovySouboj | null>(null)
  kristalovySoubojRef.current = kristalovySouboj
  const [kristalovyCas, setKristalovyCas] = useState(() => herniDatum())
  useEffect(() => {
    if (kristalovySouboj?.faze !== 'boj') return
    const timer = window.setInterval(() => {
      const ted = herniDatum()
      setKristalovyCas(ted)
      if (!jePauza()) setKristalovySouboj(pred => pred ? lehciSouboj(pred, tikKristalovehoStrazce(pred, ted, poziceHraceRef.current)) : null)
    }, 150)
    return () => window.clearInterval(timer)
  }, [kristalovySouboj?.faze])
  useEffect(() => {
    if (kristalovySouboj?.faze !== 'vyhra' || kristalovyBossPorazen) return
    try {
      const klic = 'buddyworld-kristalovy-strazce-v1'
      if (localStorage.getItem(klic) === 'claimed') { setKristalovyBossPorazen(true); return }
      localStorage.setItem(klic, 'claimed')
      if (localStorage.getItem(klic) !== 'claimed') return
    } catch { return } // fail closed: at-most-once reward, not an atomic transaction
    setKristalovyBossPorazen(true)
    useVillageStore.setState(stav => ({
      kamen: Math.min(1_000_000, stav.kamen + KRYSTALOVY_ODMENA.kamen),
      krystaly: Math.min(1_000_000, stav.krystaly + KRYSTALOVY_ODMENA.krystaly),
    }))
    useBuddyWorldStore.getState().pridejXp(KRYSTALOVY_ODMENA.xp, 'boss:crystal'); onZabitiBosse(0); onOdmenaVypravy(KRYSTALOVY_ODMENA.xp)
  }, [kristalovySouboj?.faze, kristalovyBossPorazen, onOdmenaVypravy])
  const [soubojStrazce, setSoubojStrazce] = useState<StavSouboje | null>(null)
  // Stabilní reference propojuje panelový souboj s 3D vizualizací bez restartu rendereru.
  const soubojStrazceRef = useRef<StavSouboje | null>(null)
  soubojStrazceRef.current = soubojStrazce
  const [vyhraZapsana, setVyhraZapsana] = useState(false)
  const [vybranaZbran, setVybranaZbran] = useState<Zbran>('mec')
  const [navigaceId, setNavigaceId] = useState<string | null>(null)
  const { containerRef, selhalo, nastavJoystick, utocit, pouzijBuddySchopnost, buddySkillCooldown, zvolZbran, obranit, sebrat, postavit, presunout, potvrditStavbu, zrusitNahled, otocitNahled, nahledPlatny, vyzvatBosse, obnovitPoSmrti, hud, blizkyObyvatel, poziceHrace, projdiBranou, odpocinout } = useBuddyWorldScene({
    maskot,
    bossDef,
    soubojStrazceRef,
    kristalovySoubojRef,
    sebraneUlomkyRef,
    pocatecniHracStav,
    onZabitiNepritele: (xp, info) => {
      onZabitiNepritele(xp)
      if (info?.oblastId === 'kristalova-mytina') vypravaAkce({ type: 'porazit_nepritele', id: info.id, region: 'kristalova_mytina' })
      if (info?.oblastId === 'kristalova-mytina') druhaAkce({ type: 'porazit', id: info.id, region: 'kristalova_mytina' })
      if (info?.oblastId === 'kristalova-mytina') tretiAkce({ type: 'porazit', id: info.id, region: 'kristalova_mytina' })
    },
    onZabitiBosse,
  })

  // v6.8: Hlavní tlačítka HUD ovládají přímo aktivní 3D souboj.
  // Bez aktivního bosse zůstává původní boj proti běžným nepřátelům.
  const utokVeSvete = () => {
    if (jePauza() || hud.mrtvyHrac) return
    if (adventure.sound) playCue('attack')
    if (soubojStrazceRef.current?.faze === 'boj') {setSoubojStrazce(s=>s?utokHrace(s,herniDatum(),poziceHraceRef.current):null);return}
    if (hlidacOdemcen && !hlidacRuin.porazen && vDosahuHlidace(poziceHraceRef.current)) {utocNaHlidace();return}
    if (kristalovySoubojRef.current?.faze === 'boj') {
      const ted = herniDatum()
      setKristalovySouboj(pred => pred ? zasahniKristalovehoStrazce(pred, ted, poziceHraceRef.current) : null)
      return
    }
    utocit()
  }
  const uhybVeSvete = () => {
    if (jePauza() || hud.mrtvyHrac) return
    if (adventure.sound) playCue('defend')
    if (soubojStrazceRef.current?.faze === 'boj') {setSoubojStrazce(s=>s?uhni(s,herniDatum()):null);return}
    if (hlidacOdemcen && !hlidacRuin.porazen && vDosahuHlidace(poziceHraceRef.current)) {uhybPredHlidacem();return}
    if (kristalovySoubojRef.current?.faze === 'boj') {
      setKristalovySouboj(pred => pred ? uhniKristalovemuStrazci(pred, herniDatum()) : null)
      return
    }
    obranit()
  }

  const [stavRuin, setStavRuin] = useState(() => nactiRuiny())
  const [zpravaRuin, setZpravaRuin] = useState('')
  const aktivujRunuRuin = (id: RunaId) => {
    if (hud.mrtvyHrac || !vDosahuRuin(poziceHraceRef.current)) return
    const dalsi = stiskniRunu(stavRuin, id)
    if (!ulozRuiny(dalsi)) { setZpravaRuin('Postup se nepodařilo uložit.'); return }
    setStavRuin(dalsi)
    setZpravaRuin(dalsi.dokonceno ? '🏛️ Oltář odhalil vzpomínku na dávné strážce.' : dalsi.poradi.length ? 'Runa se rozsvítila.' : 'Nesprávná runa. Symboly pohasly.')
  }
  const [fragmentyRuin, setFragmentyRuin] = useState(() => nactiFragmentyRuin())
  const [zpravaFragmenty, setZpravaFragmenty] = useState('')
  const fragmentRuinVDosahu = fragmentVDosahu(poziceHrace, fragmentyRuin, stavRuin.dokonceno)
  const seberFragmentRuin = () => {
    if (hud.mrtvyHrac || !stavRuin.dokonceno) return
    const nalezeny = fragmentVDosahu(poziceHraceRef.current, fragmentyRuin, true)
    if (!nalezeny) return
    const dalsi = [...fragmentyRuin, nalezeny.id]
    if (!ulozFragmentyRuin(dalsi)) { setZpravaFragmenty('Fragment se nepodařilo uložit.'); return }
    setFragmentyRuin(dalsi)
    setZpravaFragmenty(dalsi.length === FRAGMENTY_RUIN.length ? '✨ Všechny fragmenty nalezeny. Paměť strážců je obnovena.' : nalezeny.pribeh)
  }
  const [hlidacRuin, setHlidacRuin] = useState(() => nactiHlidace())
  const [zpravaHlidac, setZpravaHlidac] = useState('')
  const hlidacOdemcen = stavRuin.dokonceno && fragmentyRuin.length === FRAGMENTY_RUIN.length
  const hlidacCasRef = useRef(novyRealTimeHlidac(0))
  const [hlidacHodiny, setHlidacHodiny] = useState(0)
  const posledniVarovaniRef = useRef(false)
  useEffect(() => {
    oznamVizualniFaziHlidace(hlidacRuin.porazen ? 'porazen' : 'klid')
  }, [hlidacRuin.porazen])
  useEffect(() => {
    if (!hlidacOdemcen || hlidacRuin.porazen || hud.mrtvyHrac) return
    const timer = window.setInterval(() => {
      if (jePauza()) return
      const ted = herniCas()
      setHlidacHodiny(ted)
      const vysledek = tikHlidace(hlidacRuin, hlidacCasRef.current, poziceHraceRef.current, true, ted)
      hlidacCasRef.current = vysledek.rt
      const varuje = vDosahuHlidace(poziceHraceRef.current) && hlidacVaruje(hlidacCasRef.current, ted)
      if (varuje !== posledniVarovaniRef.current) {
        posledniVarovaniRef.current = varuje
        oznamVizualniFaziHlidace(varuje ? 'varovani' : 'klid', varuje ? hlidacCasRef.current.stredUderu : undefined, varuje ? hlidacCasRef.current.druhUderu : undefined)
      }
      if (vysledek.udalost !== 'nic') {
        oznamVizualniFaziHlidace(vysledek.udalost === 'uhyb' || vysledek.udalost === 'mimo' ? 'uhyb' : 'utok')
        if (vysledek.stav !== hlidacRuin) {
          if (!ulozHlidace(vysledek.stav)) {
            setZpravaHlidac('Souboj se nepodařilo uložit. Zkontroluj úložiště zařízení.');
            return
          }
          setHlidacRuin(vysledek.stav)
        }
        setZpravaHlidac(vysledek.udalost === 'mimo' ? '🏃 Útoku ses vyhnul pohybem mimo vyznačený kruh!' : vysledek.udalost === 'uhyb' ? '🛡️ Úspěšný úhyb!' : vysledek.udalost === 'prohra' ? '💥 Hlídač tě porazil. Souboj začíná znovu.' : '💥 Hlídač zasáhl tvou ochranu!')
      }
    }, 100)
    return () => window.clearInterval(timer)
  }, [hlidacOdemcen, hlidacRuin, hud.mrtvyHrac])
  const utocNaHlidace = () => {
    if (hud.mrtvyHrac || !hlidacOdemcen) return
    const vysledek = utokVRealnemCase(hlidacRuin, hlidacCasRef.current, poziceHraceRef.current, hlidacOdemcen, herniCas())
    const dalsi = vysledek.stav
    if (dalsi === hlidacRuin) return
    if (!ulozHlidace(dalsi)) { setZpravaHlidac('Postup střetnutí se nepodařilo uložit.'); return }
    hlidacCasRef.current = vysledek.rt
    setHlidacRuin(vysledek.stav)
    oznamVizualniFaziHlidace(vysledek.stav.porazen ? 'porazen' : 'zasah')
    setZpravaHlidac(vysledek.stav.porazen ? '⚔️ Hlídač padl. Získáváš Pečeť strážců (příběhový zápis).' : '⚔️ Zásah! Sleduj varování před útokem.')
  }
  const uhybPredHlidacem = () => {
    if (hud.mrtvyHrac || !hlidacOdemcen || hlidacRuin.porazen || !vDosahuHlidace(poziceHraceRef.current)) return
    const dalsi = uhybVRealnemCase(hlidacCasRef.current, herniCas())
    if (dalsi === hlidacCasRef.current) return
    hlidacCasRef.current = dalsi
    setZpravaHlidac('🛡️ Úhyb aktivní na krátké časové okno.')
  }
  const [lesniObjevy, setLesniObjevy] = useState<string[]>(() => nactiLesniObjevy())
  const [lesniZprava, setLesniZprava] = useState('')
  const lesniObjevVDosahu = nejblizsiLesniObjev(poziceHrace, lesniObjevy)
  const prozkoumejLes = () => {
    const nalezeny = nejblizsiLesniObjev(poziceHraceRef.current, lesniObjevy)
    if (!nalezeny || hud.mrtvyHrac) return
    const dalsi = [...lesniObjevy, nalezeny.id]
    if (!ulozLesniObjevy(dalsi)) { setLesniZprava('Objev se nepodařilo uložit.'); return }
    setLesniObjevy(dalsi)
    setLesniZprava(nalezeny.pribeh)
  }
  const ulomekVDosahu = nejblizsiUlomek(poziceHrace, sebraneUlomky)
  const seberUlomek = () => {
    const nalezeny = nejblizsiUlomek(poziceHraceRef.current, sebraneUlomkyRef.current)
    if (!nalezeny || hud.mrtvyHrac) return
    const nove = [...sebraneUlomkyRef.current, nalezeny.id]
    sebraneUlomkyRef.current = nove
    setSebraneUlomky(nove)
    ulozSebraneUlomky(nove)
    vesnice.seberSurovinu('krystaly')
    vypravaAkce({ type: 'sebrat_ulomek', id: nalezeny.id, region: 'kristalova_mytina' })
  }
  const poziceHraceRef = useRef(poziceHrace)
  poziceHraceRef.current = poziceHrace
  const vesnice = useVillageStore()
  const aktualniUkol = aktivniUkol(vesnice.splneneUkoly, vesnice)
  const doporucenaOblast = oblastUkolu(aktualniUkol?.ukol.id)
  const navigacniCil = cilNavigace(navigaceId)
  const navigacniStav = navigacniCil ? navigacniUdaje(poziceHrace, navigacniCil.stred) : null
  const [zpravaNpc, setZpravaNpc] = useState('')
  const ukolNpc = blizkyObyvatel ? ukolProObyvatele(blizkyObyvatel.jmeno, vesnice.splneneUkoly) : null
  const [nahledAktivni, setNahledAktivni] = useState(false)
  const [otevrenyDialog, setOtevrenyDialog] = useState<string | null>(null)
  const [vybranaVolba, setVybranaVolba] = useState<{ npc: string; id: string } | null>(null)
  const [npcRozhodnuti, setNpcRozhodnuti] = useState(() => nactiRozhodnuti())

  // appka ohlásí appčin postup (level/XP) rodiči, jakmile se doopravdy
  // změní — appčin skutečný zdroj pravdy zůstává useBuddyWorldStore
  // (pridejXp), tohle jen hlásí JEHO aktuální hud.hrac.level/.xp výš;
  // appčina komponenta existuje jen na téhle obrazovce, appka proto
  // nepotřebuje dřívější "if (obrazovka !== 'hra') return" appčinu
  // podmínku, appčin efekt se stejně spustí jen, dokud appka tahle
  // komponenta zůstává namountovaná. Appčin BuddyWorldModule.tsx tohle
  // vědomě přijímá jako no-op (viz tamní appčin komentář u
  // onPostupZmena) — nic appku v téhle appce nerozbije, kdyby to
  // nějaký budoucí appčin volající appku skutečně chtěl číst.
  useEffect(() => {
    onPostupZmena(hud.hrac.level, hud.hrac.xp)
  }, [hud.hrac.level, hud.hrac.xp, onPostupZmena])

  useEffect(() => {
    if (!soubojStrazce || soubojStrazce.faze !== 'boj') return
    const timer = window.setInterval(() => {if(!jePauza()) setSoubojStrazce(prev => prev ? lehciSouboj(prev,tikSouboje(prev, herniDatum(), poziceHraceRef.current)) : null)}, 150)
    return () => window.clearInterval(timer)
  }, [soubojStrazce?.faze])

  useEffect(() => {
    if (soubojStrazce?.faze !== 'vyhra' || vyhraZapsana) return
    setVyhraZapsana(true)
    if (vesnice.odmenChramovehoStrazce()) {useBuddyWorldStore.getState().pridejXp(300,'boss:temple'); onZabitiBosse(0); setZpravaNpc('🏆 Chrámový strážce poražen! Odměna připsána.'); setToast('Chrámový strážce padl. Údolí je svobodné.')}
  }, [soubojStrazce?.faze, vyhraZapsana, vesnice.odmenChramovehoStrazce])

  const [stezka, setStezka] = useState<StavStezky>(() => nactiStezku(localStorage))
  const [stezkaZprava, setStezkaZprava] = useState('')
  const ulozAkciStezky = (dalsi: StavStezky): boolean => {
    if (!ulozStezku(localStorage, dalsi)) { setStezkaZprava('Ukládání selhalo; postup nebyl změněn.'); return false }
    setStezka(dalsi)
    return true
  }
  useEffect(() => {
    const dalsi = navstivBod(stezka, poziceHrace)
    if (dalsi !== stezka && ulozStezku(localStorage, dalsi)) setStezka(dalsi)
  }, [stezka, poziceHrace.x, poziceHrace.z])
  const [pomoc, setPomoc] = useState<StavPomoci>(() => nactiPomoc(localStorage))
  const [pomocZprava, setPomocZprava] = useState('')
  const ulozAkciPomoci = (dalsi: StavPomoci): boolean => {
    if (!ulozPomoc(localStorage, dalsi)) { setPomocZprava('Ukládání selhalo.'); return false }
    setPomoc(dalsi)
    return true
  }
  useEffect(() => {
    const dalsi = navstivObyvatele(pomoc, poziceHrace)
    if (dalsi !== pomoc && ulozPomoc(localStorage, dalsi)) setPomoc(dalsi)
  }, [pomoc, poziceHrace.x, poziceHrace.z])
  const [nastenkaOtevrena, setNastenkaOtevrena] = useState(false)
  const nastenkaVDosahu = muzeOtevritNastenku(poziceHrace)
  const inVillage = Math.hypot(poziceHrace.x,poziceHrace.z-13)<=8.5
  const progress:CampaignProgress = {...vesnice,care:adventure.careActions,placed:vesnice.umisteneStavby.length,
    crystal1:kristalovaVyprava.faze==='dokoncena',crystal2:druhaVyprava.faze==='dokoncena',crystal3:tretiVyprava.faze==='dokoncena',
    crystalBoss:kristalovyBossPorazen,forestBoss:vesnice.porazeniBossove-(kristalovyBossPorazen?1:0)-(vesnice.porazenChramovyStrazce?1:0)>0,forestDiscoveries:lesniObjevy.length,ruinsPuzzle:stavRuin.dokonceno,fragments:fragmentyRuin.length,
    ruinsBoss:hlidacRuin.porazen,buildings:vesnice.funkcniBudovy.length,sideQuests:vesnice.splneneVedlejsiUkoly.length,relics:vesnice.aktivovaneRelikvie.length,
    seals:vesnice.udalostiPeceti.includes(TRI_PECETE_ID),temple:vesnice.dokoncenyChram,dungeon:vesnice.dokoncenePodzemi,templeBoss:vesnice.porazenChramovyStrazce,
    mainQuests:vesnice.splneneUkoly.length,puzzleWins:adventure.puzzleWins}
  // v20 — appčin Pokrok pro appčin SezonaPanel (appka ho sama nikde
  // nepočítá, appčin tvar sedí přímo na appčin stav, co appka už
  // v téhle komponentě mohla, takže appka žádnou novou appčinu
  // appka appku nepočítá podruhé): stavRuin/fragmentyRuin/lesniObjevy/
  // hlidacRuin appka má od appčina vlastního useState výš.
  const pokrokSezony:Pokrok = {ruiny:stavRuin.dokonceno,fragmenty:fragmentyRuin.length,lesniObjevy:lesniObjevy.length,hlidac:hlidacRuin.porazen}
  const navigateTo=(id:string)=>{setNavigaceId(id);setPanel(null);setToast('Cíl je vyznačen zlatou linkou na minimapě.')}
  const interact=()=>{if(jePauza()||hud.mrtvyHrac)return;if(fragmentRuinVDosahu){seberFragmentRuin();return}if(lesniObjevVDosahu){prozkoumejLes();return}if(ulomekVDosahu){seberUlomek();return}sebrat()}
  const aktivniVelkySouboj = kristalovySouboj?.faze==='boj' || soubojStrazce?.faze==='boj'
  const crystalActive=kristalovySouboj?.faze==='boj'||kristalovySouboj?.faze==='prohra'
  const templeActive=soubojStrazce?.faze==='boj'||soubojStrazce?.faze==='prohra'
  const ruinActive=hlidacOdemcen&&!hlidacRuin.porazen&&vDosahuHlidace(poziceHrace)
  const bossHudDef=crystalActive?{...bossDef,id:'krystalovy-strazce',jmeno:'Krystalový strážce',maxHp:KRYSTALOVY_STRAZCE_HP}:templeActive?{...bossDef,id:'chramovy-strazce',jmeno:'Chrámový strážce',maxHp:STRAZCE_MAX_HP}:ruinActive?{...bossDef,id:'hlidac-ruin',jmeno:'Hlídač ruin',maxHp:HLIDAC_MAX_HP}:bossDef
  let hudProSouboj=ruinActive?{...hud,utokPripraven:true,bossFocus:{def:bossHudDef,hp:hlidacRuin.hp,maxHp:HLIDAC_MAX_HP,faze:'utoci' as const,probuzen:true,zuri:false}}:hud
  const special=crystalActive?kristalovySouboj:templeActive?soubojStrazce:null
  if(special){const last=crystalActive?kristalovySouboj!.posledniUtokHraceMs:soubojStrazce!.posledniZasahMs
    const inRange=crystalActive?hracDosahneNaBosse(poziceHrace,poziceKristalovehoStrazce(kristalovySouboj!)):vzdalenostOdStrazce(poziceHrace,soubojStrazce)<=DOSAH_UTOKU
    hudProSouboj={...hud,hrac:{...hud.hrac,hp:special.hracHp,maxHp:100},mrtvyHrac:special.faze==='prohra',nepritelFocus:null,bossFocus:{def:bossHudDef,hp:special.bossHp,maxHp:bossHudDef.maxHp,faze:'utoci',probuzen:true,zuri:special.bossHp<=bossHudDef.maxHp/2},utokPripraven:inRange&&herniDatum()-last>=650,muzeVyzvatBosse:false,obranaAktivni:(special.uhybDoMs??0)>herniDatum(),obranaPripravena:herniDatum()-(special.posledniUhybMs??-Infinity)>=1800}
  }
  const bossWarning=crystalActive&&kristalovySouboj&&kristalovyUtokVaruje(kristalovySouboj,herniDatum())?'Krystalový útok — ustup nebo uhni!':templeActive&&stavVarovani(soubojStrazce,herniDatum())?'Chrámový útok — ustup nebo uhni!':''
  const opakovatSouboj=()=>{if(crystalActive){setKristalovySouboj(novyKristalovySouboj(herniDatum()));return}if(templeActive){setSoubojStrazce(novySouboj(herniDatum()));return}obnovitPoSmrti()}
  const buddyAction=()=>{
    if(jePauza()||hud.mrtvyHrac)return
    if(!aktivniVelkySouboj){pouzijBuddySchopnost();return}
    if(herniCas()-bossBuddyRef.current<14000)return
    const inRange=crystalActive?hracDosahneNaBosse(poziceHrace,poziceKristalovehoStrazce(kristalovySouboj!)):vzdalenostOdStrazce(poziceHrace,soubojStrazce)<=5
    if(!inRange){setToast('Buddy potřebuje být blíž ke strážci.');return}
    bossBuddyRef.current=herniCas();if(adventure.sound)playCue('buddy')
    const hit=<T extends {bossHp:number;hracHp:number;faze:string}>(s:T):T=>{const hp=Math.max(0,s.bossHp-buddyElementPoskozeni(hud.hrac.level,maskot.id));return{...s,bossHp:hp,hracHp:maskot.id==='moss'?Math.min(100,s.hracHp+12):s.hracHp,faze:hp===0?'vyhra':s.faze}}
    if(crystalActive)setKristalovySouboj(s=>s?hit(s):null);else setSoubojStrazce(s=>s?hit(s):null)
  }
  const inputRef=useRef<(action:string)=>void>(()=>{})
  inputRef.current=action=>{if(action==='attack')utokVeSvete();if(action==='defend')uhybVeSvete();if(action==='interact')interact();if(action==='buddy')buddyAction()}
  useEffect(()=>{
    const listener=(e:Event)=>inputRef.current((e as CustomEvent<string>).detail)
    const notice=(e:Event)=>setToast((e as CustomEvent<string>).detail)
    const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){setPanel(p=>p?null:'settings');(document.activeElement as HTMLElement)?.blur()}}
    window.addEventListener('buddyworld:input',listener);window.addEventListener('buddyworld:notice',notice);window.addEventListener('keydown',key)
    const t=setInterval(()=>setBossCooldown(Math.max(0,Math.ceil((bossBuddyRef.current+14000-herniCas())/1000))),200)
    return()=>{window.removeEventListener('buddyworld:input',listener);window.removeEventListener('buddyworld:notice',notice);window.removeEventListener('keydown',key);clearInterval(t)}
  },[])
  useEffect(()=>{nastavPauzu('menu',panel!==null);nastavJoystick(0,0);if(panel)setTimeout(()=>document.querySelector<HTMLElement>('.bw-drawer header button')?.focus(),0);return()=>nastavPauzu('menu',false)},[panel])
  useEffect(()=>{const media=matchMedia('(orientation: portrait)');const update=()=>{nastavPauzu('hidden',document.hidden);nastavPauzu('portrait',media.matches)};update();document.addEventListener('visibilitychange',update);media.addEventListener('change',update);return()=>{document.removeEventListener('visibilitychange',update);media.removeEventListener('change',update);nastavPauzu('hidden',false);nastavPauzu('portrait',false)}},[])
  useEffect(()=>{nastavPauzu('boss-defeat',crystalActive&&kristalovySouboj?.faze==='prohra'||templeActive&&soubojStrazce?.faze==='prohra');return()=>nastavPauzu('boss-defeat',false)},[kristalovySouboj?.faze,soubojStrazce?.faze])
  useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(''),3800);return()=>clearTimeout(t)},[toast])
  useEffect(()=>{for(const id of adventure.campaign){const m=CAMPAIGN.find(m=>m.id===id);if(m)useBuddyWorldStore.getState().pridejXp(m.xp,'campaign:'+id)}},[adventure.campaign])
  useEffect(()=>{for(const id of vesnice.splneneUkoly)useBuddyWorldStore.getState().pridejXp(15,'main:'+id)},[vesnice.splneneUkoly])
  useEffect(()=>{if(adventure.campaign.length){setToast('Příběhový úkol splněn. Odměna je tvoje.');if(adventure.sound)playCue('reward')}},[adventure.campaign.length])
  return (
    <div className="bw-arena">
<div className="bw-arena-canvas" ref={containerRef}>
        {selhalo && (
          <div className="bw-arena-selhalo">
            <p>3D vykreslení se na tomhle zařízení nepovedlo spustit.</p>
          </div>
        )}
      </div>
<div className="bw-top-wash"/>
<Minimapa pozice={poziceHrace} objevene={vesnice.objeveneOblasti} navigaceId={navigaceId} />
{/* v47 — appka celý appčin "KAPITOLA" tracker schová v appčině villageOnly
    režimu (FrontierGame's "Osada/kronika" bez appčiny nové kampaně nad
    ní) — appčin mission tracker patří appčině nové, v41 kampani
    (adventure.ts), co appka v téhle appčině obrazovce vůbec neukazuje. */}
{!villageOnly && <div className="bw-mission-tracker"><span className="bw-eyebrow">{mission?'KAPITOLA '+mission.chapter+' / 6':'SEASON 1 · DOKONČENO'}</span><button onClick={()=>setPanel('campaign')}>{mission?.name??'Nový úsvit'} <span>↗</span></button><small>{mission?.goal??'Údolí zůstává otevřené pro tvá další dobrodružství.'}</small></div>}
{/* AktivniUkolHud vedle appčina "KAPITOLA" trackeru appku kompaktně
    ukazuje PŮVODNÍ, vesnický hlavní úkol (vesnice.splneneUkoly z
    questTracker.ts) — nezávislý appčin úkolový systém od appčiny v41
    campaign (adventure.ts) výš, obojí zároveň legitimně koexistuje. Ten
    appka ukazuje i v villageOnly režimu, protože patří appčině osadě. */}
<AktivniUkolHud />
<div className="bw-location-label">{oblastNaPozici(poziceHrace)?.nazev??'Cesty údolí'} <span>{adventure.coins} <b>◉</b></span></div>
<nav className="bw-main-menu" aria-label="Herní panely">{(villageOnly?(['town','buddy','settings'] as const):(['campaign','quests','world','town','buddy','achievements','settings'] as const)).map(id=><button key={id} className="bw-menu-button" title={PANEL_NAMES[id]} aria-label={PANEL_NAMES[id]} aria-pressed={panel===id} onClick={()=>setPanel(panel===id?null:id)}><span>{PANEL_ICONS[id]}</span><small>{PANEL_NAMES[id]}</small></button>)}</nav>
<HUD
        hud={hudProSouboj}
        maskot={maskot}
        bossDef={bossHudDef}
        vybranaZbran={vybranaZbran}
        onZvolZbran={(zbran) => { if (zbranJeDostupna(zbran, hud.hrac.level)) { setVybranaZbran(zbran); zvolZbran(zbran) } }}
        onUtocit={utokVeSvete}
        onObranit={uhybVeSvete}
        onVyzvatBosse={vyzvatBosse}
        onZpet={()=>setPanel('settings')}
        onZkusitZnovu={opakovatSouboj}
      />
{nahledAktivni && <div className="bw-preview-controls" role="group" aria-label="Náhled stavby">
        <span>{nahledPlatny ? '🟢 Volné místo' : '🔴 Nelze umístit – změň polohu'}</span>
        <button type="button" onClick={otocitNahled}>↻ Otočit</button>
        <button type="button" disabled={!nahledPlatny} onClick={() => { potvrditStavbu(); setNahledAktivni(false) }}>✓ Potvrdit</button>
        <button type="button" onClick={() => { zrusitNahled(); setNahledAktivni(false) }}>✕ Zrušit</button>
      </div>}
<div className="bw-world-interactions">{blizkyObyvatel&&<button onClick={()=>{setPanel('npc');setOtevrenyDialog(blizkyObyvatel.id)}}>💬 {blizkyObyvatel.jmeno}</button>}
{fragmentRuinVDosahu && <button type="button" disabled={hud.mrtvyHrac} onClick={seberFragmentRuin}>🗝️ Sebrat: {fragmentRuinVDosahu.nazev}</button>}
{lesniObjevVDosahu && <button type="button" onClick={prozkoumejLes} disabled={hud.mrtvyHrac} aria-label="Prozkoumat magický krystal lesa">💎 Prozkoumat: {lesniObjevVDosahu.nazev}</button>}
{ulomekVDosahu && <button type="button" onClick={seberUlomek} disabled={hud.mrtvyHrac} aria-label="Sebrat krystalový úlomek">
        💎 Sebrat úlomek (+{ODMENA_ULOMKU} krystal)
      </button>}
{zpravaHlidac&&vDosahuHlidace(poziceHrace)&&<p role="status">{zpravaHlidac}</p>}
{hlidacOdemcen&&!hlidacRuin.porazen&&vDosahuHlidace(poziceHrace)&&<p className="bw-combat-warning">{hlidacVaruje(hlidacCasRef.current,hlidacHodiny)?'⚠ ÚTOK — UHNI!':'Hlídač ruin · sleduj červený kruh'}</p>}
{aktivniVelkySouboj&&bossWarning&&<p className="bw-combat-warning">⚠ {bossWarning}</p>}
</div>
<button type="button" className="bw-sber-button" onClick={interact}
        aria-label="Sebrat dřevo, kámen nebo krystaly v blízkosti hráče">🪵 Sebrat</button>
<button type="button" className="bw-buddy-skill-button" onClick={buddyAction}
        disabled={(aktivniVelkySouboj?bossCooldown:buddySkillCooldown) > 0 || hud.mrtvyHrac}
        aria-label="Buddyho bojová schopnost, dosah pět metrů">
        🦊 Buddy {(aktivniVelkySouboj?bossCooldown:buddySkillCooldown) > 0 ? `(${aktivniVelkySouboj?bossCooldown:buddySkillCooldown} s)` : `✨ ${buddyElementPoskozeni(hud.hrac.level, maskot.id)} HP`}
      </button>
<VirtualniJoystick onZmena={nastavJoystick} />
{toast&&<div className="bw-toast" role="status">{toast}</div>}
{/* Buddy v2 (viz CLAUDE.md "Vzhled aplikace") — appčin modální panelový
    systém (Příběh/Deník/Svět/Osada/Buddy/Úspěchy/Nastavení/Rozhovor)
    je "view" podobrazovka se zděděným themeParent: 'buddyworld-entry'
    (viz themeCatalog.ts, stejný vzor jako HUD.tsx těsně nad ní): appka
    ji obaluje jen do <SurfaceThemeScope>, žádný <SurfaceBackdrop> ani
    ruční rootAttributes. */}
{panel!==null&&<SurfaceThemeScope surfaceId="buddyworld-panel"><div className="bw-drawer-shade" onPointerDown={e=>{if(e.target===e.currentTarget)setPanel(null)}}><aside className="bw-drawer" role="dialog" aria-modal="true" aria-label={PANEL_NAMES[panel!]} onKeyDown={trapFocus}><header><div><div className="bw-eyebrow">VÝPRAVA JE POZASTAVENÁ</div><strong>{PANEL_NAMES[panel!]}</strong></div><button onClick={()=>setPanel(null)} aria-label="Zavřít panel">✕</button></header><div className="bw-drawer-body">
{panel==='campaign'&&<CampaignPanel progress={progress} inVillage={inVillage} onNavigate={navigateTo}/>}
{panel==='quests'&&<><h2>Krystalové výpravy</h2><KristalovaVypravaUI stav={kristalovaVyprava} region={oblastNaPozici(poziceHrace)?.id === 'vesnice' ? 'buddy_vesnice' : oblastNaPozici(poziceHrace)?.id ?? ''} onAkce={vypravaAkce} />
{druhaVyprava.faze !== 'zamcena' && <details className="bw-objevovani" aria-label="Ozvěny krystalů">
        <summary>📜 Ozvěny krystalů {druhaVyprava.faze === 'dokoncena' ? '✓' : ''}</summary>
        <div className="bw-objevovani-seznam">
          <p>{popisDruhe(druhaVyprava)}</p>
          <small>Odměna: {DRUHA_ODMENA.xp} XP · 💎 {DRUHA_ODMENA.krystaly} · 🪵 {DRUHA_ODMENA.drevo} · 🪨 {DRUHA_ODMENA.kamen}</small>
          {druhaVyprava.faze === 'pripravena' && oblastNaPozici(poziceHrace)?.id === 'vesnice' &&
            <button type="button" onClick={() => druhaAkce({ type: 'zahajit' })}>💬 Přijmout úkol od Elary</button>}
          {druhaVyprava.faze === 'navrat' && oblastNaPozici(poziceHrace)?.id === 'vesnice' &&
            <button type="button" onClick={() => druhaAkce({ type: 'prevzit', region: 'buddy_vesnice' })}>🎁 Převzít odměnu od Elary</button>}
        </div>
      </details>}
{tretiVyprava.faze !== 'zamcena' && <details className="bw-objevovani" aria-label="Srdce mýtiny">
        <summary>💠 Srdce mýtiny {tretiVyprava.faze === 'dokoncena' ? '✓' : ''}</summary>
        <div className="bw-objevovani-seznam">
          <p>{popisTreti(tretiVyprava)}</p>
          <small>Odměna: {TRETI_ODMENA.xp} XP · 💎 {TRETI_ODMENA.krystaly} · 🪵 {TRETI_ODMENA.drevo} · 🪨 {TRETI_ODMENA.kamen}</small>
          {tretiVyprava.faze === 'pripravena' && oblastNaPozici(poziceHrace)?.id === 'vesnice' &&
            <button type="button" onClick={() => tretiAkce({ type: 'zahajit' })}>💬 Promluvit s Elarou o signálu</button>}
          {tretiVyprava.faze === 'pruzkum' && oblastNaPozici(poziceHrace)?.id === 'kristalova-mytina' &&
            <button type="button" onClick={() => tretiAkce({ type: 'prozkoumat', region: 'kristalova_mytina' })}>💠 Prozkoumat magický signál</button>}
          {tretiVyprava.faze === 'navrat' && oblastNaPozici(poziceHrace)?.id === 'vesnice' &&
            <button type="button" onClick={() => tretiAkce({ type: 'prevzit', region: 'buddy_vesnice' })}>🎁 Předat Elarě zprávu</button>}
        </div>
      </details>}
<details className="bw-objevovani" aria-label="První hratelná výprava">
        <summary>🎯 První výprava {krokyPrvniVypravy(kristalovaVyprava).filter(k => k.splneno).length}/4</summary>
        <div className="bw-objevovani-seznam">
          <p role="status">{dalsiDemoKrok(kristalovaVyprava)?.pokyn ?? 'Výprava dokončena! Ověř, že postup zůstal zachován i po opětovném otevření hry.'}</p>
          {krokyPrvniVypravy(kristalovaVyprava).map(k =>
            <div key={k.id}>{k.splneno ? '✓' : '○'} {k.nazev}</div>
          )}
          <small>Průvodce pouze zobrazuje skutečný stav úkolu; nepřiděluje odměny ani nepřeskakuje kroky.</small>
        </div>
      </details>
<small role="status">💎 Úlomky mýtiny: {sebraneUlomky.length}/{ULOMKY_MYTINY.length}</small><h2>Obyvatelé a kronika</h2><p>Hlavní úkoly z kroniky odevzdávej u obyvatel nebo v Osadě → Úkoly.</p><section className="bw-nastenka-panel" aria-label="Nástěnka úkolů">
        <button type="button" disabled={!nastenkaVDosahu} aria-expanded={nastenkaOtevrena && nastenkaVDosahu}
          onClick={() => setNastenkaOtevrena(v => !v)}>
          📜 Nástěnka úkolů {nastenkaVDosahu ? '— prohlédnout' : `— ${Math.ceil(vzdalenostOdNastenky(poziceHrace))} m`}
        </button>
        {nastenkaOtevrena && nastenkaVDosahu && <div className="bw-nastenka-obsah">
          <p>Výpravy dostupné ve světě. Nástěnka je přehled; odměny a přijetí úkolů zůstávají u původních NPC a panelů.</p>
          <div className="bw-vedlejsi-stezka" aria-label="Vedlejší úkol Průzkum stezky">
            <strong>🌲 Vedlejší úkol: Průzkum stezky</strong>
            <p>Prozkoumej dva orientační body a vrať se na náměstí. Odměna: 🪵 {ODMENA_STEZKY.drevo} · 🪨 {ODMENA_STEZKY.kamen}.</p>
            {stezka.faze === 'nenabran' && <button type="button" onClick={() => ulozAkciStezky(prijmiStezku(stezka))}>Přijmout úkol</button>}
            {stezka.faze === 'aktivni' && <p>Průzkum: {stezka.navstiveno.length}/{BODY_STEZKY.length}. {BODY_STEZKY.filter(b => !stezka.navstiveno.includes(b.id)).map(b => `${b.nazev} (${b.x}, ${b.z})`).join(' · ')}</p>}
            {stezka.faze === 'kOdevzdani' && <button type="button" onClick={() => {
              const dalsi = odevzdejStezku(stezka, nastenkaVDosahu)
              if (dalsi === stezka || !ulozAkciStezky(dalsi)) return
              // Odměna je nejvýše jednou na zařízení: stav hotovo se uloží před připsáním.
              // Není atomická napříč localStorage a Zustand; po pádu může odměna chybět.
              useVillageStore.setState(stav => ({
                drevo: Math.min(1_000_000, stav.drevo + ODMENA_STEZKY.drevo),
                kamen: Math.min(1_000_000, stav.kamen + ODMENA_STEZKY.kamen),
              }))
              setStezkaZprava('Průzkum dokončen. Materiály připsány.')
            }}>Odevzdat průzkum</button>}
            {stezka.faze === 'hotovo' && <p>✓ Průzkum dokončen, odměna už byla vyřízena.</p>}
            {stezkaZprava && <p role="status">{stezkaZprava}</p>}
          </div>
          <div className="bw-vedlejsi-pomoc" aria-label="Vedlejší úkol Pomoc obyvateli">
            <strong>🏡 Vedlejší úkol: Zpráva pro obyvatele</strong>
            <p>Doruč zprávu na označené místo ({CIL_POMOCI.x}, {CIL_POMOCI.z}) a vrať se k nástěnce. Odměna: 🪵 {ODMENA_POMOCI.drevo} · 🪨 {ODMENA_POMOCI.kamen}.</p>
            {pomoc === 'nenabran' && <button type="button" onClick={() => ulozAkciPomoci(prijmiPomoc(pomoc))}>Přijmout doručení</button>}
            {pomoc === 'aktivni' && <p>Najdi oranžový krystal u vesnice. Zpráva čeká na doručení.</p>}
            {pomoc === 'navstiven' && <button type="button" onClick={() => {
              const dalsi = odevzdejPomoc(pomoc, nastenkaVDosahu)
              if (dalsi === pomoc || !ulozAkciPomoci(dalsi)) return
              // Stejně jako první vedlejší úkol: nejprve persistovat dokončení.
              // Připsání surovin není atomické napříč localStorage a Zustand.
              useVillageStore.setState(stav => ({
                drevo: Math.min(1_000_000, stav.drevo + ODMENA_POMOCI.drevo),
                kamen: Math.min(1_000_000, stav.kamen + ODMENA_POMOCI.kamen),
              }))
              setPomocZprava('Zpráva doručena. Materiály připsány.')
            }}>Odevzdat doručení</button>}
            {pomoc === 'hotovo' && <p>✓ Zpráva doručena; odměna vyřízena.</p>}
            {pomocZprava && <p role="status">{pomocZprava}</p>}
          </div>
          {polozkyNastenky(kristalovaVyprava, druhaVyprava, tretiVyprava).map(ukol =>
            <p key={ukol.id}><strong>{ukol.stav === 'hotovy' ? '✓' : ukol.stav === 'dostupny' ? '◇' : '◌'} {ukol.nazev}</strong> — {ukol.stav}<br /><small>{ukol.pokyn}</small></p>
          )}
        </div>}
      </section>
<KronikaSveta
        kristalova={kristalovaVyprava.faze === 'dokoncena'}
        druha={druhaVyprava.faze === 'dokoncena'}
        treti={tretiVyprava.faze === 'dokoncena'}
        kael={vesnice.kaelTraining.prevzato}
      />
<PribehovyDenik /></>}
{panel==='world'&&<><h2>Mapa údolí</h2><p>Vyber cíl a sleduj zlatou linku na minimapě. Sever je nahoře.</p><div className="bw-navigace" aria-label="Navigace po světě">
        <label htmlFor="bw-navigace-cil">🧭 Cíl cesty</label>
        <select id="bw-navigace-cil" value={navigaceId ?? ''} onChange={e => setNavigaceId(e.target.value || null)}>
          <option value="">Bez navigace</option>
          {OBLASTI_SVETA.filter(o => vesnice.objeveneOblasti.includes(o.id as typeof vesnice.objeveneOblasti[number])).map(o =>
            <option key={o.id} value={o.id}>{o.symbol} {o.nazev}</option>)}
        </select>
        {doporucenaOblast && !navigaceId && <button type="button" onClick={() => setNavigaceId(doporucenaOblast)}>📜 Navigovat k úkolu</button>}
        {navigacniStav && <small role="status">{navigacniStav.dosazeno ? '✓ Jsi v cíli' : `${Math.round(navigacniStav.vzdalenost)} m · ${Math.round(navigacniStav.stupne)}° od severu`}</small>}
      </div>
<details className="bw-objevovani" aria-label="Průzkum světa">
        <summary>🧭 Svět {vesnice.objeveneOblasti.length}/{OBLASTI_SVETA.length}</summary>
        <div className="bw-objevovani-seznam">
          {OBLASTI_SVETA.map((oblast) => {
            const objevena = vesnice.objeveneOblasti.includes(oblast.id as typeof vesnice.objeveneOblasti[number])
            return <div key={oblast.id}>{objevena ? `${oblast.symbol} ${oblast.nazev} ✓` : '🔒 Neobjevená oblast'}</div>
          })}
          <small>Nové oblasti objevíš vstupem na jejich území. Za první návštěvu získáš suroviny.</small>
        </div>
      </details>
<details className="bw-objevovani" aria-label="Cestovní brány">
        <summary>🚪 Cestovní brány</summary>
        <div className="bw-objevovani-seznam">
          {BRANY_REGIONU.map(brana => {
            const vzd = Math.hypot(poziceHrace.x - brana.pozice.x, poziceHrace.z - brana.pozice.z)
            const cil = OBLASTI_SVETA.find(o => o.id === brana.kam)
            return <div key={brana.id}>
              <span>{cil?.symbol} {cil?.nazev} · {Math.round(vzd)} m od brány </span>
              <button type="button" disabled={vzd > DOSAH_BRANY || hud.mrtvyHrac} onClick={() => projdiBranou(brana.id)}>Projít</button>
            </div>
          })}
          <small>Brány zkracují cestu mezi místy ve stejném údolí. Použij je přímo u vyznačeného středu oblasti.</small>
        </div>
      </details><details><summary>Polohy relikvií a pokladů</summary>{RELIKVIE.map(r=><p key={r.id}>{vesnice.aktivovaneRelikvie.includes(r.id)?'✓':'◇'} {r.nazev}: {r.x}, {r.z}</p>)}<p>Souřadnice hráče: {poziceHrace.x.toFixed(1)}, {poziceHrace.z.toFixed(1)}</p></details><details className="bw-objevovani" aria-label="Krystalový strážce">
        <summary>💎⚔️ Krystalový strážce {kristalovyBossPorazen ? '✓' : ''}</summary>
        <div className="bw-objevovani-seznam">
          {tretiVyprava.faze !== 'dokoncena' ? <p>Nejdříve dokonči výpravu Srdce mýtiny.</p> : kristalovyBossPorazen ?
            <p>🏆 Strážce mýtiny byl poražen. První vítězství je zaznamenáno.</p> : <>
              <p>Aréna leží v Křišťálové mýtině. Přibliž se na {KRYSTALOVY_ARENA_DOSAH} m od středu mýtiny. V druhé fázi strážce sesílá energetické vlny.</p>
              <small>Odměna za první vítězství: {KRYSTALOVY_ODMENA.xp} XP · 💎 {KRYSTALOVY_ODMENA.krystaly} · 🪨 {KRYSTALOVY_ODMENA.kamen}</small>
              {(!kristalovySouboj || kristalovySouboj.faze === 'prohra') && <button type="button" disabled={!lzeVyzvatKristalovehoStrazce(tretiVyprava.faze === 'dokoncena', kristalovyBossPorazen, poziceHrace)} onClick={() => { setKristalovySouboj(novyKristalovySouboj(herniDatum())); setPanel(null) }}>⚔️ {kristalovySouboj ? 'Zkusit znovu' : 'Vyzvat Krystalového strážce'}</button>}
              {kristalovySouboj && <div className="bw-strazce-boj" aria-live="polite">
                <p>Strážce: {kristalovySouboj.bossHp}/{KRYSTALOVY_STRAZCE_HP} HP {kristalovySouboj.bossHp <= KRYSTALOVY_STRAZCE_HP / 2 ? '🔥 Zuřivost' : ''}</p>
                <progress max={KRYSTALOVY_STRAZCE_HP} value={kristalovySouboj.bossHp} />
                <p>Hráč: {kristalovySouboj.hracHp}/{KRYSTALOVY_HRAC_HP} HP · Aréna: {vzdalenostOdKristaloveAreny(poziceHrace).toFixed(1)} m</p>
                <progress max={KRYSTALOVY_HRAC_HP} value={kristalovySouboj.hracHp} />
                {kristalovyUtokVaruje(kristalovySouboj, kristalovyCas) && <p role="status">⚠️ {kristalovySouboj.utok === 'vlna' ? 'Energetická vlna (dosah 5 m)' : 'Krystalové ostří (dosah 3,1 m)'} — uhni nebo uteč!</p>}
                {kristalovySouboj.faze === 'boj' && <div className="bw-strazce-akce">
                  <button type="button" disabled={!hracDosahneNaBosse(poziceHrace, poziceKristalovehoStrazce(kristalovySouboj))} onClick={() => setKristalovySouboj(pred => pred ? zasahniKristalovehoStrazce(pred, herniDatum(), poziceHraceRef.current) : null)}>⚔️ Útok (také HUD)</button>
                  <button type="button" onClick={() => setKristalovySouboj(pred => pred ? uhniKristalovemuStrazci(pred, herniDatum()) : null)}>💨 Úhyb (také HUD)</button>
                  <button type="button" onClick={() => setKristalovySouboj(null)}>Odejít</button>
                </div>}
                {kristalovySouboj.faze === 'prohra' && <p>Strážce tě porazil. Zkus to znovu.</p>}
                {kristalovySouboj.faze === 'vyhra' && <p>🏆 Strážce padl!</p>}
              </div>}
            </>}
        </div>
      </details>
<details className="bw-lesni-objevy" aria-label="Objevy magického lesa">
        <summary>🌲 Tajemství magického lesa {lesniObjevy.length}/{LESNI_OBJEVY.length}</summary>
        {LESNI_OBJEVY.map(objev => <p key={objev.id}>{lesniObjevy.includes(objev.id) ? `✓ ${objev.nazev}: ${objev.pribeh}` : '🔒 Neobjevený krystal'}</p>)}
        {lesniZprava && <p role="status">{lesniZprava}</p>}
      </details>
<details className="bw-lesni-objevy" aria-label="Zapomenuté ruiny">
        <summary>🏛️ Zapomenuté ruiny {stavRuin.dokonceno ? '✓' : '🔒'}</summary>
        <p>Legenda: Kořeny probudí světlo a světlo uchová paměť.</p>
        <p>{stavRuin.dokonceno ? '✓ Vzpomínka strážců odhalena.' : `Aktivované runy: ${stavRuin.poradi.length}/3`}</p>
        {vDosahuRuin(poziceHrace) && !stavRuin.dokonceno ? (
          <div role="group" aria-label="Runová hádanka">
            {RUNY.map(id => <button key={id} type="button" disabled={hud.mrtvyHrac} onClick={() => aktivujRunuRuin(id)}>{RUNOVE_NAZVY[id]}</button>)}
          </div>
        ) : !stavRuin.dokonceno ? <small>Přibliž se k runovému kameni v ruinách.</small> : null}
        {zpravaRuin && <p role="status">{zpravaRuin}</p>}
      </details>
<details className="bw-lesni-objevy" aria-label="Výprava Ztracené fragmenty">
        <summary>🗝️ Ztracené fragmenty {fragmentyRuin.length}/{FRAGMENTY_RUIN.length}</summary>
        {!stavRuin.dokonceno ? <p>🔒 Nejprve vyřeš runovou hádanku v ruinách.</p> : <>
          <p>Najdi tři památky dávných strážců v okolí ruin.</p>
          {FRAGMENTY_RUIN.map(f => <p key={f.id}>{fragmentyRuin.includes(f.id) ? `✓ ${f.nazev}: ${f.pribeh}` : `◇ ${f.nazev} — dosud nenalezeno`}</p>)}
          {fragmentyRuin.length === FRAGMENTY_RUIN.length && <p>✓ Příběhová výprava dokončena.</p>}
        </>}
        {zpravaFragmenty && <p role="status">{zpravaFragmenty}</p>}
      </details>
<details className="bw-lesni-objevy" aria-label="Výprava Hlídač ruin">
        <summary>⚔️ Hlídač ruin {hlidacRuin.porazen ? '✓' : '🔒'}</summary>
        {!hlidacOdemcen ? <p>Nejprve dokonči runovou hádanku a sesbírej všechny tři fragmenty.</p> : <>
          <p>{hlidacRuin.porazen ? '✓ Pečeť strážců získána. První střetnutí dokončeno.' : `Hlídač čeká u ruin. Síla: ${hlidacRuin.hp}/${HLIDAC_MAX_HP} · Tvoje ochrana: ${hlidacRuin.ochrana}/3 · ${hlidacVaruje(hlidacCasRef.current, hlidacHodiny) ? hlidacCasRef.current.druhUderu === 'rychly' ? '⚠️ RYCHLÝ ÚTOK – UHNI!' : '⚠️ ÚTOK SE BLÍŽÍ – UHNI!' : 'Sleduj jeho útoky v reálném čase'}`}</p>
          <small>Časovaný souboj: sleduj červené varování a včas uhni. Sleduj vyznačenou oblast zásahu, ustup z kruhu nebo uhni. Odměnu za jeho přísahu získáš v příběhu.</small>
        </>}
        {zpravaHlidac && <p role="status">{zpravaHlidac}</p>}
      </details>
<details className="bw-relikvie-panel">
        <summary>🔮 Relikvie {vesnice.aktivovaneRelikvie.length}/{RELIKVIE.length}</summary>
        <p>Najdi zářící obelisky ve světě a aktivuj je tlačítkem sběru.</p>
        {RELIKVIE.map(r => <p key={r.id}>
          {vesnice.aktivovaneRelikvie.includes(r.id) ? '✓' : '◇'} {r.nazev}
          {vesnice.aktivovaneRelikvie.includes(r.id) && <small> — {r.popis}</small>}
        </p>)}
      </details>
<details className="bw-pecete-panel">
        <summary>✨ Probuzení strážců {vesnice.udalostiPeceti.includes(TRI_PECETE_ID) ? '✓' : `${vesnice.aktivovaneRelikvie.length}/${RELIKVIE.length}`}</summary>
        {jsouPeceteAktivni(vesnice.aktivovaneRelikvie) ? <>
          {TRI_PECETE_PRIBEH.map((text, i) => <p key={i}>{text}</p>)}
          <p>Odměna: 🪵 {TRI_PECETE_ODMENA.drevo} · 🪨 {TRI_PECETE_ODMENA.kamen} · 💎 {TRI_PECETE_ODMENA.krystaly}</p>
          <button type="button" disabled={vesnice.udalostiPeceti.includes(TRI_PECETE_ID)} onClick={() => {
            const ok = vesnice.probudStrazce()
            setZpravaNpc(ok ? '✨ Strážci se probudili. Odměna byla připsána.' : 'Událost už byla dokončena.')
          }}>{vesnice.udalostiPeceti.includes(TRI_PECETE_ID) ? '✓ Událost dokončena' : '✨ Probudit strážce'}</button>
        </> : <p>Aktivuj všechny tři relikvie, aby se odhalilo tajemství dávných strážců.</p>}
      </details>
<details className="bw-chram-panel">
        <summary>🏛️ Starý chrám strážců {vesnice.dokoncenyChram ? '✓' : ''}</summary>
        {!vesnice.udalostiPeceti.includes(TRI_PECETE_ID) ?
          <p>Nejprve aktivuj všechny relikvie a dokonči Probuzení strážců.</p> : <>
          <p>Chrám stojí na souřadnicích {CHRAM_POZICE.x}, {CHRAM_POZICE.z}. Vzdálenost: {Math.round(vzdalenostOdChramu(poziceHrace))} m.</p>
          {vesnice.dokoncenyChram ? CHRAM_PRIBEH.map((radek, i) => <p key={i}>{radek}</p>) :
            <p>Přijdi k chrámovému oltáři a odhal první tajemství.</p>}
          <p>Odměna: 🪵 {CHRAM_ODMENA.drevo} · 🪨 {CHRAM_ODMENA.kamen} · 💎 {CHRAM_ODMENA.krystaly}</p>
          <button type="button" disabled={vesnice.dokoncenyChram || vzdalenostOdChramu(poziceHrace) > CHRAM_DOSAH}
            onClick={() => setZpravaNpc(vesnice.prozkoumejChram(poziceHrace) ? '🏛️ Chrám prozkoumán. Odměna připsána.' : 'Přibliž se k oltáři.') }>
            {vesnice.dokoncenyChram ? '✓ Chrám prozkoumán' : '🔮 Prozkoumat oltář'}
          </button>
        </>}
      </details>
<details className="bw-podzemi-panel">
        <summary>🗝️ Chrámové podzemí {vesnice.dokoncenePodzemi ? '✓' : `${vesnice.aktivovaneChramoveRuny.length}/${CHRAMOVE_RUNY.length}`}</summary>
        {!vesnice.dokoncenyChram ? <p>Nejprve prozkoumej oltář Starého chrámu.</p> : <>
          <p>Aktivuj tři runy ve správném pořadí. Každá vyžaduje přiblížení na {DOSAH_RUNY} m.</p>
          {CHRAMOVE_RUNY.map(r => {
            const aktivni = vesnice.aktivovaneChramoveRuny.includes(r.id)
            const aktualni = dalsiRuna(vesnice.aktivovaneChramoveRuny)?.id === r.id
            const vzdalenost = Math.hypot(poziceHrace.x - r.pozice.x, poziceHrace.z - r.pozice.z)
            return <div key={r.id}>
              <span>{aktivni ? '✓' : r.symbol} {r.nazev} — {Math.round(vzdalenost)} m</span>
              {!aktivni && <button type="button" disabled={!aktualni || vzdalenost > DOSAH_RUNY} onClick={() => setZpravaNpc(vesnice.aktivujChramovouRunu(r.id, poziceHrace) ? `✨ ${r.nazev} aktivována.` : 'Nejprve se přibliž ke správné runě.')}>Aktivovat</button>}
            </div>
          })}
          <p>Odměna: 🪨 {ODMENA_PODZEMI.kamen} · 💎 {ODMENA_PODZEMI.krystaly}</p>
          <button type="button" disabled={vesnice.dokoncenePodzemi || vesnice.aktivovaneChramoveRuny.length !== CHRAMOVE_RUNY.length || vzdalenostOdChramu(poziceHrace) > CHRAM_DOSAH} onClick={() => setZpravaNpc(vesnice.dokonciPodzemi(poziceHrace) ? '🗝️ Zkouška dokončena! Odměna připsána.' : 'Vrať se k oltáři a aktivuj všechny runy.')}>{vesnice.dokoncenePodzemi ? '✓ Zkouška dokončena' : 'Otevřít chrámovou síň'}</button>
          {vesnice.dokoncenePodzemi && PODZEMI_PRIBEH.map((radek, i) => <p key={i}>{radek}</p>)}
        </>}
      </details>
<details className="bw-chram-panel">
        <summary>⚔️ Chrámový strážce {vesnice.porazenChramovyStrazce ? '✓' : ''}</summary>
        {!vesnice.dokoncenePodzemi ? <p>Nejdříve dokonči chrámovou zkoušku.</p> : vesnice.porazenChramovyStrazce ? <p>🏆 Strážce poražen. Odměna získána.</p> : <>
          <p>Prostorový souboj: přibliž se k modelu v 3D aréně pro útok, ustup mimo dosah strážce nebo použij úhyb. Ve druhé fázi útočí rychleji.</p>
          {!soubojStrazce || soubojStrazce.faze === 'prohra' ? <button type="button" disabled={!lzeVyzvatStrazce(vesnice.dokoncenePodzemi, vesnice.porazenChramovyStrazce, poziceHrace)} onClick={() => { setVyhraZapsana(false); setSoubojStrazce(novySouboj(herniDatum())); setPanel(null) }}>⚔️ {soubojStrazce ? 'Zkusit znovu' : 'Vyzvat strážce u chrámu'}</button> : null}
          {soubojStrazce && <div className="bw-strazce-boj" aria-live="polite">
            <p>Strážce: {soubojStrazce.bossHp}/{STRAZCE_MAX_HP} HP {soubojStrazce.bossHp <= STRAZCE_MAX_HP / 2 ? '🔥 Zuřivost' : ''}</p>
            <progress max={STRAZCE_MAX_HP} value={soubojStrazce.bossHp} />
            {stavVarovani(soubojStrazce, herniDatum()) && <p className="bw-varovani-utoku" role="status">⚠️ {soubojStrazce.typUderu === 'vlna' ? 'Energetická vlna (fialová)' : 'Plošný úder (červený)'}! Dosah {polomerUderu(soubojStrazce).toFixed(1)} m. Zbývá {((zbyvaDoUtoku(soubojStrazce, herniDatum()) ?? 0) / 1000).toFixed(1)} s — uteč z vyznačené oblasti nebo uhni.</p>}
            <p>Hráč: {soubojStrazce.hracHp}/{HRAC_MAX_HP} HP · Vzdálenost od strážce: {vzdalenostOdStrazce(poziceHrace, soubojStrazce).toFixed(1)} m</p>
            <progress max={HRAC_MAX_HP} value={soubojStrazce.hracHp} />
            {soubojStrazce.faze === 'boj' && <div className="bw-strazce-akce"><button type="button" disabled={vzdalenostOdStrazce(poziceHrace, soubojStrazce) > DOSAH_UTOKU} onClick={() => setSoubojStrazce(s => s ? utokHrace(s, herniDatum(), poziceHraceRef.current) : null)}>⚔️ Útok zblízka</button><button type="button" onClick={() => setSoubojStrazce(s => s ? kryjSe(s, herniDatum()) : null)}>🛡️ Kryt</button><button type="button" onClick={() => setSoubojStrazce(s => s ? uhni(s, herniDatum()) : null)}>💨 Úhyb (také HUD)</button><button type="button" onClick={() => setSoubojStrazce(null)}>Odejít</button></div>}
            {soubojStrazce.faze === 'prohra' && <p>Strážce tě porazil. Připrav se a zkus to znovu.</p>}
            {soubojStrazce.faze === 'vyhra' && <p>🏆 Strážce padl. Získáváš 25 kamenů a 35 krystalů!</p>}
          </div>}
        </>}
      </details>
<SezonaPanel pokrok={pokrokSezony} /></>}
{panel==='town'&&<OsadaPanel embedded onPostavit={(typ) => { postavit(typ); setNahledAktivni(true); setPanel(null) }} onPresunout={(id) => { presunout(id); setNahledAktivni(true); setPanel(null) }} />}
{panel==='buddy'&&<BuddyPanel maskot={maskot}/>}
{panel==='achievements'&&<Achievements progress={progress}/>}
{panel==='settings'&&<><GameSettings inVillage={inVillage} onRest={odpocinout} onExit={onZpet}/><details className="bw-grafika-panel">
        <summary>⚙️ Grafika</summary>
        <label htmlFor="bw-kvalita">Kvalita 3D scény</label>
        <select id="bw-kvalita" value={grafickaKvalita} onChange={e => {
          const nova = e.target.value as GrafickaKvalita
          setGrafickaKvalita(nova)
          ulozGrafickouKvalitu(nova)
        }}>
          <option value="usporny">Úsporná</option>
          <option value="vyvazeny">Vyvážená</option>
          <option value="detailni">Detailní</option>
        </select>
        <p>{PROFILY_KVALITY[grafickaKvalita].popis}</p>
        <small>Změna rozlišení je okamžitá. Vyhlazování hran se plně změní po opětovném otevření hry.</small>
      </details></>}
{panel==='npc'&&<>{blizkyObyvatel && <div className="bw-npc-dialog" role="region" aria-label="Rozhovor s obyvatelem">
        <strong>{blizkyObyvatel.role} {blizkyObyvatel.jmeno}</strong>
        {otevrenyDialog === blizkyObyvatel.id && <div>
          {ukolNpc ? scenaUkolu(ukolNpc.id).pred.map((radek, i) => <p key={i}>{radek}</p>) : <p>{blizkyObyvatel.dialog}</p>}
          <section className="bw-npc-volby" aria-label="Témata rozhovoru">
            <strong>💬 Na co se chceš zeptat?</strong>
            {volbyProNpc(blizkyObyvatel.id).map(volba =>
              <button key={volba.id} type="button" aria-pressed={vybranaVolba?.npc === blizkyObyvatel.id && vybranaVolba?.id === volba.id}
                onClick={() => { const ulozeno = ulozRozhodnuti(blizkyObyvatel.id, volba.id); if (ulozeno) { if (blizkyObyvatel.id === 'kael' && volba.id === 'vycvik') vesnice.zahajKaelTraining(); if (blizkyObyvatel.id === 'mira' && volba.id === 'stavba') vesnice.zahajMiraStavbu(); setNpcRozhodnuti(ulozeno); setVybranaVolba({ npc: blizkyObyvatel.id, id: volba.id }) } else setZpravaNpc('Rozhodnutí se nepodařilo uložit.') }}>{volba.otazka}</button>
            )}
            {vybranaVolba?.npc === blizkyObyvatel.id &&
              <p role="status">{odpovedNpc(blizkyObyvatel.id, vybranaVolba?.id)}</p>}
            {npcRozhodnuti[blizkyObyvatel.id] && <p className="bw-npc-vzpominka">🧠 {reakceNaRozhodnuti(blizkyObyvatel.id, npcRozhodnuti[blizkyObyvatel.id])}</p>}
          </section>
          {blizkyObyvatel.id === 'elara' && <section className="bw-elara-pribeh" aria-label="Elařino pátrání po krystalech">
            <strong>📜 Elařino pátrání</strong>
            <p role="status">{elaraText(elaraFaze(npcRozhodnuti.elara === 'historie', kristalovaVyprava.faze === 'dokoncena'))}</p>
            {elaraFaze(npcRozhodnuti.elara === 'historie', kristalovaVyprava.faze === 'dokoncena') === 'odhaleno' &&
              <button type="button" onClick={() => setZpravaNpc(zapisElaraObjev(localStorage, true) ? '📜 Elara si zaznamenala tvůj objev.' : 'Objev se nepodařilo uložit.')}>Zaznamenat objev do kroniky</button>}
          </section>}
          {blizkyObyvatel.id === 'mira' && <section className="bw-mira-stavba" aria-label="Miřina obnova vesnice">
            <strong>🏘️ Miřina obnova vesnice</strong>
            <p role="status">{vesnice.miraStavba.zacatek === null
              ? 'Zeptej se Miry, co potřebujeme na stavění, a přijmi její výzvu.'
              : `Umísti ${MIRA_CIL} nové stavby po přijetí úkolu: ${pocetMiraStaveb(vesnice.miraStavba, vesnice.umisteneStavby.length)}/${MIRA_CIL}.`}</p>
            <p>Odměna: 🪵 {MIRA_STAVBA_ODMENA.drevo} · 🪨 {MIRA_STAVBA_ODMENA.kamen} · 💎 {MIRA_STAVBA_ODMENA.krystaly}</p>
            <button type="button" disabled={fazeMiraStavby(vesnice.miraStavba, vesnice.umisteneStavby.length) !== 'pripraveno'}
              onClick={() => setZpravaNpc(vesnice.prevzitMiraStavbu() ? '🏘️ Mira děkuje za obnovu vesnice. Odměna připsána.' : 'Nejprve postav nové stavby.')}>{vesnice.miraStavba.prevzato ? '✓ Odměna převzata' : 'Převzít odměnu za obnovu'}</button>
          </section>}
          {blizkyObyvatel.id === 'kael' && <section className="bw-npc-vycvik" aria-label="Kaelův osobní výcvik">
            <strong>⚔️ Kaelův osobní výcvik</strong>
            <p role="status">{vesnice.kaelTraining.zacatek === null
              ? 'Zeptej se Kaela na bojový výcvik a začni počítat nové porážky.'
              : `Poraž 3 nepřátele od přijetí výcviku: ${pocetVycvikuV2(vesnice.kaelTraining, vesnice.porazeniNepratele)}/3.`}</p>
            <p>Odměna: 🪵 {KAEL_VYCVIK_ODMENA.drevo} · 🪨 {KAEL_VYCVIK_ODMENA.kamen} · 💎 {KAEL_VYCVIK_ODMENA.krystaly}</p>
            <button type="button" disabled={stavVycvikuV2(vesnice.kaelTraining, vesnice.porazeniNepratele) !== 'pripraveno'}
              onClick={() => setZpravaNpc(vesnice.prevzitKaelTraining() ? '⚔️ Výcvik dokončen, odměna připsána.' : 'Výcvik ještě není dokončen nebo odměna již byla převzata.')}>
              {vesnice.kaelTraining.prevzato ? '✓ Odměna převzata' : 'Převzít odměnu za výcvik'}
            </button>
          </section>}
          {ukolNpc && <>
            <p><strong>{ukolNpc.nazev}</strong> — {ukolNpc.cil}</p>
            <p>Odměna: {ukolNpc.odmena.drevo} 🪵, {ukolNpc.odmena.kamen} 🪨, {ukolNpc.odmena.krystaly} 💎</p>
            <button type="button" disabled={stavUkolu(ukolNpc, vesnice) !== 'pripraveno'} onClick={() => {
              const ok = vesnice.prevzitOdmenu(ukolNpc.id)
              setZpravaNpc(ok ? 'Úkol dokončen, odměna připsána.' : 'Úkol zatím nelze dokončit.')
            }}>{stavUkolu(ukolNpc, vesnice) === 'pripraveno' ? 'Dokončit úkol' : 'Pokračovat v úkolu'}</button>
          </>}
          {!ukolNpc && <p>Momentálně pro tebe nemám další hlavní úkol.</p>}
          <section className="bw-npc-sidequests" aria-label="Vedlejší úkoly obyvatele">
            <p>{rozhovorObyvatele(blizkyObyvatel.id, vesnice.splneneVedlejsiUkoly)}</p>
            <div className="bw-npc-duvera" aria-label="Vztah s obyvatelem">
              <strong>🤝 Důvěra: {urovenDůvěry(blizkyObyvatel.id, vesnice.splneneVedlejsiUkoly)}/2</strong>
              <p>{urovenDůvěry(blizkyObyvatel.id, vesnice.splneneVedlejsiUkoly) === 0
                ? 'Pomoz obyvateli s vedlejším úkolem a získáš jeho důvěru.'
                : textDůvěry(blizkyObyvatel.id as 'elara' | 'kael' | 'mira', vesnice.splneneVedlejsiUkoly)}</p>
              {urovenDůvěry(blizkyObyvatel.id, vesnice.splneneVedlejsiUkoly) === 2 && <>
                <p>Odměna za důvěru: 🪵 {ODMENA_VZTAHU.drevo} · 🪨 {ODMENA_VZTAHU.kamen} · 💎 {ODMENA_VZTAHU.krystaly}</p>
                <button type="button" disabled={vesnice.prevzateOdmenyVztahu.includes(blizkyObyvatel.id)} onClick={() => {
                  const ok = vesnice.vyzvedniOdmenuVztahu(blizkyObyvatel.id)
                  setZpravaNpc(ok ? 'Děkuji za pomoc! Odměna za důvěru je tvoje.' : 'Odměnu už máš nebo zatím nesplňuješ podmínky.')
                }}>{vesnice.prevzateOdmenyVztahu.includes(blizkyObyvatel.id) ? '✓ Odměna vyzvednuta' : '🎁 Vyzvednout odměnu za důvěru'}</button>
              </>}
            </div>
            {(() => {
              const udalost = udalostProObyvatele(blizkyObyvatel.id, vesnice.splneneVedlejsiUkoly)
              if (!udalost) return null
              const zaznamenana = vesnice.zaznamenaneNpcUdalosti.includes(udalost.id)
              return <section className="bw-npc-pribeh" aria-label="Osobní příběh obyvatele">
                <strong>📖 {udalost.nazev}</strong>
                <p>{udalost.uvod}</p>
                <details>
                  <summary>{zaznamenana ? 'Přečíst příběh znovu' : 'Poslechnout osobní příběh'}</summary>
                  {udalost.radky.map((radek, index) => <p key={index}>{radek}</p>)}
                  <p>{udalost.zaver}</p>
                  {!zaznamenana && <button type="button" onClick={() => {
                    const ok = vesnice.zaznamenejNpcUdalost(udalost.id)
                    setZpravaNpc(ok ? '📖 Nová událost zapsána do deníku.' : 'Událost už je zaznamenaná.')
                  }}>✓ Zapsat příběh do deníku</button>}
                </details>
                {zaznamenana && <small>✓ Zapsáno v deníku</small>}
              </section>
            })()}
            {NPC_VYPRAVY.filter(v => v.id === blizkyObyvatel.id && vesnice.zaznamenaneNpcUdalosti.includes(v.id)).map(v => {
              const stav = stavVypravy(v.id, vesnice.zaznamenaneNpcUdalosti, vesnice.objeveneOblasti, vesnice.splneneNpcVypravy, vesnice)
              return <section className="bw-npc-vyprava" key={v.id} aria-label="Osobní výprava">
                <strong>🧭 {v.nazev}</strong>
                <p>{v.popis}</p><small>{v.podminka}</small>
                <p>Odměna: 🪵 {v.odmena.drevo} · 🪨 {v.odmena.kamen} · 💎 {v.odmena.krystaly}</p>
                <button type="button" disabled={stav !== 'pripraveno'} onClick={() => {
                  const ok = vesnice.dokonciNpcVypravu(v.id)
                  setZpravaNpc(ok ? `Výprava ${v.nazev} dokončena!` : 'Podmínky výpravy zatím nejsou splněné.')
                }}>{stav === 'splneno' ? '✓ Výprava dokončena' : stav === 'pripraveno' ? '🎁 Odevzdat výpravu' : '🧭 Výprava probíhá'}</button>
              </section>
            })}
            <strong>🌿 Vedlejší úkoly</strong>
            {vedlejsiUkolyObyvatele(blizkyObyvatel.id).map(ukol => {
              const stav = stavVedlejsihoUkolu(ukol.id, vesnice.splneneVedlejsiUkoly, vesnice)
              return <div className="bw-npc-sidequest" key={ukol.id}>
                <strong>{ukol.nazev}</strong>
                <p>{ukol.popis} {ukol.cil}</p>
                <small>Odměna: 🪵 {ukol.odmena.drevo} · 🪨 {ukol.odmena.kamen} · 💎 {ukol.odmena.krystaly}</small>
                <button type="button" disabled={stav !== 'pripraveno'} onClick={() => {
                  const ok = vesnice.prevzitVedlejsiOdmenu(ukol.id)
                  setZpravaNpc(ok ? `Splněno: ${ukol.nazev}. Odměna připsána.` : 'Podmínky úkolu ještě nejsou splněné.')
                }}>{stav === 'splneno' ? '✓ Dokončeno' : stav === 'pripraveno' ? '🎁 Vyzvednout odměnu' : '⏳ Probíhá'}</button>
              </div>
            })}
          </section>
          {zpravaNpc && <p role="status">{zpravaNpc}</p>}
        </div>}
        <button type="button" onClick={() => { setZpravaNpc(''); setOtevrenyDialog(
          otevrenyDialog === blizkyObyvatel.id ? null : blizkyObyvatel.id
        ) }}>{otevrenyDialog === blizkyObyvatel.id ? 'Zavřít' : 'Promluvit'}</button>
      </div>}{!blizkyObyvatel&&<p>Promluv si s obyvateli přímo ve vesnici.</p>}</>}
</div></aside></div></SurfaceThemeScope>}
</div>
  )
}

export default BuddyWorldHra
