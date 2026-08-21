// ==========================================
// Postup jednotlivé postavy — level, XP, dovednostní body. Na rozdíl
// od účtového XP/kreditů/odznaků (core/store) je tohle vázané na
// konkrétní postavu v partě: smazání postavy smaže i její postup,
// stejně jako by smazalo uloženou hru.
//
// Křivka je záměrně jednoduchá lineární rampa, ne exponenciála — cíl
// je aby se to dalo dohrát na max. úroveň za rozumný počet soubojů,
// ne nekonečný grind. Při MAX_UROVEN přesně dojdou i dovednostní body
// (1 za úroveň, 3 uzly × 3 stupně = 9 bodů na 9 postupů z úrovně 1).
// ==========================================

export type Dovednost = 'vydrz' | 'sila' | 'presnost'

export interface PostavaProgres {
  uroven: number
  /** XP nasbírané v rámci aktuální úrovně (ne kumulativní od začátku). */
  xp: number
  dovednostniBody: number
  dovednosti: Record<Dovednost, number>
}

export const MAX_UROVEN = 10
export const MAX_DOVEDNOST_RANK = 3

export const vychoziProgres = (): PostavaProgres => ({
  uroven: 1,
  xp: 0,
  dovednostniBody: 0,
  dovednosti: { vydrz: 0, sila: 0, presnost: 0 },
})

/** Kolik XP je potřeba nasbírat, aby postava z dané úrovně postoupila na další. */
export const xpProDalsiUroven = (uroven: number): number => 40 + (uroven - 1) * 25

/** Připočte XP a vrátí novou hodnotu progresu — může postoupit i o víc
 *  úrovní najednou, pokud odměna stačí. Zastaví se na MAX_UROVEN. */
export const pripocistXp = (progres: PostavaProgres, xp: number): PostavaProgres => {
  let { uroven, xp: aktualniXp, dovednostniBody } = progres
  aktualniXp += Math.max(0, Math.floor(xp))

  while (uroven < MAX_UROVEN) {
    const potreba = xpProDalsiUroven(uroven)
    if (aktualniXp < potreba) break
    aktualniXp -= potreba
    uroven += 1
    dovednostniBody += 1
  }

  if (uroven >= MAX_UROVEN) aktualniXp = 0

  return { ...progres, uroven, xp: aktualniXp, dovednostniBody }
}

export const POPIS_DOVEDNOSTI: Record<Dovednost, { nazev: string; ikona: string; efektNaStupen: string }> = {
  vydrz: { nazev: 'Výdrž', ikona: '❤️', efektNaStupen: '+8 výdrže' },
  sila: { nazev: 'Síla', ikona: '💪', efektNaStupen: '+5 % poškození' },
  presnost: { nazev: 'Přesnost', ikona: '🎯', efektNaStupen: '+3 % kritická šance' },
}

/** Bojové bonusy plynoucí z úrovně a dovedností — přičítají se k
 *  postaviným vlastním číslům i k bonusům z obchodu (viz useSouboj.ts). */
export const bojoveBonusyZProgresu = (progres: PostavaProgres) => ({
  vydrz: (progres.uroven - 1) * 2 + progres.dovednosti.vydrz * 8,
  poskozeni: progres.dovednosti.sila * 0.05,
  kriticka: progres.dovednosti.presnost * 0.03,
})
