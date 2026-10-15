// ==========================================
// Buddy World — strojově čitelný registr 2D koncept-art assetů z
// BuddyWorld_ArtPack.zip. Ten balíček dorazil jako čistě 2D vektorová
// grafika (SVG, každá karta ~512×512 s gradientem/stínem/ilustrací,
// žádný .glb/3D model) — vlastní manifest i README to výslovně
// potvrzují ("not production 3D models, GLB files, skeleton rigs").
//
// Appka tenhle balíček nemíchá s `data/assets.ts`'s `BUDOUCI_ASSETY`
// (registr budoucích .glb modelů pro 3D scénu) — jsou to dvě zcela
// nezávislé vrstvy: tahle tabulka drží 2D UI/koncept grafiku (appka ji
// dnes doopravdy používá v HUD/výběru/Hubu), `assets.ts` drží budoucí
// 3D model grafiku (appka ji dnes nikde nenačítá). Appka tak může
// zítra nahradit Emberovu 2D kartu skutečným .glb modelem beze změny
// jediného řádku tady — drží to jako druhou, oddělenou vrstvu, ne
// jako pole na herních typech (`MaskotDef`/`NepritelDef` v types.ts
// zůstávají úplně netknuté, bez vlastního appka obrázkového pole).
//
// `pouzito: false` appka drží pro koncept-art, pro kterou dnes ještě
// nemá odpovídající herní prvek (třetí typ běžného nepřítele, budoucí
// městečko) — soubor appka na disk přesto zkopírovala (zadání žádalo
// "připrav integraci celého balíčku"), jen ho nikde nevykresluje,
// dokud ten herní prvek doopravdy nepostaví (stejná zásada jako
// `data/assets.ts`'s `dostupny: false`). `obrazekKonceptu()` proto
// vrátí `null` pro `pouzito: false` záznam, čímž donutí volajícího
// vždycky mít vlastní (dnešní emoji) fallback — přesně "architektura
// připraví vyměnit grafiku bez přepisování herních systémů" podmínka
// ze zadání.
// ==========================================

export interface KonceptAsset {
  klic: string
  popis: string
  /** Reálná cesta pod `public/` — na rozdíl od `assets.ts` tenhle
   *  soubor na disku doopravdy existuje. */
  cesta: string
  /** appka ho dnes doopravdy vykresluje v nějaké komponentě. */
  pouzito: boolean
}

export const KONCEPT_ASSETY: KonceptAsset[] = [
  // --- čtyři maskoti — appka je vykresluje v kartě VyberMaskota.tsx
  // (odemčeného i zamčeného stejně) ---
  { klic: 'maskot.ember', popis: 'Ember — karta ve VyberMaskota.tsx', cesta: '/buddyworld/koncept/mascots/ember.svg', pouzito: true },
  { klic: 'maskot.moss', popis: 'Moss — karta ve VyberMaskota.tsx', cesta: '/buddyworld/koncept/mascots/moss.svg', pouzito: true },
  { klic: 'maskot.nyx', popis: 'Nyx — karta ve VyberMaskota.tsx', cesta: '/buddyworld/koncept/mascots/nyx.svg', pouzito: true },
  { klic: 'maskot.frost', popis: 'Frost — karta ve VyberMaskota.tsx', cesta: '/buddyworld/koncept/mascots/frost.svg', pouzito: true },

  // --- dva běžní nepřátelé — appka je vykresluje jako malý portrét
  // vedle jejich HP v HUD.tsx, podle toho, který typ je zrovna
  // nejbližší živý slot v aréně ---
  { klic: 'nepritel.stinovy-vlcek', popis: 'Stínový vlček (Shadow Wolf) — portrét v HUD.tsx vedle jeho HP', cesta: '/buddyworld/koncept/enemies/shadow-wolf.svg', pouzito: true },
  { klic: 'nepritel.lesni-slizena', popis: 'Lesní slizena (Forest Slime) — druhý typ běžného nepřítele, portrét v HUD.tsx stejně jako vlček', cesta: '/buddyworld/koncept/enemies/forest_slime_concept.svg', pouzito: true },

  // --- boss — appka ho vykresluje jako vlastní, odlišně zbarvenou HP
  // lištu v HUD.tsx, nesdílí portrét s běžnými nepřáteli výš ---
  { klic: 'nepritel.lesni-strazce-boss', popis: 'Lesní strážce (Forest Guardian) — boss, portrét u jeho vlastní HP lišty v HUD.tsx', cesta: '/buddyworld/koncept/enemies/forest_guardian_boss_concept.svg', pouzito: true },

  // --- čtvrtý typ z balíčku appka nemá v poli NEPRATELE
  // (data/nepratele.ts) — soubor na disk zkopírovala, ale nikde ho
  // nevykresluje, dokud doopravdy nepostaví třetí typ běžného
  // nepřítele ---
  { klic: 'nepritel.krystalovy-golem', popis: 'Krystalový golem (Crystal Golem) — zatím bez odpovídajícího typu nepřítele v datech', cesta: '/buddyworld/koncept/enemies/crystal_golem_concept.svg', pouzito: false },

  // --- prostředí — appka ho vykresluje jako pozadí výběrové
  // obrazovky (.bw-page), "vstup do Enchanted Forest" moment ---
  { klic: 'prostredi.kouzelny-les', popis: 'Enchanted Forest — pozadí obrazovky výběru maskota (.bw-page)', cesta: '/buddyworld/koncept/environments/enchanted-forest.svg', pouzito: true },
  { klic: 'prostredi.buddy-vesnice', popis: 'Buddy Village — pro ni dnes neexistuje žádná vlastní obrazovka (budoucí městečko)', cesta: '/buddyworld/koncept/environments/buddy_village_concept.svg', pouzito: false },

  // --- budoucí budova městečka — pro ni dnes neexistuje stavební
  // obrazovka ---
  { klic: 'budova.dilna', popis: 'Workshop — budoucí "mestecko.zaklad" stavba (viz data/assets.ts), pro ni dnes neexistuje obrazovka', cesta: '/buddyworld/koncept/buildings/workshop_concept.svg', pouzito: false },

  // --- UI ikony — appka je zapojila do Útok tlačítka, Obrana
  // tlačítka (obě v HUD.tsx) a Hub quick-linku (Hub.tsx); zbylé
  // zkopírovala pro budoucí obrazovky, co dnes ještě neexistují
  // (inventář/quest/městečko/nastavení uvnitř Buddy Worldu) ---
  { klic: 'ui.ikona.utok', popis: 'Útok tlačítko v HUD.tsx', cesta: '/buddyworld/koncept/ui/icons/attack.svg', pouzito: true },
  { klic: 'ui.ikona.buddy', popis: 'Hub quick-link na Buddy World (Hub.tsx)', cesta: '/buddyworld/koncept/ui/icons/buddy.svg', pouzito: true },
  { klic: 'ui.ikona.obrana', popis: 'Obrana tlačítko v HUD.tsx', cesta: '/buddyworld/koncept/ui/icons/defend.svg', pouzito: true },
  { klic: 'ui.ikona.inventar', popis: 'dnes neexistuje inventář obrazovka', cesta: '/buddyworld/koncept/ui/icons/inventory.svg', pouzito: false },
  { klic: 'ui.ikona.mapa', popis: 'dnes neexistuje mapová/cestovní obrazovka', cesta: '/buddyworld/koncept/ui/icons/map.svg', pouzito: false },
  { klic: 'ui.ikona.quest', popis: 'dnes neexistuje questový systém', cesta: '/buddyworld/koncept/ui/icons/quest.svg', pouzito: false },
  { klic: 'ui.ikona.nastaveni', popis: 'dnes neexistuje samostatná nastavení obrazovka uvnitř Buddy Worldu', cesta: '/buddyworld/koncept/ui/icons/settings.svg', pouzito: false },
  { klic: 'ui.ikona.mestecko', popis: 'dnes neexistuje městečko obrazovka', cesta: '/buddyworld/koncept/ui/icons/town.svg', pouzito: false },

  // --- obecný tmavý fantasy panel — appka ho vykresluje jako pozadí
  // maskotní karty a karty "Poraženo…" v HUD.tsx ---
  { klic: 'ui.pozadi.temny-panel', popis: 'Dark fantasy panel — pozadí maskotní karty a karty "Poraženo…" v HUD.tsx', cesta: '/buddyworld/koncept/ui/backgrounds/dark-fantasy-panel.svg', pouzito: true },
]

/** Vrátí cestu, jen pokud appka asset doopravdy vykresluje
 *  (`pouzito: true`) — tím donutí volajícího mít vlastní fallback
 *  pro `null` (dnešní emoji ikonu), přesně "architektura umožní
 *  vyměnit grafiku bez přepisování herních systémů" podmínka ze
 *  zadání. */
export const obrazekKonceptu = (klic: string): string | null => {
  const asset = KONCEPT_ASSETY.find((a) => a.klic === klic)
  return asset?.pouzito ? asset.cesta : null
}
