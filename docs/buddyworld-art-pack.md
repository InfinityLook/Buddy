# Buddy World — grafický balíček (`BuddyWorld_ArtPack.zip`)

**`BuddyWorld_ArtPack.zip` už dorazil — ale jako čistě 2D vektorová
koncept-grafika (SVG), ne jako 3D modely.** Appčin vlastní manifest
(`ASSET_MANIFEST.json`) i README uvnitř balíčku to výslovně potvrzují:
"These are original 2D concept/placeholders. They are not production
3D GLB models, rigs, or animations." Appka ho proto rozdělila na dvě
zcela nezávislé vrstvy:

- **2D koncept-art (dorazilo, appka ho používá dnes)** — registr je
  `src/buddyworld/data/koncept.ts` (`KONCEPT_ASSETY`/
  `obrazekKonceptu()`), soubory leží pod `public/buddyworld/koncept/`.
  Appka appku zapojila do svého výběru maskota (`VyberMaskota.tsx`),
  HUD útočného tlačítka a nepřítelova portrétu (`HUD.tsx`), pozadí
  appčiny výběrové obrazovky a Hubova quick-linku (`Hub.tsx`) — viz
  CLAUDE.md's vlastní sekci "Buddy World — 2D koncept-art z
  BuddyWorld_ArtPack.zip" pro appčin plný popis toho, co kde appka
  vykresluje a proč.
- **3D modely (`.glb`, appka na ně dál čeká)** — zbytek téhle stránky
  popisuje přesně tohle: čistě 3D geometrii (postavy, maskoti,
  nepřátelé, prostředí), kterou appčin balíček NEOBSAHUJE a kterou
  appčina scéna (`scene/useBuddyWorldScene.ts`) proto dál vždycky
  kreslí jako primitivní geometrii (koule, kapsle, kužel, dvanáctistěn)
  — stejná "low-poly, snadno nahraditelný placeholder" technika, jaká
  se už osvědčila jinde v appce (viz `game/explorace/
  usePlayerWorld.ts`). Appčin README k balíčku appku na tohle výslovně
  upozorňuje: "For the 3D world, use placeholder geometry until proper
  GLB models and animations are prepared" — přesně appka tím
  doporučením postupuje.

Skutečný, strojově čitelný registr budoucích .glb cest je
`src/buddyworld/data/assets.ts` — tenhle Markdown soubor je jen jeho
lidsky čitelný doplněk pro toho, kdo balíček připravuje (pojmenování,
formáty, kam co patří), ne druhý zdroj pravdy. Jakmile se nějaký .glb
asset doplní, aktualizuje se `dostupny: true` u odpovídající položky v
`assets.ts`, ne tady. (2D koncept-art appka dokumentuje samo v
`data/koncept.ts` — v tabulce níž se nezmiňuje, protože je to
zcela jiná, nezávislá vrstva.)

## Jak balíček zapojit

1. Rozbalit obsah `BuddyWorld_ArtPack.zip` do `public/buddyworld/`
   podle cest v tabulce níž — žádná cesta se nevymýšlí dřív, než
   soubor skutečně existuje.
2. U odpovídající položky v `src/buddyworld/data/maskoti.ts`,
   `data/nepratele.ts` nebo `data/assets.ts` nastavit `model`/`cesta`
   z `null`/placeholderu na skutečnou cestu a `dostupny: true`.
3. Doplnit do scény (`scene/useBuddyWorldScene.ts`) `GLTFLoader` pro
   odpovídající položku — dnes ve scéně žádný kód na načítání `.glb`
   není, aby tam nezůstával nevyužitý a neodzkoušený kód dřív, než je
   co nahrávat.
4. Ověřit (`npm run typecheck && npm run test:unit && npm run build`)
   a vyzkoušet na reálném mobilu — při nahrazení placeholderu
   skutečným modelem je potřeba zkontrolovat výkon (počet trojúhelníků,
   velikost textur) stejnou disciplínou jako kdekoli jinde v appce.

## Doporučené formáty

- **Postavy, Buddy maskoti, nepřátelé, prostředí/dekorace**: `.glb`
  (binary glTF 2.0) — jde načíst jedním `GLTFLoader`em bez dalších
  souborů s texturami vedle (binární glTF je nese v sobě). Doporučený
  rozpočet na mobilní zařízení: do ~5 000 trojúhelníků na postavu nebo
  nepřítele, do ~1 500 na jeden kus dekorace (strom, skála) — scéna má
  desítky kusů dekorace najednou (viz dekorační smyčka ve scéně, která
  je rozesévá po ploše), takže každý jednotlivý kus musí být levný.
- **UI ikony**: `.png`, stejná konvence jako zbytek appky
  (`public/icons/hub-wheel/*.png`) — pro HUD a menu Buddy Worldu
  `public/buddyworld/icons/`.
- **Textury** (pokud nejsou součástí `.glb`): `.png`/`.webp`, výkonově
  šetrné rozlišení (1024×1024 nebo menší na mobilní zařízení — žádná
  postava ani strom ve třetí osobě nepotřebuje 4K texturu).

## Seznam potřebných assetů (viz skutečný registr v `data/assets.ts`)

| Klíč | Co to je | Cesta (`public/...`) | Formát |
|---|---|---|---|
| `maskot.ember` | Maskot Ember (oheň) — dnes jediný dočasně aktivní/hratelný | `/buddyworld/maskoti/ember.glb` | `.glb` |
| `maskot.moss` | Maskot Moss (příroda, podpora/léčení) | `/buddyworld/maskoti/moss.glb` | `.glb` |
| `maskot.nyx` | Maskot Nyx (magie) | `/buddyworld/maskoti/nyx.glb` | `.glb` |
| `maskot.frost` | Maskot Frost (led, obrana) | `/buddyworld/maskoti/frost.glb` | `.glb` |
| `hrac.postava` | Hráčova vlastní postava (dnes jen primitivní "meeple") | `/buddyworld/postavy/hrac.glb` | `.glb` |
| `nepritel.stinovy-vlcek` | Jediný dnešní typ nepřítele | `/buddyworld/nepratele/stinovy-vlcek.glb` | `.glb` |
| `prostredi.strom` | Strom pro "Enchanted Forest" prostředí | `/buddyworld/prostredi/strom.glb` | `.glb` |
| `prostredi.kamen` | Skála/kámen pro stejné prostředí | `/buddyworld/prostredi/kamen.glb` | `.glb` |
| `mestecko.zaklad` | První stavba budoucího městečka (jen základ, ne celý stavební systém) | `/buddyworld/mestecko/zaklad.glb` | `.glb` |

Nad tenhle seznam zadání dál zmiňuje: budoucí boss modely a animace,
další budovy, UI pozadí, materiály a textury navíc. Tyhle se doplní do
tabulky výš i do `data/assets.ts`, jakmile skutečně vznikne druhý typ
nepřítele, konkrétní budova nebo boss — stejná zásada "tabulka se
rozšiřuje, až je to doopravdy potřeba", jaká platí i pro ostatní datové
tabulky v appce (`postavy.ts`, `monsters.ts` a další).

## Co se záměrně nedělá dnes

- Nikde ve zdrojovém kódu se nevytváří cesta k souboru, který na disku
  neexistuje, a žádný `GLTFLoader`/`TextureLoader` nenačítá nic dřív,
  než ten soubor skutečně existuje.
- `dostupny: false` v `assets.ts` se nepřepisuje ručně na `true` dřív,
  než je soubor skutečně nahraný na disk a vyzkoušený — scéna tak
  nikdy nespadne na chybějící síťový požadavek.
