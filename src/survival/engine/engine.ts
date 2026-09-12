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
        stav.hrac.hp -= Math.round(nepritel.damage * nasobicPoskozeni)
        pridejLog(stav, `👹 ${boss.jmeno} teleportoval a udeřil za ${Math.round(nepritel.damage * nasobicPoskozeni)}!`)
        continue
      }
    }

    const vzdKHraci = Math.hypot(nepritel.pozice.x - stav.hrac.pozice.x, nepritel.pozice.z - stav.hrac.pozice.z)

    if (nepritel.typ === 'strelec' && vzdKHraci <= nepritel.dosahUtoku) {
      // Střelec zůstává v dosahu a útočí, nedochází až k hráči.
      if (stav.cas - nepritel.posledniUtokMs >= RANGED_COOLDOWN_MS) {
        stav.hrac.hp -= Math.round(nepritel.damage * nasobicPoskozeni)
        nepritel.posledniUtokMs = stav.cas
      }
    } else {
      nepritel.pozice = posunKCili(nepritel.pozice, stav.hrac.pozice, rychlost, dt)
    }

    // Kontaktní útok — i střelec ho dostane, pokud se k hráči nakonec
    // stejně přiblíží (couvání od hráče appka v první verzi neřeší).
    const vzdPoTahu = Math.hypot(nepritel.pozice.x - stav.hrac.pozice.x, nepritel.pozice.z - stav.hrac.pozice.z)
    if (vzdPoTahu < nepritel.polomer + stav.hrac.polomer && stav.cas - nepritel.posledniUtokMs >= KONTAKT_COOLDOWN_MS) {
      stav.hrac.hp -= Math.round(nepritel.damage * nasobicPoskozeni)
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
        const jeBoss = nejblizsi.jeBoss
        stav.aktivniNepratele = stav.aktivniNepratele.filter((n) => n.id !== nejblizsi!.id)

        if (jeBoss) {
          const boss = bossProVlnu(stav.vlna)
          stav.xpZaBeh += boss.xp
          stav.goldZaBeh += boss.gold
          stav.zabitiCelkem += 1
          stav.bossPorazenoZaBeh += 1
          pridejLog(stav, `👑 ${boss.jmeno} poražen! +${boss.xp} XP, +${boss.gold} Gold`)
        } else {
          const def = MONSTRA[nejblizsi.defId as keyof typeof MONSTRA]
          if (def) {
            const vysledek = vyhodnotZabiti(def, nahodne)
            stav.xpZaBeh += vysledek.xp
            stav.goldZaBeh += vysledek.gold
            stav.krystalZaBeh += vysledek.krystal
            stav.zabitiCelkem += 1
            let text = `${def.emoji} ${def.jmeno} poražen +${vysledek.xp} XP +${vysledek.gold} Gold`
            if (vysledek.krystal > 0) text += ` +${vysledek.krystal} 💎`
            if (vysledek.vzacnyDrop) text = `✨ RARE DROP! ${text}`
            pridejLog(stav, text)
          }
        }
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

  // --- smrt --- (má přednost i nad právě nastavenou 'extrakce' fází —
  // pokud stejný tik killnul posledního nepřítele I hráče zároveň,
  // appka hráči nedovolí extrahovat kořist, se kterou už neodešel).
  if (stav.hrac.hp <= 0) {
    stav.hrac.hp = 0
    stav.konec = true
    stav.duvodKonce = 'smrt'
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
