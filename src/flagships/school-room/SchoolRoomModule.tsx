import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/core/store/useAppStore'
import { useStudyPlanner } from '@/miniapps/study-planner/useStudyPlanner'
import { useKalendar, naFormatDatumu } from '@/miniapps/kalendar/useKalendar'
import { usePomodoro } from '@/miniapps/pomodoro/usePomodoro'
import { AppIcon } from '@/pages/app/components/AppIcon'
import { FlagshipShell } from '../shared/FlagshipShell'
import { MujWidgetPanel } from '../shared/MujWidgetPanel'
import { NastrojeSheet } from '../shared/NastrojeSheet'
import type { FlagshipDlazdice, FlagshipVelkaKarta } from '../shared/types'
import './SchoolRoomModule.css'

// ==========================================
// School Room — první "vlajková appka" appky (viz FlagshipShell.tsx
// pro celé zdůvodnění sdíleného pláště). Sama definuje jen svých šest
// dlaždic, dvě velké karty a rozbalovací seznam Nástrojů, zbytek
// (hlavička, sloty "Můj widget", spodní lišta) je společný.
//
// Pomodoro/Poznámky/Úkoly/Soubory/Nástroje jsou přesunuté, ne nové
// miniaplikace — mají v useAppStore.ts's DEFAULT_APPS teď
// `active: false` (schované z hlavní mřížky /apps, School Room je
// jejich jediný běžný vchod), ale deep-link přes setActiveAppId funguje
// úplně stejně jako dřív z Hubu na Planer. Kalendář je jediná ze šesti
// dlaždic, co appka do teď vůbec neměla (src/miniapps/kalendar/).
// Statistiky nejsou vlastní miniaplikace — /odmeny (RewardModule) už
// přesně tohle (úroveň/XP/série/odznaky) ukazuje, stavět to podruhé by
// bylo zbytečné zdvojení.
//
// "Apps" velká karta se přejmenovala na "Nástroje" a přestala navigovat
// na /apps — místo toho rozbaluje NastrojeSheet.tsx se seznamem osmi
// nástrojů (Maturitní centrum/Flashcards/Math Solver/Planer/Pomodoro/
// Quick Notes/Textový editor/Mind Map), tři z nich (Planer/Pomodoro/
// Quick Notes) jsou schválně tytéž appky jako už existující dlaždice
// nahoře — dvě různé cesty ke stejné appce, ne duplicitní data. Zbylých
// pět (Maturitní centrum/Flashcards/Math Solver/Textový editor/Mind
// Map) v pevné šestici dlaždic není, ale FlagshipShell.tsx's
// dalsiMoznostiProSloty jim pořád dovolí jít připnout do slotů "Můj
// widget" stejně jako kterékoli z šesti — to je to, co "všechny půjdou
// přidat i do těch 3 plusem widgetu" znamená.
// ==========================================

export const SchoolRoomModule: React.FC = () => {
  const navigate = useNavigate()
  const setActiveAppId = useAppStore((s) => s.setActiveAppId)
  const [nastrojeOtevrene, setNastrojeOtevrene] = useState(false)

  // "Moje přehled" — jediný skutečně nový obsah téhle appky (viz komentář
  // u panelu níž), tři reálná čísla z appek, co v pokoji už mají svou
  // dlaždici, ne vymyšlená data. Stejný "browse what's already loaded"
  // duch jako Growth Roomovy "Moje cíle" — čte přímo store hooky, žádný
  // nový store ani zvláštní stats.ts modul, protože všechny tři hodnoty
  // (pendingCount, dnySUdalosti, completedSessions) už appky samy počítají.
  const { pendingCount } = useStudyPlanner()
  const { dnySUdalosti, dnes } = useKalendar()
  const { completedSessions } = usePomodoro()

  const dnesniStr = naFormatDatumu(dnes.getFullYear(), dnes.getMonth(), dnes.getDate())
  const nadchazejiciUdalosti = useMemo(
    () => [...dnySUdalosti].filter((d) => d >= dnesniStr).length,
    [dnySUdalosti, dnesniStr]
  )

  // Deep-link do miniaplikace stejným vzorem jako Hub.tsx's
  // setActiveAppId('study-planner', '/hub') — returnPath přivede
  // uživatele po zavření appky zpátky sem, ne do prázdné mřížky.
  const otevritMiniaplikaci = (id: string) => {
    setActiveAppId(id, '/skola')
    navigate('/apps')
  }

  const dlazdice: FlagshipDlazdice[] = [
    {
      id: 'kalendar',
      nazev: 'Kalendář',
      popis: 'Naplánuj si den',
      ikona: 'calendar',
      barva: 'purple',
      onClick: () => otevritMiniaplikaci('kalendar'),
    },
    {
      id: 'pomodoro',
      nazev: 'Pomodoro',
      popis: 'Soustřeď se',
      ikona: 'pomodoro',
      barva: 'orange',
      onClick: () => otevritMiniaplikaci('pomodoro'),
    },
    {
      id: 'poznamky',
      nazev: 'Poznámky',
      popis: 'Zapiš si myšlenky',
      ikona: 'quick-notes',
      barva: 'pink',
      onClick: () => otevritMiniaplikaci('quick-notes'),
    },
    {
      id: 'upozorneni',
      nazev: 'Upozornění',
      popis: 'Měj přehled',
      ikona: 'bell',
      barva: 'cyan',
      // Stejná akce jako zvonek v hlavičce (viz FlagshipShell.tsx's
      // onOpenNotifications prop níž) — dlaždice tu není nic navíc, jen
      // druhá cesta na tutéž obrazovku /skola/upozorneni.
      onClick: () => navigate('/skola/upozorneni'),
    },
    {
      id: 'ukoly',
      nazev: 'Úkoly',
      popis: 'Sleduj úkoly',
      ikona: 'study-planner',
      barva: 'green',
      onClick: () => otevritMiniaplikaci('study-planner'),
    },
    {
      id: 'statistiky',
      nazev: 'Statistiky',
      popis: 'Sleduj pokrok',
      ikona: 'bar-chart',
      barva: 'purple',
      // Dřív jen zkratka na /odmeny (RewardModule's účtové skóre) —
      // teď vlastní obrazovka School Roomu se skutečnými čísly z jeho
      // vlastních tří appek (viz SkolaStatistiky.tsx).
      onClick: () => navigate('/skola/statistiky'),
    },
  ]

  const velkeKarty: FlagshipVelkaKarta[] = [
    {
      id: 'soubory',
      nazev: 'Soubory',
      popis: 'Všechny tvoje soubory na jednom místě',
      ikona: 'file-manager',
      barva: 'cyan',
      onClick: () => otevritMiniaplikaci('file-manager'),
    },
    {
      id: 'nastroje',
      nazev: 'Nástroje',
      popis: 'Tvé školní aplikace na dosah',
      ikona: 'wrench',
      barva: 'purple',
      onClick: () => setNastrojeOtevrene(true),
    },
  ]

  // Osm nástrojů za "Nástroje" kartou — viz komentář nahoře, proč tři
  // z nich (Planer/Pomodoro/Quick Notes) mají tutéž onClick akci jako
  // stejnojmenné dlaždice výš.
  const nastroje: FlagshipDlazdice[] = [
    {
      id: 'exam-prep',
      nazev: 'Maturitní centrum',
      popis: 'Příprava na maturitu',
      ikona: 'exam-prep',
      barva: 'pink',
      onClick: () => otevritMiniaplikaci('exam-prep'),
    },
    {
      id: 'flashcards',
      nazev: 'Flashcards',
      popis: 'Kartičky na učení',
      ikona: 'flashcards',
      barva: 'cyan',
      onClick: () => otevritMiniaplikaci('flashcards'),
    },
    {
      id: 'math-solver',
      nazev: 'Math Solver',
      popis: 'Spočítej výrazy',
      ikona: 'math-solver',
      barva: 'green',
      onClick: () => otevritMiniaplikaci('math-solver'),
    },
    {
      id: 'planer-nastroj',
      nazev: 'Planer',
      popis: 'Sleduj úkoly',
      ikona: 'study-planner',
      barva: 'green',
      onClick: () => otevritMiniaplikaci('study-planner'),
    },
    {
      id: 'pomodoro-nastroj',
      nazev: 'Pomodoro',
      popis: 'Soustřeď se',
      ikona: 'pomodoro',
      barva: 'orange',
      onClick: () => otevritMiniaplikaci('pomodoro'),
    },
    {
      id: 'quick-notes-nastroj',
      nazev: 'Quick Notes',
      popis: 'Zapiš si myšlenky',
      ikona: 'quick-notes',
      barva: 'pink',
      onClick: () => otevritMiniaplikaci('quick-notes'),
    },
    {
      id: 'document-editor',
      nazev: 'Textový editor',
      popis: 'Napiš a uprav dokument',
      ikona: 'document-editor',
      barva: 'green',
      onClick: () => otevritMiniaplikaci('document-editor'),
    },
    {
      id: 'mind-map',
      nazev: 'Mind Map',
      popis: 'Myšlenkové mapy',
      ikona: 'mind-map',
      barva: 'cyan',
      onClick: () => otevritMiniaplikaci('mind-map'),
    },
  ]

  // Do slotů "Můj widget" jde připnout i pět nástrojů, co v pevné
  // šestici dlaždic místo nemají (Planer/Pomodoro/Quick Notes tam už
  // jsou pod jinými id — viz komentář nahoře, proč se tu neopakují).
  const dalsiMoznostiProSloty = nastroje.filter((n) =>
    ['exam-prep', 'flashcards', 'math-solver', 'document-editor', 'mind-map'].includes(n.id)
  )

  return (
    <>
      <FlagshipShell
        nazev="School Room"
        popisHlavicky="Škola na jednom místě"
        ikonaHlavicky="layers"
        velkeKarty={velkeKarty}
        // Zvonek v hlavičce vede na stejnou novou obrazovku jako
        // dlaždice "Upozornění" výš — School Room už si vyžádaným
        // panelem přes sheet neotvírá, notifOpen proto zůstává natvrdo
        // zavřený (FlagshipShell.tsx ho pořád vyžaduje jako prop, ale
        // nikdy se nenastaví na true).
        notifOpen={false}
        onOpenNotifications={() => navigate('/skola/upozorneni')}
        onCloseNotifications={() => {}}
      >
        {/* "Moje přehled" — School Room je poslední z pokojů, co dostal
            vlastní panel s reálnými daty (Fitness/Economy/Growth/Music
            Room ho měly od začátku); dřív tu bylo jen "Statistiky" jako
            zkratka na /odmeny. Tři čísla, žádné vymyšlené — nesplněné
            úkoly z Planeru, nadcházející události z Kalendáře (spočtené
            z jeho vlastního dnySUdalosti, ne nová appka), a celkem
            dokončené Pomodoro bloky. Prázdný/nulový stav je vlastní
            přátelská věta, ne holá "0". */}
        <div className="sr-panel">
          <div className="sr-panel-hlavicka">
            <h2>Moje přehled</h2>
            <p>Co tě dnes čeká ve škole</p>
          </div>

          <div className="sr-staty">
            <div className="sr-stat-radek">
              <span className="sr-stat-ikona fs-barva--green">
                <AppIcon name="study-planner" size={18} />
              </span>
              <span className="sr-stat-text">
                <span className="sr-stat-nazev">Nesplněné úkoly</span>
                <span className="sr-stat-hodnota">
                  {pendingCount > 0 ? pendingCount : 'Vše splněno! 🎉'}
                </span>
              </span>
            </div>

            <div className="sr-stat-radek">
              <span className="sr-stat-ikona fs-barva--purple">
                <AppIcon name="calendar" size={18} />
              </span>
              <span className="sr-stat-text">
                <span className="sr-stat-nazev">Nadcházející události</span>
                <span className="sr-stat-hodnota">
                  {nadchazejiciUdalosti > 0 ? nadchazejiciUdalosti : 'Žádné naplánované'}
                </span>
              </span>
            </div>

            <div className="sr-stat-radek">
              <span className="sr-stat-ikona fs-barva--orange">
                <AppIcon name="pomodoro" size={18} />
              </span>
              <span className="sr-stat-text">
                <span className="sr-stat-nazev">Dokončené Pomodoro bloky</span>
                <span className="sr-stat-hodnota">
                  {completedSessions > 0 ? completedSessions : 'Zatím žádné'}
                </span>
              </span>
            </div>
          </div>
        </div>

        <MujWidgetPanel id="school-room" dlazdice={dlazdice} dalsiMoznostiProSloty={dalsiMoznostiProSloty} />
      </FlagshipShell>

      {nastrojeOtevrene && (
        <NastrojeSheet nadpis="Nástroje" nastroje={nastroje} onZavrit={() => setNastrojeOtevrene(false)} />
      )}
    </>
  )
}

export default SchoolRoomModule
