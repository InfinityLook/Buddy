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
  // ČTVRTÉ POKRAČOVÁNÍ VÝVOJE (BuddyWorld_ArtPack_Vesnice_Les_v1.zip,
  // public/buddyworld/artpack-v1/models/) nahradilo appčiných pět
  // starých `prostredi.*`/`mestecko.*` záznamů (nedoložený původ,
  // appka je smazala z disku) osmi nově vygenerovanými modely s
  // doloženým původem (licenses/PROJECT_OUTPUT.md toho balíčku) —
  // viz useBuddyWorldScene.ts's komentář "ČTVRTÉ POKRAČOVÁNÍ VÝVOJE"
  // pro appčin výpočet měřítka a appčinu Y-up/Z-up poznámku.
  { klic: 'mestecko.chata', popis: 'Vesnická chata (dvě appčiny chaty v appčiny vesnici)', cesta: '/buddyworld/artpack-v1/models/chata.glb', format: 'glb', dostupny: true },
  { klic: 'mestecko.dilna', popis: 'Dílna městečka', cesta: '/buddyworld/artpack-v1/models/dilna.glb', format: 'glb', dostupny: true },
  { klic: 'prostredi.dub', popis: 'Dub (jedna ze tří appčiných variant stromu v lese)', cesta: '/buddyworld/artpack-v1/models/dub.glb', format: 'glb', dostupny: true },
  { klic: 'prostredi.jedle', popis: 'Jedle (jedna ze tří appčiných variant stromu v lese)', cesta: '/buddyworld/artpack-v1/models/jedle.glb', format: 'glb', dostupny: true },
  { klic: 'prostredi.briza', popis: 'Bříza (jedna ze tří appčiných variant stromu v lese)', cesta: '/buddyworld/artpack-v1/models/briza.glb', format: 'glb', dostupny: true },
  { klic: 'prostredi.kamen-maly', popis: 'Malý kámen (jedna ze dvou appčiných variant skály v lese)', cesta: '/buddyworld/artpack-v1/models/kamen-maly.glb', format: 'glb', dostupny: true },
  { klic: 'prostredi.kamen-velky', popis: 'Velký kámen (jedna ze dvou appčiných variant skály v lese)', cesta: '/buddyworld/artpack-v1/models/kamen-velky.glb', format: 'glb', dostupny: true },
  { klic: 'prostredi.krystaly', popis: 'Krystalový útvar (blízký orientační bod)', cesta: '/buddyworld/artpack-v1/models/krystaly.glb', format: 'glb', dostupny: true },

  // Zbylých 20 modelů toho samého balíčku appka zkopírovala na disk
  // zároveň s těmi osmi výš, ale scéna je (ještě) nenahrává žádným
  // nacistGlbModel() voláním — PRO_CLAUDE.md jmenuje jen osm modelů
  // výš jako přímou náhradu appčiných starých assetů, zbytek appka
  // dokumentuje jako hotový-na-disku-ale-nezapojený, stejná appčina
  // konvence jako hrac.postava/nepritel.stinovy-vlcek výš.
  { klic: 'mestecko.zahonek', popis: 'Záhonek (appka má na disku z artpack-v1, scéna ho ještě nenahrává)', cesta: '/buddyworld/artpack-v1/models/zahonek.glb', format: 'glb', dostupny: false },
  { klic: 'mestecko.studna', popis: 'Studna (appka má na disku z artpack-v1, scéna ho ještě nenahrává)', cesta: '/buddyworld/artpack-v1/models/studna.glb', format: 'glb', dostupny: false },
  { klic: 'mestecko.lucerna', popis: 'Lucerna (appka má na disku z artpack-v1, scéna ho ještě nenahrává)', cesta: '/buddyworld/artpack-v1/models/lucerna.glb', format: 'glb', dostupny: false },
  { klic: 'mestecko.plot', popis: 'Plot (appka má na disku z artpack-v1, scéna ho ještě nenahrává)', cesta: '/buddyworld/artpack-v1/models/plot.glb', format: 'glb', dostupny: false },
  { klic: 'mestecko.roh-plotu', popis: 'Rohový plot (appka má na disku z artpack-v1, scéna ho ještě nenahrává)', cesta: '/buddyworld/artpack-v1/models/roh-plotu.glb', format: 'glb', dostupny: false },
  { klic: 'mestecko.brana', popis: 'Brána (appka má na disku z artpack-v1, scéna ho ještě nenahrává)', cesta: '/buddyworld/artpack-v1/models/brana.glb', format: 'glb', dostupny: false },
  { klic: 'mestecko.lavicka', popis: 'Lavička (appka má na disku z artpack-v1, scéna ho ještě nenahrává)', cesta: '/buddyworld/artpack-v1/models/lavicka.glb', format: 'glb', dostupny: false },
  { klic: 'mestecko.bedna', popis: 'Bedna (appka má na disku z artpack-v1, scéna ho ještě nenahrává)', cesta: '/buddyworld/artpack-v1/models/bedna.glb', format: 'glb', dostupny: false },
  { klic: 'mestecko.sud', popis: 'Sud (appka má na disku z artpack-v1, scéna ho ještě nenahrává)', cesta: '/buddyworld/artpack-v1/models/sud.glb', format: 'glb', dostupny: false },
  { klic: 'mestecko.rozcestnik', popis: 'Rozcestník (appka má na disku z artpack-v1, scéna ho ještě nenahrává)', cesta: '/buddyworld/artpack-v1/models/rozcestnik.glb', format: 'glb', dostupny: false },
  { klic: 'mestecko.mustek', popis: 'Můstek (appka má na disku z artpack-v1, scéna ho ještě nenahrává)', cesta: '/buddyworld/artpack-v1/models/mustek.glb', format: 'glb', dostupny: false },
  { klic: 'mestecko.stanek', popis: 'Stánek (appka má na disku z artpack-v1, scéna ho ještě nenahrává)', cesta: '/buddyworld/artpack-v1/models/stanek.glb', format: 'glb', dostupny: false },
  { klic: 'prostredi.parez', popis: 'Pařez (appka má na disku z artpack-v1, scéna ho ještě nenahrává)', cesta: '/buddyworld/artpack-v1/models/parez.glb', format: 'glb', dostupny: false },
  { klic: 'prostredi.kmen', popis: 'Padlý kmen (appka má na disku z artpack-v1, scéna ho ještě nenahrává)', cesta: '/buddyworld/artpack-v1/models/kmen.glb', format: 'glb', dostupny: false },
  { klic: 'prostredi.ker', popis: 'Keř (appka má na disku z artpack-v1, scéna ho ještě nenahrává)', cesta: '/buddyworld/artpack-v1/models/ker.glb', format: 'glb', dostupny: false },
  { klic: 'prostredi.trava', popis: 'Trs trávy (appka má na disku z artpack-v1, scéna ho ještě nenahrává)', cesta: '/buddyworld/artpack-v1/models/trava.glb', format: 'glb', dostupny: false },
  { klic: 'prostredi.houby', popis: 'Houby (appka má na disku z artpack-v1, scéna ho ještě nenahrává)', cesta: '/buddyworld/artpack-v1/models/houby.glb', format: 'glb', dostupny: false },
  { klic: 'prostredi.kvetiny', popis: 'Květiny (appka má na disku z artpack-v1, scéna ho ještě nenahrává)', cesta: '/buddyworld/artpack-v1/models/kvetiny.glb', format: 'glb', dostupny: false },
  { klic: 'prostredi.runovy-kamen', popis: 'Runový kámen (appka má na disku z artpack-v1, scéna ho ještě nenahrává)', cesta: '/buddyworld/artpack-v1/models/runovy-kamen.glb', format: 'glb', dostupny: false },
  { klic: 'prostredi.koreneny-oblouk', popis: 'Kořenový oblouk (appka má na disku z artpack-v1, scéna ho ještě nenahrává)', cesta: '/buddyworld/artpack-v1/models/koreneny-oblouk.glb', format: 'glb', dostupny: false },
]

/** appka vrátí `true`, jen pokud scéna model doopravdy nahrává
 *  skutečným GLTFLoaderem (viz komentář u BUDOUCI_ASSETY výš) —
 *  tenhle seznam appka ručně udržuje v souladu s tím, co
 *  useBuddyWorldScene.ts skutečně volá. */
export const jeAssetDostupny = (klic: string): boolean =>
  BUDOUCI_ASSETY.find((a) => a.klic === klic)?.dostupny ?? false
