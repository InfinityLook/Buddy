# Buddy — plán "mozku" pro asistenta (diskuze, zatím nic neimplementováno)

Stav k 3. listopadu 2026. Tohle je **plánovací dokument**, ne popis hotové funkce — stejně jako `docs/buddyworld-art-pack.md`, žije v `docs/` mimo pravidlo CLAUDE.md "dokumentuj jen to, co je hotové a ověřené". Shrnuje diskuzi o tom, jak dát appce vlastního, levného/zdarma a výkonově nenáročného konverzačního asistenta s osobností, ovládáním appky a VIP nadstavbou. Nic z tohoto dokumentu ještě není naimplementované.

## Odkud to vychází — diagnóza existující neuronky ("Buddy AI v1")

Appka už má od dřívějška experiment s vlastním neuronovým generátorem textu (`docs/buddy-ai-v1.md`, `src/buddy/local/`, `tools/buddy-ai/`) — transformer se 2 615 424 parametry, běžící lokálně v prohlížeči přes Web Worker, bez serveru. Je **vypnutý** (`active.json` → `enabled: false`), appku nijak nezatěžuje.

Zjištěno při kontrole kódu, trénovacího skriptu a reálných výstupů (`chat-v1-quality-check.json`):

- Model nemá **žádné předtrénování** — učí se gramatiku i význam čistě z vlastních 48 originálních konverzací (zbylých 296 v tréninkové sadě jsou šablonovité varianty téhož).
- Trénovací ztráta klesla na 0,05 (model se naučil trénovací věty zpaměti), ověřovací ztráta zůstala vysoká (8,38 → 5,46) — klasický příznak přeučení na malou sadu, ne nedotrénovaného modelu.
- Výsledek: slovní salát ("Zkus mi jsi v plánovač.", "Nemám Potom k ho pošit."). Jen 3 ze 30 testů prošly i jen povrchní technickou kontrolou.
- Trénink běží na GitHub Actions free runneru (žádné GPU, strop 2000 kroků) — i kdyby dat bylo víc, výpočetní rozpočet pro "zdarma" cestu je těsný.

**Závěr: tohle není otázka "ještě pár kroků navíc" — je to otázka chybějícího rozsahu dat a výpočtu, který se v režimu zdarma reálně nedá dohnat.** Infrastruktura okolo (Web Worker izolace, kontrola integrity vah, bezpečné zastavení, shoda JS/PyTorch výpočtu) je solidní a nemusí se přepisovat — jen samotná kvalita generovaného textu není použitelná.

## Rozhodnutí — gramatický "mozek" místo (jen) neuronky

Místo investice do většího neuronového modelu (nejistý výsledek, velká data/výpočet navíc, pryč od "zdarma") appka postaví **deterministický, pravidlový systém**: slovník + gramatika + sestavovač vět. Appka už dnes částečně tohle dělá (`conversationMemory.ts`), jen bez skloňování — zjištěný konkrétní bug:

```ts
return 'Zopakovat ' + studyTopic + ...   // "Zopakovat matematika" — má být "matematiku"
```

Gramatický systém tenhle typ chyby řeší u kořene a navíc umožní bohatší, ale vždycky gramaticky správné "volné povídání" — na rozdíl od neuronky, kde správnost nejde zaručit.

**Co appka záměrně NEudělá:** otevřenou konverzaci o čemkoli. Bude to mnohem bohatší skriptovaný systém v rámci appkou definovaných témat, ne obecná umělá inteligence. To je vědomý kompromis výměnou za to, že appka nikdy neřekne nesmysl.

**Co se nemění:** neuronka (Buddy AI v1) zůstává přesně tak, jak je — vypnutá, zdokumentovaná, bez dopadu na běh appky. Otázka, co s ní dál (nechat zaparkovanou / použít jako klasifikátor-výběr mezi kandidáty z gramatického systému / uklidit mrtvý kód starého cloudového chatu `zeptejSeBuddyho`/`api/buddy-chat.ts`), je **vědomě nerozhodnutá** a nebude se řešit bez výslovného zadání.

## Fáze A — slovník, gramatika, osobnost (volná úroveň)

- **Slovník**: omezený na doménu appky (ne celočeský) — školní předměty, appkové pojmy (úkol, poznámka, téma, motiv, Pomodoro...). Pro každé slovo: rod, skloňovací vzor, případné nepravidelné tvary.
- **Gramatika**: čisté, testovatelné TS funkce na české skloňování — jen vzory, které slovník potřebuje. **Číslovky jsou povinná součást od začátku**, ne "nice to have": čeština mění tvar podle počtu ("1 úkol", "2 úkoly", "5 úkolů") a bez toho zní appka rozbitě hned na první větě, co obsahuje číslo.
- **Sestavovač vět**: nahradí ruční spojování řetězců šablonami se slotama (slot řekne, jaký pád potřebuje; sestavovač dohledá tvar přes slovník+gramatiku).
- **Rozsah témat**: škola/učení, rozepsaná práce/projekt, appka a její moduly, nálady/pocity, denní plánování — plus stávající pozdrav/identita/poděkování/rozloučení.
- **Neznámé slovo**: appka řekne obecně "ten předmět"/"to téma" bez konkrétního skloňovaného tvaru, místo hádání skloňování z koncovky. (Hádání zůstává možné pozdější rozšíření, ne výchozí chování.)
- **Jedna výchozí osobnost** (přátelský, uvolněný "parťák" tón) — bez VIP výběru.

## Fáze B — appka umí přečíst svůj vlastní obsah

Rozšíření stávajícího `executeAction` systému (dnes umí jen VYTVÁŘET: poznámka/úkol/Pomodoro/motiv) o **čtecí** akce — Buddy nahlas přečte už existující appkový obsah, ne jen zapisuje nový.

- **Co appka přečte nejdřív**: dnešní rozvrh, nesplněné úkoly, poslední poznámka. Další appky (finance, cíle v Growth Roomu...) jako pozdější rozšíření.
- **Délka čtení** u delšího obsahu (např. 6 hodin v rozvrhu) — otevřená otázka: číst všechno s detaily, nebo shrnutí ("Dnes máš 6 hodin, první matematika v 8:00")?
- Číslovky z Fáze A se tu reálně využijí ("máš 3 nesplněné úkoly").

## Fáze C — VIP nadstavba

Přes appkou už zavedený vzor "free = funkční, VIP = kosmetická/rozšiřující nadstavba" (`cosmetics.premium`, zlaté vzhledy v Growth/Fitness/Economy Roomu). Kandidáti, seřazení podle toho, jak velký je to rozdíl pro uživatele:

1. **Výběr osobnosti** (vtipná / klidná / motivující varianta tónu) — nejviditelnější rozdíl.
2. Širší okruh témat/slovníku na povídání.
3. Víc čtecích akcí (Economy Room finance, Growth Room cíle...).
4. Vizuální odlišení — zlatě zabarvený Buddy, stejný vzor jako jinde v appce.
5. Delší konverzační paměť (dnes posledních 6 dvojic zpráv).

## Otevřené otázky (zatím vědomě nerozhodnuté)

- Pevná jedna věta na situaci, nebo víc variant pro živost (víc práce, víc testů)?
- Přesná strategie "shrnutí vs. všechno" při čtení delšího obsahu (Fáze B).
- Dlouhodobý osud neuronky Buddy AI v1 (zaparkovat / repurpose na klasifikátor / uklidit mrtvý kód starého cloudového chatu).
- Přesné pořadí budování slovníku uvnitř Fáze A (které appkové pojmy/témata jako první).

---

*Tenhle dokument se bude aktualizovat, jak se diskuze posune k rozhodnutím a implementaci.*
