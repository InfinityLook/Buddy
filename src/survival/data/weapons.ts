import { ZbranDef } from '../types'

// ==========================================
// 5 zbraní (bod 10 zadání). V první verzi hráč hraje jen s Iron
// Sword (VYCHOZI_ZBRAN) — výběr/odemykání zbraní přijde v dalším
// kroku (viz komentář v useSurvivalStore.ts), ale data pro všech pět
// existují už teď, ne jen jako plán.
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
  },
]

export const VYCHOZI_ZBRAN = ZBRANE[0]
