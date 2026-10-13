// ==========================================
// Buddy World — registr budoucích grafických assetů. Žádná z cest
// tady NEEXISTUJE na disku dnes — appka nikde ve scéně nenačítá
// žádný z nich, appka vždycky kreslí primitivum (koule/kapsle/kužel,
// appčina "low-poly" technika stejná jako game/explorace/
// usePlayerWorld.ts) a žádná cesta sem nemíří přes appčin
// GLTFLoader/TextureLoader, dokud appka ten soubor doopravdy nemá —
// appka tím dodržuje zadání ("nevytvářej fiktivní cesty k neexistujícím
// souborům, neimportuj assety, které neexistují").
//
// Jakmile appka obdrží BuddyWorld_ArtPack.zip, postup je: appka
// rozbalí obsah do public/buddyworld/ podle cest tady, appka pak u
// příslušné appčiny položky (data/maskoti.ts's `model`, data/nepratele.ts's
// `model`, nebo tenhle appčin BUDOUCI_ASSET záznam) nastaví appku z
// `null` na skutečnou appčinu cestu, a scéna (useBuddyWorldScene.ts)
// appku při nejbližším appčinu refaktoru doplní o GLTFLoader pro
// odpovídající appčinu položku — appka dnes žádný GLTFLoader-kód
// nepíše dřív, než appka má co nahrávat, ať appka nenechává
// nevyužitý, neodzkoušený kód ve scéně.
//
// Formáty: appka pro postavy/nepřátele/Buddy maskoty doporučuje .glb
// (binary glTF, appka ho umí načíst jedním GLTFLoaderem bez dalších
// souborů s texturami vedle), appka pro prostředí (stromy/skály/
// dekorace) stejně .glb, appka pro appčiny ikony/UI PNG (appka je
// ukládá pod public/icons/ nebo public/buddyworld/icons/, appčina
// stejná konvence jako zbytek appky v public/icons/hub-wheel/*).
// ==========================================

export interface BudouciAsset {
  klic: string
  popis: string
  /** Cesta, kam appka assett očekává pod `public/` — appka ji dnes
   *  nikde nenačítá, jen appku dokumentuje pro budoucí import. */
  cesta: string
  format: 'glb' | 'png'
  /** `false` dnes u úplně všeho — appka tenhle appčin seznam ručně
   *  přepíše na `true`, jen až appka soubor doopravdy nahraje na
   *  disk a appka ho GLTFLoaderem vyzkouší. */
  dostupny: boolean
}

export const BUDOUCI_ASSETY: BudouciAsset[] = [
  { klic: 'maskot.ember', popis: 'Maskot Ember (oheň)', cesta: '/buddyworld/maskoti/ember.glb', format: 'glb', dostupny: false },
  { klic: 'maskot.moss', popis: 'Maskot Moss (příroda)', cesta: '/buddyworld/maskoti/moss.glb', format: 'glb', dostupny: false },
  { klic: 'maskot.nyx', popis: 'Maskot Nyx (magie)', cesta: '/buddyworld/maskoti/nyx.glb', format: 'glb', dostupny: false },
  { klic: 'maskot.frost', popis: 'Maskot Frost (led)', cesta: '/buddyworld/maskoti/frost.glb', format: 'glb', dostupny: false },
  { klic: 'hrac.postava', popis: 'Hráčova postava (appka dnes kreslí primitivní "meeple")', cesta: '/buddyworld/postavy/hrac.glb', format: 'glb', dostupny: false },
  { klic: 'nepritel.stinovy-vlcek', popis: 'Stínový vlček', cesta: '/buddyworld/nepratele/stinovy-vlcek.glb', format: 'glb', dostupny: false },
  { klic: 'prostredi.strom', popis: 'Strom (Enchanted Forest)', cesta: '/buddyworld/prostredi/strom.glb', format: 'glb', dostupny: false },
  { klic: 'prostredi.kamen', popis: 'Skála/kámen (Enchanted Forest)', cesta: '/buddyworld/prostredi/kamen.glb', format: 'glb', dostupny: false },
  { klic: 'mestecko.zaklad', popis: 'První stavba městečka (základ)', cesta: '/buddyworld/mestecko/zaklad.glb', format: 'glb', dostupny: false },
]

/** appka vrátí `true`, jen pokud appka assett doopravdy má — dnes
 *  vždycky `false`, appka tím nutí scénu vždycky použít primitivní
 *  fallback. */
export const jeAssetDostupny = (klic: string): boolean =>
  BUDOUCI_ASSETY.find((a) => a.klic === klic)?.dostupny ?? false
