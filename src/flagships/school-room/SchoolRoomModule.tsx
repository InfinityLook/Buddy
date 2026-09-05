import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/core/store/useAppStore'
import { FlagshipShell } from '../shared/FlagshipShell'
import type { FlagshipDlazdice, FlagshipVelkaKarta } from '../shared/types'

// ==========================================
// School Room — první "vlajková appka" appky (viz FlagshipShell.tsx
// pro celé zdůvodnění sdíleného pláště). Sama definuje jen svých šest
// dlaždic a dvě velké karty, zbytek (hlavička, sloty "Můj widget",
// spodní lišta) je společný.
//
// Pomodoro/Poznámky/Úkoly/Soubory jsou přesunuté, ne nové miniaplikace
// — mají v useAppStore.ts's DEFAULT_APPS teď `active: false` (schované
// z hlavní mřížky /apps, School Room je jejich jediný běžný vchod), ale
// deep-link přes setActiveAppId funguje úplně stejně jako dřív z Hubu
// na Planer. Kalendář je jediná ze šesti, co appka do teď vůbec neměla
// (src/miniapps/kalendar/). Statistiky nejsou vlastní miniaplikace —
// /odmeny (RewardModule) už přesně tohle (úroveň/XP/série/odznaky)
// ukazuje, stavět to podruhé by bylo zbytečné zdvojení.
// ==========================================

export const SchoolRoomModule: React.FC = () => {
  const navigate = useNavigate()
  const setActiveAppId = useAppStore((s) => s.setActiveAppId)
  const [notifOpen, setNotifOpen] = useState(false)

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
      id: 'apps',
      nazev: 'Apps',
      popis: 'Tvé školní aplikace na dosah',
      ikona: 'grid',
      barva: 'purple',
      // Nefiltrovaná hlavní mřížka — appky, co se do School Roomu
      // nepřesunuly (Math Solver, Flashcards, Mind Map, ...), zůstávají
      // tam, kde vždycky byly.
      onClick: () => navigate('/apps'),
    },
  ]

  return (
    <FlagshipShell
      id="school-room"
      nazev="School Room"
      popisHlavicky="Škola na jednom místě"
      ikonaHlavicky="layers"
      dlazdice={dlazdice}
      velkeKarty={velkeKarty}
      notifOpen={notifOpen}
      onOpenNotifications={() => setNotifOpen(true)}
      onCloseNotifications={() => setNotifOpen(false)}
    />
  )
}

export default SchoolRoomModule
