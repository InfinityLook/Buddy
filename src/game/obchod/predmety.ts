import { Predmet } from './types'

// ==========================================
// Trvalé vylepšení koupené za kredity z arény/dungeonu. Jedno tržiště
// zatím existuje (Tržiště Brodů), takže položky nejsou vázané na
// konkrétní lokaci jako nepratele.ts — kdyby přibylo druhé tržiště
// s jiným výběrem, tohle se rozdělí stejným vzorem (mapa id -> Predmet[]).
//
// Vlastnictví se ukládá do useWalletStore.ownedItems — stejná
// mechanika jako kosmetika ze Shopu, žádný nový systém. Efekt se
// aplikuje ve useSouboj.ts pro KAŽDOU postavu stejně (jde o účet, ne
// o konkrétní postavu) — koupí to ten, koho zrovna hraješ, ale těží
// z toho celá parta.
// ==========================================

export const PREDMETY: Predmet[] = [
  {
    id: 'elixir-vytrvalosti',
    nazev: 'Elixír vytrvalosti',
    popis: 'Trvale zvyšuje výdrž o 15 ve všech soubojích.',
    ikona: '🧪',
    cena: 80,
    efekt: '+15 výdrže',
  },
  {
    id: 'nabrousena-cepel',
    nazev: 'Nabroušená čepel',
    popis: 'Trvale zvyšuje poškození všech karet o 10 %.',
    ikona: '🗡️',
    cena: 100,
    efekt: '+10 % poškození',
  },
  {
    id: 'stastna-mince',
    nazev: 'Šťastná mince',
    popis: 'Trvale zvyšuje šanci na kritický zásah o 5 %.',
    ikona: '🍀',
    cena: 90,
    efekt: '+5 % kritická šance',
  },
]
