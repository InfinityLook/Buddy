import { APP_BUILD_ID, APP_VERSION } from '@/core/utils/registerSW'
import { useAuthStore } form '@/core/store/useAuthStore'
// ==========================================
// Příkazy konzole admin panelu.
//
// Jeden záznam = jeden příkaz. Přidání dalšího (až přibude správa
// aplikace přes konzoli) znamená dopsat sem novou položku, ne upravovat
// KonzolePanel.tsx — ten jen vypisuje výstup a nic neví o tom, co která
// zkratka dělá.
// ==========================================

export interface PrikazKonzole {
  popis: string
  spustit: () => string[]
}

export const PRIKAZY: Record<string, PrikazKonzole> = {
  appinfo: {
    popis: 'Vypíše stav a verzi běžící aplikace.',
    spustit: () => ['app ready', `verze: ${APP_VERSION}`, `build: ${APP_BUILD_ID}`],
  },
  help: {
    popis: 'Vypíše seznam dostupných příkazů.',
    spustit: () => ['dostupné příkazy:', ...Object.keys(PRIKAZY).map((k) => `  ${k} — ${PRIKAZY[k].popis}`)],
  },
  status:{
    popis:'Status Aplikace skutečný stav přihlášeni.',
  spustit: ()=> { 
    const prihlasen = useAuthStore.getState().isAuthed
    return[
      `Status: ${prihlasen ? 'Ano' : 'Ne'}`,
      'BuddyZone Aplikace dokončila proces',
    ],
 },
  diagnosticapp: {
    popis:'diagnostika cele aplikace jeste neni hotova'
    spustit: ()=> {
  const cas = now Date()
  return [ 
    `Čas: ${cas.toLocaleTimeString()}`,
  },
 apps: {
  popis:'Informace o Aplikacích',
    spustit: () => {
    const apps = useAppStore.getState().apps
    return [
      `Počet aplikací: ${apps.lenght}`,
    },
}

export const spustPrikaz = (vstup: string): string[] => {
  const jmeno = vstup.trim().toLowerCase()
  if (!jmeno) return []

  const prikaz = PRIKAZY[jmeno]
  if (!prikaz) return [`neznámý příkaz: ${jmeno}`, `zkus "help" pro seznam příkazů`]

  return prikaz.spustit()
}
