// ==========================================
// Buddy World — registr grafických assetů. Po Fázi 0+1
// (BuddyWorld_Complete_Project_Pack.zip) už tohle neplatí beze
// zbytku pro každý záznam: u těch, co appka označila
// `dostupny: true`, GLTFLoader (scene/assetLoader.ts) skutečný
// model doopravdy nahrává, a jen při selhání se vrátí k primitivě.
// U zbylých (`dostupny: false`) pravidlo platí dál — buď soubor na
// disku vůbec neexistuje (hrac.postava), nebo existuje, ale tahle
// fáze ho záměrně nenahrává (nepritel.stinovy-vlcek a
// nepritel.lesni-slizena — odloženo, viz useBuddyWorldScene.ts's
// komentář "TŘETÍ POKRAČOVÁNÍ VÝVOJE").
//
// Postup pro další nový asset je stejný jako dřív: rozbalit balíček
// do public/buddyworld/ podle cesty tady, nastavit `model`
// (data/maskoti.ts / data/nepratele.ts) nebo tenhle záznam na
// skutečnou cestu, přidat volání nacistGlbModel() do scény a
// teprve POTOM přepsat `dostupny` na `true` — tenhle seznam vždycky
// odráží, co scéna doopravdy zkusila nahrát, ne jen co leží na disku.
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
  { klic: 'maskot.ember', popis: 'Maskot Ember (oheň)', cesta: '/buddyworld/maskoti/ember.glb', format: 'glb', dostupny: true },
  { klic: 'maskot.moss', popis: 'Maskot Moss (příroda)', cesta: '/buddyworld/maskoti/moss.glb', format: 'glb', dostupny: false },
  { klic: 'maskot.nyx', popis: 'Maskot Nyx (magie)', cesta: '/buddyworld/maskoti/nyx.glb', format: 'glb', dostupny: false },
  { klic: 'maskot.frost', popis: 'Maskot Frost (led)', cesta: '/buddyworld/maskoti/frost.glb', format: 'glb', dostupny: false },
  { klic: 'hrac.postava', popis: 'Hráčova postava (appka dnes kreslí primitivní "meeple")', cesta: '/buddyworld/postavy/hrac.glb', format: 'glb', dostupny: false },
  { klic: 'nepritel.stinovy-vlcek', popis: 'Stínový vlček (soubor na disku existuje, scéna ho záměrně ještě nenahrává — viz useBuddyWorldScene.ts)', cesta: '/buddyworld/nepratele/stinovy-vlcek.glb', format: 'glb', dostupny: false },
  { klic: 'nepritel.lesni-slizena', popis: 'Lesní slizena (soubor na disku existuje, scéna ho záměrně ještě nenahrává — viz useBuddyWorldScene.ts)', cesta: '/buddyworld/nepratele/lesni-slizena.glb', format: 'glb', dostupny: false },
  { klic: 'prostredi.strom', popis: 'Strom (Enchanted Forest)', cesta: '/buddyworld/prostredi/strom.glb', format: 'glb', dostupny: true },
  { klic: 'prostredi.kamen', popis: 'Skála/kámen (Enchanted Forest)', cesta: '/buddyworld/prostredi/kamen.glb', format: 'glb', dostupny: true },
  { klic: 'prostredi.krystal', popis: 'Krystalový útvar (blízký orientační bod)', cesta: '/buddyworld/prostredi/krystal.glb', format: 'glb', dostupny: true },
  { klic: 'mestecko.zaklad', popis: 'Chata městečka (základ)', cesta: '/buddyworld/mestecko/zaklad.glb', format: 'glb', dostupny: true },
  { klic: 'mestecko.dilna', popis: 'Dílna městečka', cesta: '/buddyworld/mestecko/dilna.glb', format: 'glb', dostupny: true },
]

/** appka vrátí `true`, jen pokud scéna model doopravdy nahrává
 *  skutečným GLTFLoaderem (viz komentář u BUDOUCI_ASSETY výš) —
 *  tenhle seznam appka ručně udržuje v souladu s tím, co
 *  useBuddyWorldScene.ts skutečně volá. */
export const jeAssetDostupny = (klic: string): boolean =>
  BUDOUCI_ASSETY.find((a) => a.klic === klic)?.dostupny ?? false
