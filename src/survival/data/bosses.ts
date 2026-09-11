import { BossDef } from '../types'

// ==========================================
// Boss systém (bod 8 zadání). SHADOW_WOLF je jediný PLNĚ implementovaný
// boss — tři fáze (100 % normální útok / 70 % zrychlení / 30 %
// teleport + speciální úder), skutečně vyhodnocované v engine/engine.ts.
//
// BOSS_PODLE_VLNY mapuje milník vlny na bosse, co se tam objeví —
// architektura pro Blood Demon (20)/Inferno Golem (30)/Frost Queen
// (40)/Void King (50) je připravená (stačí přidat další BossDef a
// řádek do týhle tabulky), ale ve skutečnosti dnes NEJSOU
// naimplementovaní — na vlnách 20/30/40/50 appka poctivě znovu použije
// Shadow Wolfa se zesíleným statMultiplikatorem z waves.ts, ne
// vymyšleného bosse, co by jen vypadal jako Blood Demon. To je záměrně
// přiznané omezení první verze (viz finální report), ne skrytá chyba.
// ==========================================

export const SHADOW_WOLF: BossDef = {
  id: 'shadow_wolf',
  jmeno: 'Shadow Wolf',
  emoji: '👹',
  hp: 3000,
  damage: 30,
  rychlost: 2.0,
  xp: 400,
  gold: 200,
  polomer: 1.3,
  teleportCooldownMs: 4000,
  faze: [
    { podHp: 1.0, nazev: 'Normální útok', nasobicRychlosti: 1, nasobicPoskozeni: 1, specialita: 'zadna' },
    { podHp: 0.7, nazev: 'Zrychlení', nasobicRychlosti: 1.6, nasobicPoskozeni: 1, specialita: 'zadna' },
    { podHp: 0.3, nazev: 'Teleport a smrtící úder', nasobicRychlosti: 1.6, nasobicPoskozeni: 1.8, specialita: 'teleport' },
  ],
}

/** Milník vlny → boss, co se tam objeví. Jen 10 je dnes skutečný —
 *  zbytek je architektura připravená pro budoucí bossy (viz komentář
 *  výš), dokud nepřibudou, appka na vlnách 20/30/40/50 znovu použije
 *  Shadow Wolfa (viz waves.ts's vytvorBossePodleVlny). */
export const BOSS_PODLE_VLNY: Record<number, BossDef> = {
  10: SHADOW_WOLF,
}

/** Vrátí bosse pro danou milníkovou vlnu (násobek 10). Dokud appka
 *  nemá skutečné bossy pro 20/30/40/50, poctivě vrací Shadow Wolfa —
 *  jeho statMultiplikator (waves.ts) ho na vyšších vlnách zesílí, ať
 *  je pořád aspoň trochu výzva, ne stejně silný boss navěky. */
export const bossProVlnu = (vlnaMilnik: number): BossDef => BOSS_PODLE_VLNY[vlnaMilnik] ?? SHADOW_WOLF
