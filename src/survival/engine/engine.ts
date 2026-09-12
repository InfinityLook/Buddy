import {
  SurvivalHerniStav,
  NepritelInstance,
  HracStav,
  Pozice2D,
  PostavaDef,
  ZaznamUdalosti,
} from '../types'
import { MONSTRA } from '../data/monsters'
import { vypocitejVlnu, jeBossVlna, jeExtrakcniVlna } from '../data/waves'
import { bossProVlnu } from '../data/bosses'
import { vyhodnotZabiti } from './loot'
import { PERKY, EfektPerku, POCET_VOLEB_PERKU, MAX_KRITICKA_SANCE } from '../data/perky'
import { prahXpProUroven } from '../data/uroven'
import { SYNERGIE, jeSynergieSplnena } from '../data/synergie'
import { SCHOPNOSTI } from '../data/abilities'

// ==========================================
// Survival Night — čistý herní tick (bod 26/27 zadání: Game Engine,
// Wave Manager a Combat System oddělené od Reactu a od vykreslování).
// Žádný import z Reactu, Three.js ani ze storu — jen data + stav.
//
// DŮLEŽITÁ ODCHYLKA od zavedeného appčina vzoru (combat/engine.ts u
// Souboje vrací při každém ticku NOVÝ objekt stavu — čistě funkční
// styl). Tady stav MUTUJEME přímo, schválně: jeden běh může mít
// desítky až stovky živých nepřátel aktualizovaných 60×/s, a
// rekonstruovat pole/objekty pro každého z nich při každém snímku by
// znamenalo trvalý tlak na garbage collector — přesně to, před čím
// appka varuje v bodě 26 zadání ("žádné zbytečné re-rendery/nekontrolo-
// vané smyčky"). `krokHry` je i tak plně testovatelný bez Reactu/
// prohlížeče (injektovatelné `nahodne`), jen vrací tentýž stav, co
// dostal na vstupu, už upravený.
// ==========================================

// Zmenšeno z původních 22 — reálný screenshot z ověřovacího testu
// ukázal, že s tak velkou arénou a přiměřeným zorným polem kamery
// (scene/useSurvivalScene.ts) bylo monstrum spawnuté na boku nebo za
// hráčem prakticky mimo záběr, takže ho hráč neviděl přicházet vůbec
// — skutečný problém hratelnosti (bod 25/32 zadání), ne jen kosmetika.
export const ARENA_POLOMER = 15
const HRAC_POLOMER = 0.5
/** Jak často může jeden konkrétní nepřítel zranit hráče kontaktně. */
const KONTAKT_COOLDOWN_MS = 700
/** Jak často útočí 'strelec' typ z dálky. */
const RANGED_COOLDOWN_MS = 1500
const MAX_LOG_ZAZNAMU = 6
/** Bod 18 zadání — bezpečná extrakce vyplatí o čtvrtinu víc Gold/
 *  Crystal, než by hráč měl, kdyby prostě umřel se stejnou kořistí v
 *  ruce — skutečná odměna za riziko "možná přijdu o všechno", ne jen
 *  kosmetický nápis "extrahováno". */
export const EXTRAKCE_BONUS_NASOBIC = 1.25

// Bod 11/12 zadání (krok 4/4) — appka umí opravdu POUŽÍT jen tyhle dvě
// z pěti katalogových schopností (data/abilities.ts) zatím; zbylé tři
// (chain_lightning/frost_aura/vampire) appka nechává v katalogu i v
// HUDu (jen jako zamčené/informativní ikony) — stejná "appka
// nepředstírá funkčnost, co ještě nemá" zásada, co CLAUDE.md popisuje
// u celého bodu 11/12 před krokem 2. Exportováno, ať appka nemá druhou,
// nezávislou kopii týhle sady v HUD.tsx.
export const SCHOPNOSTI_IMPLEMENTOVANE = new Set(['fire_nova', 'energy_shield'])
/** Fire Nova zasáhne vše v tomhle poloměru kolem hráče. */
const FIRE_NOVA_POLOMER = 4
/** Poškození Fire Novy appka počítá jako násobek hráčovy VLASTNÍ
 *  damage staty (ne pevné číslo) — schopnost tak roste s buildem
 *  (perky/synergie) přesně stejně jako obyčejný auto-útok, místo aby
 *  se stala buď zbytečnou, nebo přehnaně silnou nezávisle na tom, co
 *  hráč mezitím nasbíral. */
const FIRE_NOVA_NASOBIC = 2.5
/** Kolik poškození dokáže Energy Shield pohltit — základ plus podíl
 *  hráčova maxHp, ať build se sílenou Vitalitou dostane úměrně
 *  odolnější štít, ne pořád stejné pevné číslo. */
const ENERGY_SHIELD_ABSORPCE_ZAKLAD = 40
const ENERGY_SHIELD_ABSORPCE_Z_MAXHP = 0.2
/** "Dočasný" (temporary) — štít appka zruší i s nespotřebovanou
 *  kapacitou, jakmile uplyne tenhle čas od aktivace. */
const ENERGY_SHIELD_TRVANI_MS = 5000

let poradiId = 0
const dalsiId = (predpona: string): string => `${predpona}-${(poradiId++).toString(36)}`

export const vytvorHrace = (postava: PostavaDef): HracStav => ({
  pozice: { x: 0, z: 0 },
  hp: postava.hp,
  maxHp: postava.hp,
  rychlost: postava.rychlost,
  damage: postava.damage,
  // Dosah/rychlost útoku výchozí zbraně (Iron Sword, viz data/weapons.ts)
  // — výběr zbraně přijde v dalším kroku, teď appka rovnou startuje s ní.
  dosahUtoku: 3.2,
  utokyZaSekundu: 1.3,
  polomer: HRAC_POLOMER,
  kritickaSance: postava.kritickaSance,
  kritickyNasobic: 1.8,
  posledniUtokMs: -Infinity,
  uroven: 1,
  posledniPouzitiSchopnosti: {},
  stitAbsorpce: 0,
  stitVyprsiMs: -Infinity,
})

export const vytvorPocatecniStav = (postava: PostavaDef): SurvivalHerniStav => {
  const prvniVlna = vypocitejVlnu(1)
  return {
    cas: 0,
    vlna: 1,
    faceVlny: 'spawnuje',
    zbyvaSpawnovat: prvniVlna.pocetNepratel,
    posledniSpawnMs: -Infinity,
    aktivniNepratele: [],
    hrac: vytvorHrace(postava),
    xpZaBeh: 0,
    goldZaBeh: 0,
    krystalZaBeh: 0,
    zabitiCelkem: 0,
    bossPorazenoZaBeh: 0,
    konec: false,
    duvodKonce: null,
    log: [],
    levelUpNabidka: null,
    ziskanePerky: {},
    aplikovaneSynergie: [],
  }
}

const bodNaOkraji = (nahodne: () => number): Pozice2D => {
  const uhel = nahodne() * Math.PI * 2
  return { x: Math.cos(uhel) * ARENA_POLOMER, z: Math.sin(uhel) * ARENA_POLOMER }
}

const pridejLog = (stav: SurvivalHerniStav, text: string): void => {
  const zaznam: ZaznamUdalosti = { id: dalsiId('log'), text, cas: stav.cas }
  stav.log.unshift(zaznam)
  if (stav.log.length > MAX_LOG_ZAZNAMU) stav.log.length = MAX_LOG_ZAZNAMU
}

const spawnujMonstrum = (stav: SurvivalHerniStav, typy: string[], multiplikator: number, nahodne: () => number): void => {
  if (typy.length === 0) return
  const id = typy[Math.floor(nahodne() * typy.length)]
  const def = MONSTRA[id as keyof typeof MONSTRA]
  if (!def) return
  const pozice = bodNaOkraji(nahodne)
  stav.aktivniNepratele.push({
    id: dalsiId('nepritel'),
    defId: def.id,
    jeBoss: false,
    pozice,
    hp: Math.round(def.hp * multiplikator),
    maxHp: Math.round(def.hp * multiplikator),
    damage: Math.round(def.damage * multiplikator),
    rychlost: def.rychlost,
    polomer: def.polomer,
    typ: def.typ,
    dosahUtoku: def.dosahUtoku ?? 0,
    barva: def.barva,
    emoji: def.emoji,
    posledniUtokMs: -Infinity,
    fazeIndex: 0,
    posledniTeleportMs: -Infinity,
  })
}

const spawnujBosse = (stav: SurvivalHerniStav, multiplikator: number, nahodne: () => number): void => {
  const boss = bossProVlnu(stav.vlna)
  stav.aktivniNepratele.push({
    id: dalsiId('boss'),
    defId: boss.id,
    jeBoss: true,
    pozice: bodNaOkraji(nahodne),
    hp: Math.round(boss.hp * multiplikator),
    maxHp: Math.round(boss.hp * multiplikator),
    damage: Math.round(boss.damage * multiplikator),
    rychlost: boss.rychlost,
    polomer: boss.polomer,
    typ: 'pozemni',
    dosahUtoku: 0,
    barva: '#1a0b23',
    emoji: boss.emoji,
    posledniUtokMs: -Infinity,
    fazeIndex: 0,
    posledniTeleportMs: -Infinity,
  })
  pridejLog(stav, `👹 ${boss.jmeno} se objevil!`)
}

/** Fáze bosse podle podílu HP — faze[0].podHp musí být 1 (platí od
 *  začátku), další klesají. Appka hledá nejhlubší fázi, do které aktuální
 *  podíl HP ještě spadá. */
const fazeBosse = (hpFrac: number, faze: ReturnType<typeof bossProVlnu>['faze']): number => {
  let index = 0
  for (let i = faze.length - 1; i >= 0; i--) {
    if (hpFrac <= faze[i].podHp) {
      index = i
      break
    }
  }
  return index
}

const posunKCili = (z: Pozice2D, cil: Pozice2D, rychlost: number, dt: number): Pozice2D => {
  const dx = cil.x - z.x
  const dz = cil.z - z.z
  const vzdalenost = Math.hypot(dx, dz)
  if (vzdalenost < 0.001) return z
  const krok = Math.min(rychlost * dt, vzdalenost)
  return { x: z.x + (dx / vzdalenost) * krok, z: z.z + (dz / vzdalenost) * krok }
}

/** Skutečně sníží hráčovo HP o dané poškození — JEDINÉ místo, co ví o
 *  Energy Shieldově absorpci (stav.hrac.stitAbsorpce/stitVyprsiMs),
 *  takže žádné z míst v krokHry, co dřív dělalo `stav.hrac.hp -=
 *  poskozeni` přímo (kontaktní útok, ranged útok, bossův teleport),
 *  nemuselo dostat vlastní kopii stejné "je štít ještě aktivní"
 *  logiky. Štít appka zruší, jakmile uplyne jeho čas (i s
 *  nespotřebovanou kapacitou), NEBO jakmile appka spotřebuje celou
 *  kapacitu — cokoliv nastane dřív. */
const zpusobPoskozeniHraci = (stav: SurvivalHerniStav, poskozeni: number): void => {
  if (poskozeni <= 0) return
  let zbyva = poskozeni
  if (stav.hrac.stitAbsorpce > 0) {
    if (stav.cas <= stav.hrac.stitVyprsiMs) {
      const pohlceno = Math.min(stav.hrac.stitAbsorpce, zbyva)
      stav.hrac.stitAbsorpce -= pohlceno
      zbyva -= pohlceno
    } else {
      // Čas štítu vypršel dřív, než appka stihla spotřebovat celou
      // kapacitu — appka ho tiše zruší, ať dál "nevisí" bez efektu.
      stav.hrac.stitAbsorpce = 0
    }
  }
  if (zbyva > 0) stav.hrac.hp -= zbyva
}

/** Skutečně rozjede další vlnu — sdílené mezi normálním postupem (dole
 *  v `krokHry`, když daná vlna zrovna NENÍ extrakční bod) a
 *  `pokracovatVeVlne` (hráč se rozhodl riskovat dál po extrakční
 *  nabídce) — appka nechce dvě kopie stejné "boss, nebo běžná vlna"
 *  logiky, co by se mohly rozjet jinak. */
const zahajDalsiVlnu = (stav: SurvivalHerniStav): void => {
  stav.vlna += 1
  if (jeBossVlna(stav.vlna)) {
    stav.faceVlny = 'boss-spawnuje'
    stav.zbyvaSpawnovat = 0
  } else {
    const dalsi = vypocitejVlnu(stav.vlna)
    stav.faceVlny = 'spawnuje'
    stav.zbyvaSpawnovat = dalsi.pocetNepratel
    stav.posledniSpawnMs = -Infinity
  }
}

/** Vybere POCET_VOLEB_PERKU různých perků z celého katalogu — appka
 *  nevylučuje perky, co hráč už dřív má (stackování je záměr, viz
 *  data/perky.ts's vlastní komentář), jen v RÁMCI jedné nabídky se
 *  žádný perk neopakuje dvakrát. */
const vyberNabidkuPerku = (nahodne: () => number): string[] => {
  const dostupne = [...PERKY]
  const vybrane: string[] = []
  for (let i = 0; i < POCET_VOLEB_PERKU && dostupne.length > 0; i++) {
    const index = Math.floor(nahodne() * dostupne.length)
    vybrane.push(dostupne[index].id)
    dostupne.splice(index, 1)
  }
  return vybrane
}

/** Skutečně aplikuje jeden efekt na hráčovy statistiky — jediné místo,
 *  co ví, jak se který EfektPerku promítne do HracStav (viz
 *  data/perky.ts's vlastní komentář, proč se damage/utokyZaSekundu/
 *  dosahUtoku/rychlost násobí, kdežto maxHp/kritickyNasobic se sčítají).
 *  Sdílené mezi obyčejným perkem (vyberPerk) i bonusem ze synergie
 *  (zkontrolujSynergie, data/synergie.ts) — appka nechce druhou,
 *  nezávislou kopii týhle logiky jen proto, že bonus tentokrát nejde
 *  přes level-up kartu. */
const aplikujEfekt = (hrac: HracStav, efekt: EfektPerku, hodnota: number): void => {
  switch (efekt) {
    case 'damage':
      hrac.damage = Math.round(hrac.damage * (1 + hodnota))
      break
    case 'utokyZaSekundu':
      hrac.utokyZaSekundu *= 1 + hodnota
      break
    case 'dosahUtoku':
      hrac.dosahUtoku *= 1 + hodnota
      break
    case 'rychlost':
      hrac.rychlost *= 1 + hodnota
      break
    case 'maxHp':
      hrac.maxHp += hodnota
      hrac.hp += hodnota
      break
    case 'kritickaSance':
      hrac.kritickaSance = Math.min(MAX_KRITICKA_SANCE, hrac.kritickaSance + hodnota)
      break
    case 'kritickyNasobic':
      hrac.kritickyNasobic += hodnota
      break
  }
}

/** Bod 12 zadání (krok 3/4) — po každém perkovém výběru appka projde
 *  CELÝ katalog SYNERGIE (ne jen tu, co by mohla souviset s právě
 *  vybraným perkem — viz synergie.ts's vlastní komentář, proč i
 *  starší synergie může začít platit teprve tímhle posledním výběrem)
 *  a tiše udělí bonus za každou, co (a) ještě appka tenhle běh
 *  neudělila a (b) její podmínka už platí. Na rozdíl od perku appka
 *  synergii nikdy nenabízí jako volbu — hráč se o ní dozví jen z logu. */
const zkontrolujSynergie = (stav: SurvivalHerniStav): void => {
  for (const synergie of SYNERGIE) {
    if (stav.aplikovaneSynergie.includes(synergie.id)) continue
    if (!jeSynergieSplnena(synergie.podminka, stav.ziskanePerky)) continue
    aplikujEfekt(stav.hrac, synergie.efekt, synergie.hodnota)
    stav.aplikovaneSynergie.push(synergie.id)
    pridejLog(stav, `${synergie.ikona} Synergie: ${synergie.jmeno}!`)
  }
}

/** Sdílené mezi hráčovým auto-útokem a Fire Nova (schopnost, viz
 *  pouzitSchopnost níž) — appka nechce dvě kopie stejné "co se stane,
 *  když nepřítel/boss padne" logiky (kořist/XP/level-up) jen proto, že
 *  ho tentokrát nezabil obyčejný auto-útok, ale plošná schopnost.
 *  Volající už musí mít `nepritel` odstraněného z `stav.aktivniNepratele`
 *  předtím, než tohle zavolá. */
const zpracujZabitiNepritele = (stav: SurvivalHerniStav, nepritel: NepritelInstance, nahodne: () => number): void => {
  if (nepritel.jeBoss) {
    const boss = bossProVlnu(stav.vlna)
    stav.xpZaBeh += boss.xp
    stav.goldZaBeh += boss.gold
    stav.zabitiCelkem += 1
    stav.bossPorazenoZaBeh += 1
    pridejLog(stav, `👑 ${boss.jmeno} poražen! +${boss.xp} XP, +${boss.gold} Gold`)
    zkontrolujLevelUp(stav, nahodne)
    return
  }
  const def = MONSTRA[nepritel.defId as keyof typeof MONSTRA]
  if (!def) return
  const vysledek = vyhodnotZabiti(def, nahodne)
  stav.xpZaBeh += vysledek.xp
  stav.goldZaBeh += vysledek.gold
  stav.krystalZaBeh += vysledek.krystal
  stav.zabitiCelkem += 1
  let text = `${def.emoji} ${def.jmeno} poražen +${vysledek.xp} XP +${vysledek.gold} Gold`
  if (vysledek.krystal > 0) text += ` +${vysledek.krystal} 💎`
  if (vysledek.vzacnyDrop) text = `✨ RARE DROP! ${text}`
  pridejLog(stav, text)
  zkontrolujLevelUp(stav, nahodne)
}

/** Zkontroluje, jestli aktuální xpZaBeh přeskočilo práh pro DALŠÍ
 *  úroveň (data/uroven.ts) — voláno po každém přírůstku XP (zabití
 *  běžného monstra i bosse). Appka řeší jen JEDNU úroveň najednou: i
 *  kdyby jedno zabití přeskočilo dva prahy zároveň, appka nabídne
 *  perk-výběr jen pro první z nich — jakmile appka dostane odpověď
 *  (vyberPerk), levelUpNabidka se vynuluje a příští tik (appka je
 *  jinak pozastavená, viz krokHry's vlastní guard) tuhle funkci zavolá
 *  znovu a odhalí druhý práh sama, žádná fronta navíc není potřeba. */
const zkontrolujLevelUp = (stav: SurvivalHerniStav, nahodne: () => number): void => {
  if (stav.levelUpNabidka) return
  if (stav.xpZaBeh < prahXpProUroven(stav.hrac.uroven + 1)) return
  stav.hrac.uroven += 1
  stav.levelUpNabidka = vyberNabidkuPerku(nahodne)
  pridejLog(stav, `⭐ Level up! Úroveň ${stav.hrac.uroven}`)
}

/**
 * Jeden krok herní smyčky. MUTUJE `stav` přímo (viz komentář nahoře
 * souboru) a vrací ho zpátky jen pro pohodlí volajícího.
 *
 * @param dtMs uplynulý čas od posledního ticku v ms (appka ho sama
 *   ořezává na rozumné maximum ve volajícím useSurvivalEngine.ts, ať
 *   neproběhne obří skok po výpadku snímku)
 * @param vstupSmer pohybový vektor z joysticku/klávesnice, obě složky
 *   -1..1, délka se normalizuje uvnitř
 */
export const krokHry = (
  stav: SurvivalHerniStav,
  dtMs: number,
  vstupSmer: Pozice2D,
  nahodne: () => number = Math.random
): SurvivalHerniStav => {
  if (stav.konec) return stav
  // Bod 11 zadání — appka CELOU hru pozastaví, dokud čeká na výběr
  // perku (viz levelUpNabidka's vlastní komentář v types.ts): žádný
  // pohyb, spawn ani útok, dokud hráč nerozhodne přes vyberPerk().
  if (stav.levelUpNabidka) return stav
  const dt = dtMs / 1000
  stav.cas += dtMs

  // --- pohyb hráče ---
  const delka = Math.hypot(vstupSmer.x, vstupSmer.z)
  if (delka > 0.001) {
    const nx = delka > 1 ? vstupSmer.x / delka : vstupSmer.x
    const nz = delka > 1 ? vstupSmer.z / delka : vstupSmer.z
    let novaX = stav.hrac.pozice.x + nx * stav.hrac.rychlost * dt
    let novaZ = stav.hrac.pozice.z + nz * stav.hrac.rychlost * dt
    const vzdOdStredu = Math.hypot(novaX, novaZ)
    if (vzdOdStredu > ARENA_POLOMER) {
      const meritko = ARENA_POLOMER / vzdOdStredu
      novaX *= meritko
      novaZ *= meritko
    }
    stav.hrac.pozice = { x: novaX, z: novaZ }
  }

  const vlnaKonfig = vypocitejVlnu(stav.vlna)

  // --- spawn běžných monster ---
  if (stav.faceVlny === 'spawnuje' && stav.zbyvaSpawnovat > 0) {
    if (stav.cas - stav.posledniSpawnMs >= vlnaKonfig.intervalSpawnuMs) {
      spawnujMonstrum(stav, vlnaKonfig.dostupneTypy, vlnaKonfig.statMultiplikator, nahodne)
      stav.zbyvaSpawnovat -= 1
      stav.posledniSpawnMs = stav.cas
    }
  } else if (stav.faceVlny === 'boss-spawnuje') {
    spawnujBosse(stav, vlnaKonfig.statMultiplikator, nahodne)
    stav.faceVlny = 'boss-boj'
  }

  // --- AI nepřátel + kontaktní boj ---
  for (const nepritel of stav.aktivniNepratele) {
    let rychlost = nepritel.rychlost
    let nasobicPoskozeni = 1

    if (nepritel.jeBoss) {
      const boss = bossProVlnu(stav.vlna)
      nepritel.fazeIndex = fazeBosse(nepritel.hp / nepritel.maxHp, boss.faze)
      const faze = boss.faze[nepritel.fazeIndex]
      rychlost *= faze.nasobicRychlosti
      nasobicPoskozeni = faze.nasobicPoskozeni

      if (faze.specialita === 'teleport' && stav.cas - nepritel.posledniTeleportMs >= boss.teleportCooldownMs) {
        const uhel = nahodne() * Math.PI * 2
        const vzd = 1.6 + nahodne() * 0.8
        nepritel.pozice = {
          x: stav.hrac.pozice.x + Math.cos(uhel) * vzd,
          z: stav.hrac.pozice.z + Math.sin(uhel) * vzd,
        }
        nepritel.posledniTeleportMs = stav.cas
        zpusobPoskozeniHraci(stav, Math.round(nepritel.damage * nasobicPoskozeni))
        pridejLog(stav, `👹 ${boss.jmeno} teleportoval a udeřil za ${Math.round(nepritel.damage * nasobicPoskozeni)}!`)
        continue
      }
    }

    const vzdKHraci = Math.hypot(nepritel.pozice.x - stav.hrac.pozice.x, nepritel.pozice.z - stav.hrac.pozice.z)

    if (nepritel.typ === 'strelec' && vzdKHraci <= nepritel.dosahUtoku) {
      // Střelec zůstává v dosahu a útočí, nedochází až k hráči.
      if (stav.cas - nepritel.posledniUtokMs >= RANGED_COOLDOWN_MS) {
        zpusobPoskozeniHraci(stav, Math.round(nepritel.damage * nasobicPoskozeni))
        nepritel.posledniUtokMs = stav.cas
      }
    } else {
      nepritel.pozice = posunKCili(nepritel.pozice, stav.hrac.pozice, rychlost, dt)
    }

    // Kontaktní útok — i střelec ho dostane, pokud se k hráči nakonec
    // stejně přiblíží (couvání od hráče appka v první verzi neřeší).
    const vzdPoTahu = Math.hypot(nepritel.pozice.x - stav.hrac.pozice.x, nepritel.pozice.z - stav.hrac.pozice.z)
    if (vzdPoTahu < nepritel.polomer + stav.hrac.polomer && stav.cas - nepritel.posledniUtokMs >= KONTAKT_COOLDOWN_MS) {
      zpusobPoskozeniHraci(stav, Math.round(nepritel.damage * nasobicPoskozeni))
      nepritel.posledniUtokMs = stav.cas
    }
  }

  // --- auto-útok hráče (nejbližší nepřítel v dosahu) ---
  if (stav.cas - stav.hrac.posledniUtokMs >= 1000 / stav.hrac.utokyZaSekundu) {
    let nejblizsi: NepritelInstance | null = null
    let nejmensiVzd = Infinity
    for (const nepritel of stav.aktivniNepratele) {
      const vzd = Math.hypot(nepritel.pozice.x - stav.hrac.pozice.x, nepritel.pozice.z - stav.hrac.pozice.z)
      if (vzd <= stav.hrac.dosahUtoku && vzd < nejmensiVzd) {
        nejmensiVzd = vzd
        nejblizsi = nepritel
      }
    }
    if (nejblizsi) {
      stav.hrac.posledniUtokMs = stav.cas
      const kriticky = nahodne() < stav.hrac.kritickaSance
      const poskozeni = Math.round(stav.hrac.damage * (kriticky ? stav.hrac.kritickyNasobic : 1))
      nejblizsi.hp -= poskozeni

      if (nejblizsi.hp <= 0) {
        const zabity = nejblizsi
        stav.aktivniNepratele = stav.aktivniNepratele.filter((n) => n.id !== zabity.id)
        zpracujZabitiNepritele(stav, zabity, nahodne)
      }
    }
  }

  // --- postup do další vlny ---
  const vlnaHotova =
    (stav.faceVlny === 'spawnuje' && stav.zbyvaSpawnovat === 0 && stav.aktivniNepratele.length === 0) ||
    (stav.faceVlny === 'boss-boj' && stav.aktivniNepratele.length === 0)

  if (vlnaHotova) {
    const dokoncenaVlna = stav.vlna
    if (jeExtrakcniVlna(dokoncenaVlna)) {
      // Appka NEinkrementuje `stav.vlna` tady — čeká, dokud appka
      // nedostane hráčovo rozhodnutí přes `extrahovat`/
      // `pokracovatVeVlne` (viz níž), stejně jako se `vlnaHotova`
      // samo o sobě znovu nevyhodnotí, dokud `faceVlny` není zase
      // 'spawnuje'/'boss-boj'.
      stav.faceVlny = 'extrakce'
      pridejLog(stav, `🚪 Vlna ${dokoncenaVlna} hotová — extrahovat, nebo pokračovat?`)
    } else {
      zahajDalsiVlnu(stav)
    }
  }

  // --- smrt --- (má přednost i nad právě nastavenou 'extrakce' fází i
  // nad čerstvě nabídnutým levelUpNabidka — pokud stejný tik killnul
  // posledního nepřítele/vyvolal level-up I zabil hráče zároveň, appka
  // nedovolí extrahovat kořist ani ukáže mrtvému hráči kartu na výběr).
  if (stav.hrac.hp <= 0) {
    stav.hrac.hp = 0
    stav.konec = true
    stav.duvodKonce = 'smrt'
    stav.levelUpNabidka = null
  }

  return stav
}

/** Hráč se rozhodl vystoupit z extrakční nabídky — bezpečně zabalí
 *  odměnu běhu (s bonusem, viz EXTRAKCE_BONUS_NASOBIC) a běh skončí
 *  jako úspěch, ne jako smrt. No-op mimo fázi 'extrakce' nebo když už
 *  běh skončil — appka volajícímu (React hooku) nevěří o nic víc, než
 *  Buddyho Trh věří vlastní `koupitPole`/`odmitnoutKoupi`. */
export const extrahovat = (stav: SurvivalHerniStav): void => {
  if (stav.faceVlny !== 'extrakce' || stav.konec) return
  stav.goldZaBeh = Math.round(stav.goldZaBeh * EXTRAKCE_BONUS_NASOBIC)
  stav.krystalZaBeh = Math.round(stav.krystalZaBeh * EXTRAKCE_BONUS_NASOBIC)
  pridejLog(stav, `💰 Extrahováno! +${Math.round((EXTRAKCE_BONUS_NASOBIC - 1) * 100)} % bonus na Gold/Crystal`)
  stav.konec = true
  stav.duvodKonce = 'extrakce'
}

/** Hráč se rozhodl riskovat dál — appka rozjede další vlnu úplně
 *  stejnou cestou (`zahajDalsiVlnu`), jako by tahle vlna vůbec nebyla
 *  extrakční bod. */
export const pokracovatVeVlne = (stav: SurvivalHerniStav): void => {
  if (stav.faceVlny !== 'extrakce' || stav.konec) return
  zahajDalsiVlnu(stav)
}

/** Hráč vybral jeden z nabídnutých perků (bod 11 zadání) — no-op mimo
 *  aktivní nabídku, po konci běhu, nebo pro id, co appka zrovna
 *  nenabídla (appka UI nevěří o nic víc než extrahovat/
 *  pokracovatVeVlne výš). Zapíše výběr do ziskanePerky, zvedne
 *  hráčovy statistiky přes aplikujEfekt, zkontroluje, jestli tenhle
 *  výběr právě neodemkl nějakou synergii (bod 12 zadání, krok 3/4) a
 *  nabídku vynuluje — příští `krokHry` volání hru zase rozjede. */
export const vyberPerk = (stav: SurvivalHerniStav, perkId: string): void => {
  if (!stav.levelUpNabidka || stav.konec) return
  if (!stav.levelUpNabidka.includes(perkId)) return
  const perk = PERKY.find((p) => p.id === perkId)
  if (!perk) return
  aplikujEfekt(stav.hrac, perk.efekt, perk.hodnota)
  stav.ziskanePerky[perkId] = (stav.ziskanePerky[perkId] ?? 0) + 1
  pridejLog(stav, `${perk.ikona} Perk: ${perk.jmeno}`)
  zkontrolujSynergie(stav)
  stav.levelUpNabidka = null
}

/** Bod 11/12 zadání (krok 4/4) — hráč zmáčkl jednu z ikon schopností v
 *  HUD (HUD.tsx). No-op stejně nedůvěřivě jako vyberPerk/extrahovat/
 *  pokracovatVeVlne výš: appka schopnost vůbec nezná, appka ji ještě
 *  neumí (SCHOPNOSTI_IMPLEMENTOVANE — appka ho kontroluje ještě před
 *  cooldownem, ať nedokončená schopnost nikdy nezačne odpočítávat
 *  cooldown, co by pak vypadal jako "appka to zkusila a nic se
 *  nestalo"), cooldown appky ještě neuplynul, běh skončil, nebo appka
 *  zrovna čeká na level-up rozhodnutí (krokHry ty samé stavy taky
 *  pozastavuje). */
export const pouzitSchopnost = (stav: SurvivalHerniStav, schopnostId: string, nahodne: () => number = Math.random): void => {
  if (stav.konec || stav.levelUpNabidka) return
  if (!SCHOPNOSTI_IMPLEMENTOVANE.has(schopnostId)) return
  const schopnost = SCHOPNOSTI.find((s) => s.id === schopnostId)
  if (!schopnost) return
  const posledni = stav.hrac.posledniPouzitiSchopnosti[schopnostId] ?? -Infinity
  if (stav.cas - posledni < schopnost.cooldownMs) return

  if (schopnostId === 'fire_nova') {
    const poskozeni = Math.round(stav.hrac.damage * FIRE_NOVA_NASOBIC)
    const zasazeni: NepritelInstance[] = []
    for (const nepritel of stav.aktivniNepratele) {
      const vzd = Math.hypot(nepritel.pozice.x - stav.hrac.pozice.x, nepritel.pozice.z - stav.hrac.pozice.z)
      if (vzd <= FIRE_NOVA_POLOMER) {
        nepritel.hp -= poskozeni
        zasazeni.push(nepritel)
      }
    }
    pridejLog(stav, `🔥 Fire Nova! ${zasazeni.length}× zasaženo za ${poskozeni}`)
    if (zasazeni.length > 0) {
      stav.aktivniNepratele = stav.aktivniNepratele.filter((n) => n.hp > 0)
      for (const n of zasazeni) {
        if (n.hp <= 0) zpracujZabitiNepritele(stav, n, nahodne)
      }
    }
  } else if (schopnostId === 'energy_shield') {
    const absorpce = Math.round(ENERGY_SHIELD_ABSORPCE_ZAKLAD + stav.hrac.maxHp * ENERGY_SHIELD_ABSORPCE_Z_MAXHP)
    stav.hrac.stitAbsorpce = absorpce
    stav.hrac.stitVyprsiMs = stav.cas + ENERGY_SHIELD_TRVANI_MS
    pridejLog(stav, `🛡️ Energy Shield! +${absorpce} pohlcení`)
  }

  stav.hrac.posledniPouzitiSchopnosti[schopnostId] = stav.cas
}
