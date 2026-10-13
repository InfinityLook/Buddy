import { MaskotDef } from '../types'

// ==========================================
// Čtyři elementální maskoti — appčini budoucí plnohodnotní společníci
// (zadání žádá EMBER/MOSS/NYX/FROST jmenovitě). Appka má datový model
// pro všechny čtyři hotový od první appčiny appky, ale jen EMBER je
// dnes doopravdy odemčený/hratelný ("použij jednoho dočasného Buddyho
// jako aktivního společníka pro teď") — appčin výběr v
// VyberMaskota.tsx ukazuje zbylé tři jako viditelné, ale appkou
// zamčené, ne appkou skryté, ať appka nepředstírá víc, než doopravdy
// umí.
//
// Barvy appka odvodila od elementu, ne appkou nazdařbůh — appka tak
// dostala vizuální identitu zadarmo ještě před doopravdy hotovým
// modelem (appčin primitivní "jádro + záře" render v
// useBuddyWorldScene.ts čte barvaJadro/barvaZar přímo odsud, appka
// scénu nemusí měnit, až budoucí model dorazí, jen appčino `model`
// pole přestane být `null`).
// ==========================================

export const MASKOTI: MaskotDef[] = [
  {
    id: 'ember',
    jmeno: 'Ember',
    element: 'oheň',
    popis: 'Ohnivý společník, odvážný a vždy první v akci.',
    ikona: '🔥',
    barvaJadro: '#ff7a3d',
    barvaZar: '#ffb347',
    model: null,
    odemcenyOdZacatku: true,
  },
  {
    id: 'moss',
    jmeno: 'Moss',
    element: 'příroda',
    popis: 'Klidný přírodní společník, který hráče podporuje a léčí.',
    ikona: '🌿',
    barvaJadro: '#4fae5e',
    barvaZar: '#8fd99a',
    model: null,
    odemcenyOdZacatku: false,
  },
  {
    id: 'nyx',
    jmeno: 'Nyx',
    element: 'magie',
    popis: 'Záhadný magický společník s hlubokou fialovou aurou.',
    ikona: '🔮',
    barvaJadro: '#8b5cf6',
    barvaZar: '#c4b5fd',
    model: null,
    odemcenyOdZacatku: false,
  },
  {
    id: 'frost',
    jmeno: 'Frost',
    element: 'led',
    popis: 'Chladný, obranný společník — vytrvalý a spolehlivý.',
    ikona: '❄️',
    barvaJadro: '#5ec9f0',
    barvaZar: '#b8e8f7',
    model: null,
    odemcenyOdZacatku: false,
  },
]

export const VYCHOZI_MASKOT_ID = 'ember'

export const maskotPodleId = (id: string): MaskotDef => MASKOTI.find((m) => m.id === id) ?? MASKOTI[0]
