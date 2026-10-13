import { BuddyWorldHracStav } from './types'

// ==========================================
// Buddy Worldův hráčův postup — level/XP/HP, čisté funkce bez
// Threejs a bez Reactu (appka je stejně snadno jednotkově testuje
// jako Buddyheimovo game/leveling.ts). Appka zvolila stejnou
// jednoduchou lineární rampu jako appčin Buddyheim — appka chce, aby
// šlo level dohrát za rozumný počet souborů, ne nekonečný grind.
// appka tu NEMÁ dovednostní body ani partu postav — appčin Buddy
// World má jen JEDNOHO hráče.
// ==========================================

export const MAX_LEVEL = 20
export const ZAKLADNI_MAX_HP = 60
export const MAX_HP_ZA_UROVEN = 8

/** Kolik XP appka potřebuje nasbírat, aby hráč z dané úrovně postoupil na další. */
export const xpProDalsiUroven = (level: number): number => 25 + (level - 1) * 12

export const vychoziHracStav = (): BuddyWorldHracStav => ({
  level: 1,
  xp: 0,
  maxHp: ZAKLADNI_MAX_HP,
  hp: ZAKLADNI_MAX_HP,
})

/** appka postaví appčin hráčův stav z trvale uloženého levelu/XP
 *  (viz useBuddyWorldStore.ts) — maxHp appka nikdy nepersistuje,
 *  appka ho vždycky znovu spočítá odsud, a appka hráče při každém
 *  vstupu do appčiny scény nastaví na plné HP (appka tak nikdy
 *  neuloží "zraněného" hráče mezi relacemi, appčina stejná zásada
 *  jako appčino plneUzdravit() po appčině smrti). */
export const hracStavZUrovne = (level: number, xp: number): BuddyWorldHracStav => {
  const platnyLevel = Math.max(1, Math.min(MAX_LEVEL, Math.floor(level)))
  const maxHp = ZAKLADNI_MAX_HP + (platnyLevel - 1) * MAX_HP_ZA_UROVEN
  return { level: platnyLevel, xp: Math.max(0, Math.floor(xp)), maxHp, hp: maxHp }
}

/** appka připočte XP a postoupí o úroveň, dokud odměna stačí — appka
 *  to zastaví na MAX_LEVEL. Postup o úroveň appce zvětší maximální
 *  HP a appka hráče rovnou uzdraví na novou plnou hodnotu — appka ho
 *  tak odměňuje skutečným pocitem síly, ne jen rostoucím číslem. */
export const pripocistXp = (stav: BuddyWorldHracStav, xp: number): BuddyWorldHracStav => {
  let { level, xp: aktualniXp, maxHp } = stav
  let hp = stav.hp
  aktualniXp += Math.max(0, Math.floor(xp))
  let postoupil = false

  while (level < MAX_LEVEL) {
    const potreba = xpProDalsiUroven(level)
    if (aktualniXp < potreba) break
    aktualniXp -= potreba
    level += 1
    maxHp += MAX_HP_ZA_UROVEN
    postoupil = true
  }

  if (level >= MAX_LEVEL) aktualniXp = 0
  if (postoupil) hp = maxHp

  return { level, xp: aktualniXp, maxHp, hp }
}

/** appka sníží HP o poškození a nepustí ho pod nulu. */
export const utrzetPoskozeni = (stav: BuddyWorldHracStav, poskozeni: number): BuddyWorldHracStav => ({
  ...stav,
  hp: Math.max(0, stav.hp - Math.max(0, poskozeni)),
})

export const jeMrtvyHrac = (stav: BuddyWorldHracStav): boolean => stav.hp <= 0

/** appka uzdraví hráče zpátky na plné HP — appka ji volá po smrti, ať
 *  hráč nemusí appku kvůli jednomu neúspěchu znovu nahrávat. */
export const plneUzdravit = (stav: BuddyWorldHracStav): BuddyWorldHracStav => ({ ...stav, hp: stav.maxHp })
