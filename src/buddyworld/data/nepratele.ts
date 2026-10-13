import { NepritelDef } from '../types'

// ==========================================
// Appčin jediný typ nepřítele v prototypu (zadání: "jeden funkční
// nepřítel") — malý stínový tvor appčina budoucího "Enchanted Forest"
// prostředí. Appka ho drží jako pole, ne jeden natvrdo zapsaný
// objekt, ať je přidání druhého typu později jen nový záznam, stejná
// konvence jako appčiny postavy.ts/monsters.ts jinde v appce.
// ==========================================

export const NEPRATELE: NepritelDef[] = [
  {
    id: 'stinovy-vlcek',
    jmeno: 'Stínový vlček',
    ikona: '🐺',
    maxHp: 40,
    poskozeni: 6,
    dosahUtoku: 1.5,
    dosahDetekce: 7,
    rychlost: 2.6,
    cooldownUtokuMs: 1200,
    odmenaXp: 25,
    model: null,
  },
]

export const VYCHOZI_NEPRITEL_ID = 'stinovy-vlcek'

export const nepritelPodleId = (id: string): NepritelDef => NEPRATELE.find((n) => n.id === id) ?? NEPRATELE[0]
