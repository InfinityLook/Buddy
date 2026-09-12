import { ZbranDef } from '../types'

// ==========================================
// 5 zbraní (bod 10 zadání). Appka teď umí doopravdy vybrat/vystřídat
// zbraň (appčino "co dál tam chybí" bod 4) — viz useSurvivalStore.ts's
// vlastní odemceneZbrane/vybranaZbran a engine.ts's vytvorHrace, co
// dosah/rychlost útoku i damage doopravdy počítá z VYBRANÉ zbraně, ne
// jen z natvrdo zadrátovaného Iron Swordu jako dřív.
//
// `odemkovaciCena` (Gold, appčina trvalá měna z useSurvivalStore) je
// `null` jen u Iron Swordu — appka s ním hráče startuje odjakživa,
// nemá smysl si ho "odemykat" za měnu, kterou navíc čerstvý účet ještě
// ani nemá. Zbylé čtyři škálují zhruba podle rarity, ne podle žádného
// přesného vzorce — appka tu nemá dost dat (jeden běh appky samotné)
// na to, aby cenu doopravdy vyladila, jen zajišťuje, ať vzácnější
// zbraň stojí víc.
//
// `efekt` zůstává zatím JEN popisný text (appka ho zobrazuje na
// Výbava obrazovce) — samotné elementární chování (zapálení/zpomalení/
// řetězení/probodnutí) appka schválně NEPŘEDSTÍRÁ jako implementované,
// stejná "nepředstírej funkčnost, co ještě nemá" zásada jako appka měla
// u schopností, než Chain Lightning/Frost Aura doopravdy fungovaly —
// zbraně dnes reálně mění damage/dosah/rychlost útoku, ne svůj vlastní
// efekt, a to je poctivé, ne nedodělané.
// ==========================================

export const ZBRANE: ZbranDef[] = [
  {
    id: 'iron_sword',
    jmeno: 'Iron Sword',
    rarita: 'bezna',
    damage: 18,
    utokyZaSekundu: 1.3,
    dosah: 3.2,
    efekt: 'Žádný — spolehlivá základní zbraň.',
    ikona: '⚔️',
  },
  {
    id: 'flame_blade',
    jmeno: 'Flame Blade',
    rarita: 'neobvykla',
    damage: 22,
    utokyZaSekundu: 1.1,
    dosah: 3.0,
    efekt: 'Zapálí nepřítele — poškození navíc v čase.',
    ikona: '🔥',
    odemkovaciCena: 150,
  },
  {
    id: 'frost_staff',
    jmeno: 'Frost Staff',
    rarita: 'vzacna',
    damage: 14,
    utokyZaSekundu: 1.6,
    dosah: 5.5,
    efekt: 'Zpomalí zasaženého nepřítele.',
    ikona: '❄️',
    odemkovaciCena: 300,
  },
  {
    id: 'thunder_blade',
    jmeno: 'Thunder Blade',
    rarita: 'epicka',
    damage: 20,
    utokyZaSekundu: 1.2,
    dosah: 3.4,
    efekt: 'Zásah přeskočí na dalšího blízkého nepřítele.',
    ikona: '⚡',
    odemkovaciCena: 600,
  },
  {
    id: 'void_scythe',
    jmeno: 'Void Scythe',
    rarita: 'legendarni',
    damage: 34,
    utokyZaSekundu: 0.8,
    dosah: 2.6,
    efekt: 'Probodne a zasáhne všechny nepřátele v linii.',
    ikona: '🌑',
    odemkovaciCena: 1200,
  },
]

export const VYCHOZI_ZBRAN = ZBRANE[0]

export const zbranPodleId = (id: string): ZbranDef => ZBRANE.find((z) => z.id === id) ?? VYCHOZI_ZBRAN
