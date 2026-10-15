import { BossRuntimeStav, Pozice2D } from '../types'
import { BossDef } from '../data/bossove'
import { vzdalenost2D } from './engine'

// ==========================================
// Buddy World — bossí AI. Tenhle soubor NEkopíruje combat/engine.ts
// — znovupoužívá jeho vzdalenost2D a (ve scéně) i jeho generické
// pokusUtokHrace/melByRespawnovat beze změny, protože ty funkce
// zajímá jen tvar NepritelRuntimeStav (hp/faze/respawnOdMs), který
// BossRuntimeStav dědí. Co je tady navíc je přesně to, co dělá bosse
// bossem, ne jen běžného nepřítele s větším HP: boss nikdy
// automaticky nehoní hráče, dokud ho hráč sám nevzbudí
// (probuditBosse); jednou nastavená zuřivost se nevypne zpátky, jakmile
// HP klesne pod zuriPodHp; a druhý, otřesový útok s vlastním dosahem
// a cooldownem, nezávislým na prvním (melee) útoku.
// ==========================================

export const vytvorBossRuntime = (defId: string, maxHp: number, pozice: Pozice2D): BossRuntimeStav => ({
  defId,
  hp: maxHp,
  pozice,
  faze: 'klid',
  posledniUtokMs: -Infinity,
  respawnOdMs: -Infinity,
  probuzen: false,
  zuri: false,
  posledniOtresUtokuMs: -Infinity,
})

/** Smí hráč bosse vzbudit — appka tím pro HUD rozhoduje, kdy se
 *  zobrazí tlačítko "Vyzvat". Jen pro dormantního (nevzbuzeného) a
 *  živého bosse v dosahu probuzení. */
export const melByProbuditBosse = (boss: BossRuntimeStav, def: BossDef, vzdalenostKHraci: number): boolean =>
  !boss.probuzen && boss.faze !== 'mrtvy' && vzdalenostKHraci <= def.dosahProbuzeni

/** Vzbudí bosse — no-op, pokud je už vzbuzený, ať volající (scéna)
 *  nemusí sama hlídat, že tuhle funkci zavolá jen jednou. */
export const probuditBosse = (boss: BossRuntimeStav): BossRuntimeStav =>
  boss.probuzen ? boss : { ...boss, probuzen: true, faze: 'honi' }

/** Jeden snímek bossí AI — boss se vůbec nehýbe ani neútočí, dokud
 *  není probuzen; jakmile je, appka ho honí/útočí stejně jako běžné
 *  nepřátele v combat/engine.ts's krokAI. Zuřivost se přepočítá z
 *  aktuálního HP, ale jakmile jednou nastane, appka ji dál nevrací
 *  zpátky na false. */
export const krokAiBosse = (
  boss: BossRuntimeStav,
  def: BossDef,
  hracPozice: Pozice2D,
  dtSekund: number
): BossRuntimeStav => {
  if (boss.faze === 'mrtvy' || !boss.probuzen) return boss

  const vzd = vzdalenost2D(boss.pozice, hracPozice)
  const zuriNyni = boss.zuri || boss.hp <= def.maxHp * def.zuriPodHp

  if (vzd <= def.dosahUtoku) {
    return boss.faze === 'utoci' && boss.zuri === zuriNyni ? boss : { ...boss, faze: 'utoci', zuri: zuriNyni }
  }

  const smerX = (hracPozice.x - boss.pozice.x) / vzd
  const smerZ = (hracPozice.z - boss.pozice.z) / vzd
  const posun = def.rychlost * dtSekund
  return {
    ...boss,
    faze: 'honi',
    zuri: zuriNyni,
    pozice: { x: boss.pozice.x + smerX * posun, z: boss.pozice.z + smerZ * posun },
  }
}

export interface VysledekOtresuBosse {
  provedeno: boolean
  poskozeni: number
  boss: BossRuntimeStav
}

/** Druhý bossí útok — plošný otřes země. Appka ho spouští jen podle
 *  dosahu a vlastního cooldownu, nezávisle na faze "utoci" (funguje
 *  i za chůze, ne jen v melee dosahu prvního útoku). */
export const pokusUtokOtresemBosse = (
  boss: BossRuntimeStav,
  def: BossDef,
  vzdalenostKHraci: number,
  casMs: number
): VysledekOtresuBosse => {
  if (boss.faze === 'mrtvy' || !boss.probuzen) return { provedeno: false, poskozeni: 0, boss }
  if (vzdalenostKHraci > def.dosahUtokuOtresu) return { provedeno: false, poskozeni: 0, boss }
  if (casMs - boss.posledniOtresUtokuMs < def.cooldownUtokuOtresuMs) return { provedeno: false, poskozeni: 0, boss }

  return {
    provedeno: true,
    poskozeni: aplikujZuriNaPoskozeni(def.poskozeniOtresu, boss, def),
    boss: { ...boss, posledniOtresUtokuMs: casMs },
  }
}

/** Vynásobí poškození zuřivostí, pokud je aktivní — scéna ji volá pro
 *  melee i otřesový útok stejně. */
export const aplikujZuriNaPoskozeni = (poskozeni: number, boss: BossRuntimeStav, def: BossDef): number =>
  boss.zuri ? Math.round(poskozeni * def.zuriNasobicPoskozeni) : poskozeni

/** Znovu vytvoří bosse po uplynutí respawnu — appka ho vrátí zpátky
 *  dormantního (ne hned honícího), hráč ho musí znovu vzbudit, ne že
 *  by boss automaticky pokračoval tam, kde přestal. Pevná pozice
 *  lairu, ne nahodilá jako appka u běžných nepřátel. */
export const obnovBosse = (defId: string, maxHp: number, pozice: Pozice2D): BossRuntimeStav =>
  vytvorBossRuntime(defId, maxHp, pozice)
