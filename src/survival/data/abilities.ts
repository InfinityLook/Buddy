import { SchopnostDef } from '../types'

// ==========================================
// 5 schopností (bod 11 zadání). Data existují od první verze, ale
// tlačítko 🔮 v HUD je v tomhle kroku zobrazené jen informativně —
// samotné aktivní vybírání/používání schopností a level-up karty
// (bod 11/12) přijdou v dalším kroku (viz SurvivalModule.tsx's vlastní
// komentář u HUD). Než appka umí level-up nabídku, nemá smysl
// předstírat, že schopnost jde použít, když nic neudělá.
// ==========================================

export const SCHOPNOSTI: SchopnostDef[] = [
  {
    id: 'fire_nova',
    jmeno: 'Fire Nova',
    popis: 'Výbuch kolem hráče, poškodí vše okolo.',
    ikona: '🔥',
    cooldownMs: 8000,
  },
  {
    id: 'chain_lightning',
    jmeno: 'Chain Lightning',
    popis: 'Zásah přeskočí na dalšího nepřítele.',
    ikona: '⚡',
    cooldownMs: 6000,
  },
  {
    id: 'frost_aura',
    jmeno: 'Frost Aura',
    popis: 'Zpomalí nepřátele v okolí hráče.',
    ikona: '❄️',
    cooldownMs: 10000,
  },
  {
    id: 'vampire',
    jmeno: 'Vampire',
    popis: 'Léčí hráče za zabité nepřátele.',
    ikona: '🩸',
    cooldownMs: 0,
  },
  {
    id: 'energy_shield',
    jmeno: 'Energy Shield',
    popis: 'Dočasný štít pohlcující poškození.',
    ikona: '🛡️',
    cooldownMs: 15000,
  },
]
