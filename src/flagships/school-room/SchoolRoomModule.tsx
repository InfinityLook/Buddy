import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/core/store/useAppStore'
import { FlagshipShell } from '../shared/FlagshipShell'
import { MujWidgetPanel } from '../shared/MujWidgetPanel'
import { NastrojeSheet } from '../shared/NastrojeSheet'
import type { FlagshipDlazdice, FlagshipVelkaKarta } from '../shared/types'

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
  const [notifOpen, setNotifOpen] = useState(false)
  const [nastrojeOtevrene, setNastrojeOtevrene] = useState(false)

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
      // notifOpen prop) — dlaždice tu není nic navíc, jen druhá cesta
      // ke stejnému panelu.
      onClick: () => setNotifOpen(true),
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
      // /odmeny (RewardModule) už úroveň/XP/sérii/odznaky ukazuje —
      // žádná nová obrazovka, jen zkratka na tu existující.
      onClick: () => navigate('/odmeny'),
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
        notifOpen={notifOpen}
        onOpenNotifications={() => setNotifOpen(true)}
        onCloseNotifications={() => setNotifOpen(false)}
      >
        <MujWidgetPanel id="school-room" dlazdice={dlazdice} dalsiMoznostiProSloty={dalsiMoznostiProSloty} />
      </FlagshipShell>

      {nastrojeOtevrene && (
        <NastrojeSheet nadpis="Nástroje" nastroje={nastroje} onZavrit={() => setNastrojeOtevrene(false)} />
      )}
    </>
  )
}

export default SchoolRoomModule
