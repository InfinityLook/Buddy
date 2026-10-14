// ==========================================
// Buddy World — appčin skutečný, strojově čitelný registr 2D
// koncept-art assetů z BuddyWorld_ArtPack.zip. Tenhle balíček dorazil
// jako čistě 2D vektorová grafika (SVG, appčina karta ~512×512 s
// gradientem/stínem/ilustrací, žádný .glb/3D model) — appčin vlastní
// manifest i README to výslovně potvrzují ("not production 3D models,
// GLB files, skeleton rigs"). Appka proto tenhle balíček NEMÍCHÁ s
// `data/assets.ts`'s `BUDOUCI_ASSETY` (appčin registr budoucích .glb
// modelů pro appčinu 3D scénu) — to jsou dva zcela nezávislé appčiny
// vrstvy: tahle appčina tabulka drží appčinu *2D UI/koncept* grafiku
// (appka ji dnes doopravdy používá v appčině HUD/výběru/Hubu), `assets.ts`
// drží appčinu *budoucí 3D model* grafiku (appka ji dnes nikde
// nenačítá). Appka tak může zítra nahradit Emberovu 2D kartu skutečným
// .glb modelem beze změny jediného řádku tady — appka to drží jako
// druhou, oddělenou vrstvu, ne jako pole na appčiných herních typech
// (`MaskotDef`/`NepritelDef` v types.ts appka tím nechala úplně
// netknuté, appka jim nepřidala appčino obrázkové pole).
//
// `pouzito: false` appka drží pro koncept-art, pro kterou appka dnes
// ještě nemá odpovídající appčin herní prvek (druhý typ nepřítele,
// appčino budoucí městečko) — appka soubor na disk přesto zkopírovala
// (appčina "připrav integraci celého balíčku" zadání), jen appka ho
// nikde nevykresluje, dokud appka ten herní prvek doopravdy nepostaví
// (appčina stejná zásada jako `data/assets.ts`'s `dostupny: false`).
// `obrazekKonceptu()` appka proto vrátí `null` pro `pouzito: false`
// záznam, appka tím donutí appčina volajícího vždycky mít appčin
// vlastní (dnešní emoji) fallback — přesně appčina "architektura
// appku připraví vyměnit grafiku bez přepisování herních systémů"
// podmínka ze zadání.
// ==========================================

export interface KonceptAsset {
  klic: string
  popis: string
  /** appčina reálná cesta pod `public/` — na rozdíl od `assets.ts`
   *  tenhle appčin soubor na disku doopravdy existuje. */
  cesta: string
  /** appka appku dnes doopravdy vykresluje v appčině komponentě. */
  pouzito: boolean
}

export const KONCEPT_ASSETY: KonceptAsset[] = [
  // --- appčini čtyři maskoti — appka appku vykresluje v appčině
  // VyberMaskota.tsx kartě (appčin odemčený i zamčený) ---
  { klic: 'maskot.ember', popis: 'Ember — karta ve VyberMaskota.tsx', cesta: '/buddyworld/koncept/mascots/ember.svg', pouzito: true },
  { klic: 'maskot.moss', popis: 'Moss — karta ve VyberMaskota.tsx', cesta: '/buddyworld/koncept/mascots/moss.svg', pouzito: true },
  { klic: 'maskot.nyx', popis: 'Nyx — karta ve VyberMaskota.tsx', cesta: '/buddyworld/koncept/mascots/nyx.svg', pouzito: true },
  { klic: 'maskot.frost', popis: 'Frost — karta ve VyberMaskota.tsx', cesta: '/buddyworld/koncept/mascots/frost.svg', pouzito: true },

  // --- appčin jediný dnešní nepřítel — appka appku vykresluje jako
  // malý portrét vedle jeho HP v HUD.tsx ---
  { klic: 'nepritel.stinovy-vlcek', popis: 'Stínový vlček (Shadow Wolf) — portrét v HUD.tsx vedle jeho HP', cesta: '/buddyworld/koncept/enemies/shadow-wolf.svg', pouzito: true },

  // --- appčiny tři další nepřátelé z balíčku appka nemá v appčině
  // NEPRATELE poli (data/nepratele.ts) — appka soubory zkopírovala,
  // appka je ale nikde nevykresluje, dokud appka doopravdy nepostaví
  // druhý typ nepřítele/bosse ---
  { klic: 'nepritel.lesni-slizena', popis: 'Lesní slizena (Forest Slime) — appka zatím nemá tenhle druhý typ nepřítele v appčiných datech', cesta: '/buddyworld/koncept/enemies/forest_slime_concept.svg', pouzito: false },
  { klic: 'nepritel.krystalovy-golem', popis: 'Krystalový golem (Crystal Golem) — appka zatím nemá tenhle typ nepřítele v appčiných datech', cesta: '/buddyworld/koncept/enemies/crystal_golem_concept.svg', pouzito: false },
  { klic: 'nepritel.lesni-strazce-boss', popis: 'Lesní strážce (Forest Guardian) — appčin budoucí boss, appka ho dnes nemá v appčiných datech', cesta: '/buddyworld/koncept/enemies/forest_guardian_boss_concept.svg', pouzito: false },

  // --- appčino prostředí — appka appku vykresluje jako appčino pozadí
  // appčiny výběrové obrazovky (.bw-page), appčin "vstup do Enchanted
  // Forest" moment ---
  { klic: 'prostredi.kouzelny-les', popis: 'Enchanted Forest — pozadí appčiny obrazovky výběru maskota (.bw-page)', cesta: '/buddyworld/koncept/environments/enchanted-forest.svg', pouzito: true },
  { klic: 'prostredi.buddy-vesnice', popis: 'Buddy Village — appka pro ni dnes nemá žádnou appčinu obrazovku (appčino budoucí městečko)', cesta: '/buddyworld/koncept/environments/buddy_village_concept.svg', pouzito: false },

  // --- appčina budoucí budova appčina městečka — appka pro ni dnes
  // nemá appčinu stavební obrazovku ---
  { klic: 'budova.dilna', popis: 'Workshop — appčina budoucí "mestecko.zaklad" stavba (viz data/assets.ts), appka pro ni dnes nemá obrazovku', cesta: '/buddyworld/koncept/buildings/workshop_concept.svg', pouzito: false },

  // --- appčiny UI ikony — appka appku zapojila do appčina Útok
  // tlačítka (HUD.tsx) a appčina Hub quick-linku (Hub.tsx); zbylé appka
  // zkopírovala pro appčiny budoucí obrazovky, co dnes appka ještě
  // nemá (appka nemá appčinu "obranu" akci v combat/engine.ts, appka
  // nemá appčin inventář/quest/městečko/nastavení appčinu obrazovku) ---
  { klic: 'ui.ikona.utok', popis: 'Appčino Útok tlačítko v HUD.tsx', cesta: '/buddyworld/koncept/ui/icons/attack.svg', pouzito: true },
  { klic: 'ui.ikona.buddy', popis: 'Appčin Hub quick-link na Buddy World (Hub.tsx)', cesta: '/buddyworld/koncept/ui/icons/buddy.svg', pouzito: true },
  { klic: 'ui.ikona.obrana', popis: 'appka dnes nemá appčinu "obranu" jako samostatnou akci v combat/engine.ts', cesta: '/buddyworld/koncept/ui/icons/defend.svg', pouzito: false },
  { klic: 'ui.ikona.inventar', popis: 'appka dnes nemá appčinu inventář obrazovku', cesta: '/buddyworld/koncept/ui/icons/inventory.svg', pouzito: false },
  { klic: 'ui.ikona.mapa', popis: 'appka dnes nemá appčinu mapovou/cestovní obrazovku', cesta: '/buddyworld/koncept/ui/icons/map.svg', pouzito: false },
  { klic: 'ui.ikona.quest', popis: 'appka dnes nemá appčin questový systém', cesta: '/buddyworld/koncept/ui/icons/quest.svg', pouzito: false },
  { klic: 'ui.ikona.nastaveni', popis: 'appka dnes nemá appčinu samostatnou nastavení obrazovku uvnitř appčina Buddy Worldu', cesta: '/buddyworld/koncept/ui/icons/settings.svg', pouzito: false },
  { klic: 'ui.ikona.mestecko', popis: 'appka dnes nemá appčinu městečko obrazovku', cesta: '/buddyworld/koncept/ui/icons/town.svg', pouzito: false },

  // --- appčin obecný tmavý fantasy panel — appka appku vykresluje
  // jako appčino pozadí maskotní karty a appčiny appku-smrt karty ---
  { klic: 'ui.pozadi.temny-panel', popis: 'Dark fantasy panel — pozadí appčiny maskotní karty a appčiny smrt-karty v HUD.tsx', cesta: '/buddyworld/koncept/ui/backgrounds/dark-fantasy-panel.svg', pouzito: true },
]

/** appka vrátí appčinu cestu, jen pokud appka asset doopravdy vykresluje
 *  (`pouzito: true`) — appka tím donutí appčina volajícího mít vlastní
 *  fallback pro `null` (appčinu dnešní emoji ikonu), přesně appčina
 *  "architektura umožní vyměnit grafiku bez přepisování herních
 *  systémů" podmínka ze zadání. */
export const obrazekKonceptu = (klic: string): string | null => {
  const asset = KONCEPT_ASSETY.find((a) => a.klic === klic)
  return asset?.pouzito ? asset.cesta : null
}
