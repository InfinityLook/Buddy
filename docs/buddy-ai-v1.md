# Buddy AI v1 — společné řízení a první kontrola generátoru

Stav k 2. listopadu 2026. Základ: commit `56478c8f5f63c991bc64f6acee74d338984ae6fa`.

Připravené je společné řízení obou modelů, běh vlastního Transformeru v JavaScriptu a reprodukovatelné trénování rozšířené české sady. **Konverzační váhy tohoto pilotu zatím nejsou vhodné pro vydání.** V `public/buddy-ai/chat/active.json` je proto `enabled: false`. Aplikace dál používá dosavadní funkční příkazy a připravené odpovědi. Změna nepřidává placenou službu ani další závislost do aplikace.

## Co je implementováno

- `createBuddyDialogue` přijímá vedle rozpoznávače záměrů a adaptéru akcí také textový generátor. Jde o jednoho asistenta se dvěma specializovanými modely uvnitř; jejich váhy se neslučují.
- Doplňování rozpracované akce, zrušení, známé příkazy a současná strukturovaná paměť mají přednost. Generátor doplňuje běžné povídání a nepokryté konverzační dotazy.
- Generátor dostává nejvýše šest posledních dvojic zpráv, aktuální dotaz a krátké shrnutí opraveného tématu z téže paměti, kterou používají úkoly z rozhovoru. Výpočet promptu odstraňuje staré celé dvojice podle skutečných tokenů.
- Vlastní byte-BPE, LayerNorm, kauzální vícehlavá pozornost, GELU a sdílené výstupní embeddingy odpovídají exportu z PyTorche. KV cache znovu používá již vypočtené pozice. Není potřeba ONNX ani externí inference služba.
- Web Worker odděluje CPU výpočet od ovládání aplikace. Zastavení ukončí Worker, zruší čekání a zabrání přijetí pozdního výsledku. Stávající hlas přečte výsledný text stejnou cestou jako dosud.
- Generátor má pouze zprávy a signál zrušení. Nemá adaptér akcí ani přístup ke storům. Vygenerovaný příkaz je text; uložit odpověď může až další výslovný pokyn uživatele.
- Chybějící model, chyba výpočtu, neúplná čeština v UTF-8, zjevné opakování nebo nepodložená formulace typu „uložil jsem“ vrátí připravenou odpověď. Textové filtry nejsou zárukou významové správnosti.
- Manifest kontroluje rozměry, pořadí a offsety všech tensorů i strukturu BPE. Váhy se kontrolují přes SHA-256, přesnou délku a konečné hodnoty. Čtení omezuje velikost i bez Content-Length.
- Ověřený manifest a váhy se ukládají pod jmény odvozenými od stejného hashe. Offline ukazatel se zapisuje až po obou souborech. Čerstvé vypnutí generátoru má přednost před dříve uloženou aktivací.

## Limity základního běhu

| Nastavení | Hodnota |
|---|---:|
| Vstupní zpráva | nejvýše 500 znaků |
| Přijatá generovaná odpověď | nejvýše 480 znaků |
| Kontext modelu | 256 tokenů |
| Rezerva odpovědi | 48 tokenů |
| Limit CPU výpočtu | 6 sekund |
| Celkový limit požadavku včetně načítání | 25 sekund |
| Schválené váhy pro aplikaci | žádné; generátor je vypnutý |

Příliš dlouhý aktuální dotaz se neřeže uprostřed zadání; použije se náhradní odpověď. Paměť je pouze v RAM jedné relace. Hlas nadále závisí na dostupných službách prohlížeče a zařízení.

## Data a skutečný výsledek trénování

`expand_chat_data.py` vytvoří deterministickou sadu z původních příkladů a nových autorských variant. Výstup obsahuje **296 trénovacích rozhovorů včetně variant a 40 ověřovacích rozhovorů**. Samostatný `chat_eval.json` obsahuje **30 kontrolních zadání**. Varianty obdobných vět nejsou stejný počet nezávislých znalostí. Testy kontrolují překryv i při jiné odpovědi, odstraněné diakritice, změně interpunkce a u společného začátku delšího rozhovoru. Tokenizér se učí jen z trénovací části.

Pilot byl skutečně natrénován na 2 000 krocích. Má 2 615 424 parametrů a 10 461 696 bajtů vah float32. Samotné trénovací kroky trvaly 89,542 sekundy na CPU; příprava dat ani ověřování v tomto čase nejsou. Ověřovací ztráta na celé ověřovací sadě klesla z 8,3790 na 5,4761. Trénovací ztráta na poslední dávce byla 0,0521; velký rozdíl vůči ověřování ukazuje na výrazné přeučení.

Na třiceti samostatných zadáních splnily jednoduché diagnostické podmínky jen **3 odpovědi**. Ani tento počet neznamená tři jazykově správné odpovědi: některé kontroly pouze hledají zakázané tvrzení a dokončený výstup. Ruční přečtení ukázek ukazuje nesouvislou češtinu a ztrátu tématu. **Výsledek neprošel posouzením pro zapnutí generátoru.** Další pouhé opakování stejných trénovacích vět není řešení.

Příklady z tohoto běhu:

| Zadání | Skutečný výstup |
|---|---|
| Známé „Kdo jsi?“ | „Jsem Buddy, pomocník v aplikaci. Můžeme si povídat o tvém dni nebo plánování.“ |
| Nové „Zdravím, můžeš mi říct své jméno?“ | „Není z tohoto rozhovoru nevím.“ |
| Oprava matematiky na fyziku | „Začni teď posloucháš?“ |

Podklady jsou v `tools/buddy-ai/output/chat-v1-training-report.json` a `chat-v1-quality-check.json`. Kontrolní report obsahuje hash checkpointu, dat i kontrolních zadání. Nezobrazuje procento inteligence a sám nikdy model neaktivuje.

## Ověření výpočtu a aplikace

Numerický fixture vytvořený PyTorchem je uložený v `tests/fixtures/buddy-transformer-v1.json`. Automatické testy porovnávají každý logit na každé pozici, tokenizaci češtiny a emoji, KV cache, reset, rozměry modelu a poškození souborů. Další testy ověřují offline načtení, vypnutí dříve aktivního modelu, skutečné ukončení Workeru, časový limit, souběh, zachování paměti a oddělení generovaného textu od provádění akcí.

Také plné váhy právě natrénovaného modelu byly porovnány mezi Pythonem a JavaScriptem. Největší rozdíl logitů byl 0,0000014305. Zkušební prompt měl 10 tokenů; výpočet 7 výstupních tokenů skončil EOS a trval 47,31 ms v Node.js na dostupném CPU. **To není měření telefonu ani běhu Workeru v reálném mobilním prohlížeči.** Nezahrnuje síť, načtení a inicializaci modelu. Výsledek je v `chat-v1-runtime-check.json`.

`createBrowserGenerator().getMetrics()` poskytuje pro budoucí měření celkovou dobu požadavku ve Workeru, načítání, inicializaci, generování, počty tokenů a velikost vah. Velikost vah není spotřeba RAM aplikace. Špička 403,9 MiB v trénovacím reportu patří trénovacímu Python procesu.

## Reprodukce

Z kořene repozitáře:

```bash
npm test
npm run build
python -m unittest discover -s tools/buddy-ai -p 'test_chat_*.py'
python tools/buddy-ai/expand_chat_data.py
python tools/buddy-ai/chat_pilot.py --self-test
python tools/buddy-ai/chat_pilot.py --data tools/buddy-ai/chat-pilot-output/training-data.json --steps 2000 --seconds 180 --threads 2
python tools/buddy-ai/chat_probe.py --data tools/buddy-ai/chat-pilot-output/training-data.json
```

Python trénování potřebuje CPU PyTorch 2.10.0, stejně jako stávající workflow. Rychlé testy dat PyTorch nepotřebují. Workflow `Buddy - pilot konverzace` připraví rozšířená data, natrénuje model a uloží výsledky jako dočasný artefakt. Nic samo nenasazuje. Fixture lze obnovit příkazem `python tools/buddy-ai/export_browser_fixture.py`.

## Co ještě brání vydání celé první verze

Největší zbývající práce je kvalita konverzace: rozmanitější samostatně napsané dialogy, trénování podle výsledků na vývojové sadě a další dosud nepoužitá kontrolní sada po úpravách dat. Současná kontrolní zadání se po jejich použití při ladění stávají vývojovými; nesmějí dál předstírat nezávislý závěrečný test.

Po použitelném jazykovém výsledku zbývá zkouška celého Workeru v prohlížeči se schválenými vahami, skutečné měření na Androidu, studený start, delší používání, offline aktualizace, hlas a přerušování. Teprve ověřená verze má dostat manifest a váhy do `public/buddy-ai/chat/` a aktivační soubor ve formátu níže. Hash musí patřit přesným ověřeným vahám. Současný pilot se tímto souborem **nezapíná**.

```json
{
  "version": 1,
  "enabled": true,
  "manifest": "model-<sha256>.json",
  "weights": "weights-<sha256>.bin",
  "review": { "status": "approved", "modelSha256": "<sha256>" }
}
```

Načítání vyžaduje oba soubory ze stejné aplikace a kontrolní součet. Generátor zůstává dostupný jako volitelná část; neúspěch při jeho spuštění musí vždy zachovat použitelnost dosavadních příkazů.
