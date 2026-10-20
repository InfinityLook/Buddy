/** Original expedition content. Existing games are references for genre only. */
export type RegionId='udoli'|'les'|'mokrad'|'ruiny'|'koreny'|'vodarna'|'archiv'
export type PathId='ochrance'|'stopar'|'runotvurce'
export type Behaviour='hunter'|'shield'|'ranged'|'healer'|'burrow'|'charger'|'summoner'|'boss'
export interface Region {id:RegionId;name:string;description:string;ground:string;fog:string;accent:string;unlock:number;dungeon?:boolean;parent?:RegionId}
export const REGIONS:Region[]=[
{id:'udoli',name:'Údolí prvního světla',description:'Domov, ztracená karavana a první rozhodnutí.',ground:'#8da67b',fog:'#dce9d3',accent:'#e5b66a',unlock:0},
{id:'les',name:'Šeptající les',description:'Kořeny si pamatují každého poutníka.',ground:'#526e5c',fog:'#91b6aa',accent:'#69d5cc',unlock:5},
{id:'mokrad',name:'Zatopené mokřady',description:'Staré hráze zadržují víc než vodu.',ground:'#6f8f83',fog:'#b0cecb',accent:'#85d4d7',unlock:10},
{id:'ruiny',name:'Měsíční ruiny',description:'Každý odraz vypráví trochu jiný příběh.',ground:'#77758a',fog:'#bcb3cf',accent:'#c5a2e1',unlock:16},
{id:'koreny',name:'Kořenová svatyně',description:'Nasměruj tři světla ke spícímu srdci.',ground:'#354f43',fog:'#668a7a',accent:'#8fe2b9',unlock:8,dungeon:true,parent:'les'},
{id:'vodarna',name:'Zatopená vodárna',description:'Tři ventily odhalí bezpečnou cestu.',ground:'#536f78',fog:'#8baebd',accent:'#75d5e7',unlock:13,dungeon:true,parent:'mokrad'},
{id:'archiv',name:'Zrcadlový archiv',description:'Pravý strážce vrhá jediný zlatý stín.',ground:'#59526d',fog:'#9e91b1',accent:'#dec08a',unlock:18,dungeon:true,parent:'ruiny'},
]
export const PATHS:Record<PathId,{name:string;description:string;range:number;speed:number;skill1:string;skill2:string;color:string}>= {
 ochrance:{name:'Ochránce',description:'Meč, odolnost a přesný protiútok.',range:2.6,speed:4.5,skill1:'Kruhový úder',skill2:'Ochranný štít',color:'#e5b66a'},
 stopar:{name:'Stopař',description:'Střelba, odstup a zpomalující past.',range:10,speed:5,skill1:'Průbojný výstřel',skill2:'Kořenová past',color:'#9dcc96'},
 runotvurce:{name:'Runotvůrce',description:'Runy, magické vlny a léčení.',range:8,speed:4.4,skill1:'Runová vlna',skill2:'Obnovující kruh',color:'#c5a2e1'},
}
export interface Species {id:string;name:string;region:RegionId;behaviour:Behaviour;color:string;hp:number;damage:number;speed:number;range:number;hint:string;shape:'wolf'|'slime'|'golem'|'insect'|'wisp'|'knight';boss?:boolean}
export const SPECIES:Species[]=[
{id:'trnovlk',name:'Trnový vlk',region:'udoli',behaviour:'hunter',color:'#577a64',hp:60,damage:8,speed:2.2,range:1.6,hint:'Obíhá do boku. Krátký výpad předem naznačí.',shape:'wolf'},
{id:'sliz',name:'Luční sliz',region:'udoli',behaviour:'charger',color:'#9cae67',hp:70,damage:10,speed:1.4,range:2,hint:'Před skokem se smrští. Ustup stranou.',shape:'slime'},
{id:'ostnatec',name:'Ostnatý brouk',region:'udoli',behaviour:'shield',color:'#a78c61',hp:95,damage:11,speed:1.2,range:1.8,hint:'Čelní pancíř ztlumí zásah. Obejdi ho.',shape:'insect'},
{id:'korenovec',name:'Kořenový obránce',region:'les',behaviour:'shield',color:'#799a71',hp:120,damage:14,speed:1.1,range:2,hint:'Záda jsou zranitelná, čelo chrání kůra.',shape:'golem'},
{id:'mura',name:'Měsíční můra',region:'les',behaviour:'ranged',color:'#bba3d3',hp:65,damage:10,speed:1.7,range:9,hint:'Vysílá viditelnou střelu. Uhni nebo se přibliž.',shape:'wisp'},
{id:'lecitel',name:'Mechový pěvec',region:'les',behaviour:'healer',color:'#8cc89c',hp:80,damage:5,speed:1.4,range:6,hint:'Léčí blízké spojence. Přeruš jeho zpěv.',shape:'wisp'},
{id:'pavouk',name:'Runový pavouk',region:'les',behaviour:'burrow',color:'#7b6b92',hp:90,damage:15,speed:2,range:2,hint:'Před vynořením označí místo na zemi.',shape:'insect'},
{id:'vlkodlak',name:'Lesní stopař',region:'les',behaviour:'hunter',color:'#685f79',hp:95,damage:12,speed:2.7,range:1.8,hint:'Drží se smečky a snaží se tě obejít.',shape:'wolf'},
{id:'bahnak',name:'Bahenní lovec',region:'mokrad',behaviour:'burrow',color:'#6e8273',hp:130,damage:17,speed:1.9,range:2,hint:'Sleduj kruh v bahně před jeho útokem.',shape:'slime'},
{id:'pijavice',name:'Pijavice hrází',region:'mokrad',behaviour:'charger',color:'#956e82',hp:100,damage:14,speed:2.2,range:2,hint:'Výpad míří na tvoji předchozí pozici.',shape:'wolf'},
{id:'bludicka',name:'Mokřadní bludička',region:'mokrad',behaviour:'ranged',color:'#8dd5dc',hp:85,damage:13,speed:2,range:10,hint:'Udržuje si odstup. Využij past nebo střelbu.',shape:'wisp'},
{id:'chovatel',name:'Chovatel mlhy',region:'mokrad',behaviour:'summoner',color:'#af9cbb',hp:140,damage:9,speed:1.2,range:7,hint:'Přivolává slizy. Zastav ho jako prvního.',shape:'knight'},
{id:'krab',name:'Hrázový krab',region:'mokrad',behaviour:'shield',color:'#a49b7c',hp:160,damage:16,speed:1,range:2,hint:'Pancíř vpředu odolává, boky jsou slabší.',shape:'insect'},
{id:'rytir',name:'Zrcadlový rytíř',region:'ruiny',behaviour:'shield',color:'#a3a0bf',hp:180,damage:20,speed:1.7,range:2.2,hint:'Po těžkém výpadu zůstává krátce odkrytý.',shape:'knight'},
{id:'prizrak',name:'Strážce ozvěn',region:'ruiny',behaviour:'ranged',color:'#b39acd',hp:110,damage:17,speed:2.1,range:10,hint:'Nabíjí střelu, která letí přímým směrem.',shape:'wisp'},
{id:'sberac',name:'Sběrač odrazů',region:'ruiny',behaviour:'healer',color:'#d2ae88',hp:130,damage:9,speed:1.5,range:7,hint:'Obnovuje poškozené spojence ve svém okolí.',shape:'knight'},
{id:'skorpion',name:'Měsíční štír',region:'ruiny',behaviour:'burrow',color:'#827a9a',hp:150,damage:22,speed:2,range:2,hint:'Jeho jedovaté vynoření předchází fialový kruh.',shape:'insect'},
{id:'vyvolavac',name:'Písař prázdnoty',region:'ruiny',behaviour:'summoner',color:'#785e89',hp:160,damage:14,speed:1.4,range:8,hint:'Přivolává malé odrazy. Přeruš nabíjení.',shape:'knight'},
{id:'boss-koreny',name:'Srdce kořenů',region:'koreny',behaviour:'boss',color:'#86aa72',hp:800,damage:22,speed:1.3,range:3,hint:'Rozsviť tři světla. Ustup kořenovým vlnám.',shape:'golem',boss:true},
{id:'boss-voda',name:'Hlubinný čerpač',region:'vodarna',behaviour:'boss',color:'#76b6c4',hp:1050,damage:27,speed:1.6,range:3,hint:'Ventily snižují hladinu a odkryjí jeho jádro.',shape:'golem',boss:true},
{id:'boss-archiv',name:'Archivář bez tváře',region:'archiv',behaviour:'boss',color:'#bca4cf',hp:1300,damage:30,speed:1.9,range:3,hint:'Zlatý maják odhalí pravého strážce na krátkou dobu.',shape:'knight',boss:true},
{id:'boss-final',name:'Rozlomený strážce',region:'ruiny',behaviour:'boss',color:'#dfb27b',hp:1800,damage:34,speed:1.7,range:3.2,hint:'Pod polovinou zdraví střídá vlny a pomocníky.',shape:'golem',boss:true},
]
export const species=(id:string)=>SPECIES.find(s=>s.id===id)??SPECIES[0]
export type Mechanic='talk'|'trail'|'repair'|'escort'|'choice'|'sequence'|'rescue'|'defend'|'dungeon'|'restore'|'valves'|'sneak'|'tow'|'mirror'|'fresco'|'escape'|'ritual'|'boss'|'finale'
export interface StoryStep {id:string;name:string;region:RegionId;mechanic:Mechanic;story:string;goal:string;at:[number,number];xp:number;reward:number}
export const STORY:StoryStep[]=[
{id:'hlas',name:'Dopis bez odesílatele',region:'udoli',mechanic:'talk',story:'Elara našla dopis od obchodníka, který se měl vrátit už před třemi dny. Buddy poznává vůni jeho zavazadla. Poprvé se vydáte za hranici domova.',goal:'Promluv s Elarou u studny. E nebo tlačítko Interakce.',at:[2.3,6],xp:35,reward:15},
{id:'stopy',name:'Kola v mokré trávě',region:'udoli',mechanic:'trail',story:'Stopy vozu náhle mizí. Tři drobné indicie však ukazují, že karavana odbočila z cesty dobrovolně.',goal:'Prozkoumej stopy v pořadí: kolo → šátek → lucerna.',at:[9,-5],xp:50,reward:20},
{id:'most',name:'Cesta přes potok',region:'udoli',mechanic:'repair',story:'Mira ti svěřila opravářskou sadu. Most unese tebe i obchodníka, pokud opravíš obě podpěry.',goal:'Oprav dvě označené podpěry. U každé podrž Interakci.',at:[10,-12],xp:55,reward:20},
{id:'karavana',name:'Návrat karavany',region:'udoli',mechanic:'escort',story:'Obchodník se skrýval před smečkou. Doprovodíš ho domů; při přepadení se bezpečně zastaví a počká.',goal:'Oslov obchodníka a doveď ho ke studni. Zastav přepadení.',at:[10,-15],xp:75,reward:35},
{id:'pristresek',name:'Pro koho bude první dům?',region:'udoli',mechanic:'choice',story:'Ve vesnici je místo pro další dílnu, nebo pro útulek zachráněných tvorů. Obě cesty pomohou domovu jinak.',goal:'U Elary zvol dílnu, nebo útulek. Volba mění vzhled a bonus.',at:[2.3,6],xp:60,reward:25},
{id:'lucerny',name:'Světla mezi kořeny',region:'les',mechanic:'sequence',story:'Staré lucerny nesou značky Kořen, List a Hvězda. Vytesaná věta říká: „Z kořene vyroste list, pod listem spatříš hvězdu.“',goal:'Rozsviť tři lucerny v pořadí Kořen → List → Hvězda.',at:[-6,-5],xp:80,reward:25},
{id:'klec',name:'Host v trnové kleci',region:'les',mechanic:'rescue',story:'Malý lesní posel se pokusil zachránit semeno svatyně. Dva strážci hlídají jeho klec.',goal:'Přemoz dva hlídače a otevři klec s poslem.',at:[9,-10],xp:90,reward:30},
{id:'semeno',name:'Než semeno zakoření',region:'les',mechanic:'defend',story:'Posel zasadí semeno. Jeho světlo přiláká dvě skupiny zkažených tvorů. Každá přichází z jiné strany.',goal:'U semene spusť obranu a odraz obě vlny.',at:[0,-16],xp:100,reward:40},
{id:'svatyne',name:'Srdce kořenů',region:'koreny',mechanic:'dungeon',story:'Semeno otevřelo vstup do svatyně. Tři světelné čočky odhalí spícího strážce a jeho zranitelné jádro.',goal:'Otoč tři čočky směrem k jádru a poraz Srdce kořenů.',at:[0,-22],xp:160,reward:70},
{id:'zahrada',name:'Co přineseš domů',region:'udoli',mechanic:'restore',story:'Zachráněný posel přinesl živé semeno. Založ ve vesnici zahradu, která připomene první společnou výpravu.',goal:'Zasaď semeno na připraveném záhonku ve vesnici.',at:[-6,7],xp:80,reward:30},
{id:'voda',name:'Voda, která zapomněla téct',region:'mokrad',mechanic:'valves',story:'Voda v mokřadech stojí. Zkontroluj přítok, odtok a přepad. Správné nastavení je 1, 2, 0.',goal:'Nastav tři venkovní ventily na 1 / 2 / 0 a spusť čerpadlo.',at:[-6,-6],xp:95,reward:35},
{id:'mlha',name:'Mezi pohledy hlídek',region:'mokrad',mechanic:'sneak',story:'Mlžní hlídači sledují starou hráz. Bezpečná trasa vede od rákosí přes rozbitý sloup k přístavišti.',goal:'Projdi třemi značkami. Pokud tě hlídka odhalí, začni u první.',at:[-12,-2],xp:100,reward:40},
{id:'cerpadlo',name:'První tep starého stroje',region:'mokrad',mechanic:'repair',story:'Dvě součástky čerpadla jsou uvolněné. Oprav je a mechanismus otevře cestu pod hladinu.',goal:'Oprav oba mechanismy u vstupu do vodárny.',at:[8,-12],xp:95,reward:40},
{id:'vodarna',name:'Pod hladinou',region:'vodarna',mechanic:'dungeon',story:'Na vstupní desce stojí: „Nejprve přítok, pak přepad, nakonec odtok.“ Otevři ventily 1 → 3 → 2.',goal:'Otevři ventily v pořadí 1 → 3 → 2 a poraz Hlubinného čerpače.',at:[0,-23],xp:190,reward:85},
{id:'lod',name:'Loď na suchu',region:'mokrad',mechanic:'tow',story:'Pokles hladiny uvěznil převozníka mezi ostrůvky. Připoj lano a protáhni jeho loď přes tři navigační body.',goal:'Připoj loď a projdi třemi značkami k přístavišti.',at:[12,6],xp:110,reward:45},
{id:'dohoda',name:'Dvě strany stejné hráze',region:'udoli',mechanic:'choice',story:'Obchodníci chtějí otevřít stezku, strážci udržet hlídku. Elara přijme tvé rozhodnutí a obě skupiny slíbí pomoc.',goal:'Rozhodni mezi zásobami obchodníků a ochranou strážců.',at:[2.3,6],xp:110,reward:40},
{id:'odrazy',name:'Dveře, které hledí jinam',region:'ruiny',mechanic:'mirror',story:'Tři zrcadla rozdělují paprsek. Na podstavcích jsou počty teček: 2, 0, 1. Každé otočení změní směr.',goal:'Nastav zrcadla na 2 / 0 / 1 a potvrď u centrálního prizmatu.',at:[-6,-5],xp:120,reward:45},
{id:'fresky',name:'Příběh na popraskané zdi',region:'ruiny',mechanic:'fresco',story:'Fresky zobrazují vesnici před pádem. Přečti je od nejstaršího stromu přes stavbu města po příchod strážců.',goal:'Najdi tři fresky a přečti je v pořadí Strom → Město → Strážce.',at:[-12,-12],xp:120,reward:45},
{id:'archiv',name:'Jediný pravý stín',region:'archiv',mechanic:'dungeon',story:'Archivář chrání poslední záznam. Fialové odrazy tě chtějí zmást. Zlatý maják na omezenou chvíli odhalí skutečné tělo.',goal:'Aktivuj zlatý maják, zasahuj odkrytého Archiváře a opakuj podle potřeby.',at:[0,-22],xp:220,reward:95},
{id:'utek',name:'Poslední dveře',region:'ruiny',mechanic:'escape',story:'S vyjmutím záznamu se chodba začala hroutit. Buddy ukazuje cestu ven. Nezastavuj se u každého pokladu.',goal:'Spusť únik u brány a projdi třemi bezpečnými body do 45 sekund.',at:[-12,-12],xp:130,reward:50},
{id:'obrana',name:'Za ty, kteří se vrátili',region:'udoli',mechanic:'defend',story:'Temnota sleduje světlo až domů. Všichni, kterým jsi pomohl, stojí za branou. Udržíš poslední dvě vlny.',goal:'U brány zahaj obranu vesnice a odraz obě skupiny.',at:[0,-12],xp:150,reward:60},
{id:'pecet',name:'Pečeť čtyř hlasů',region:'ruiny',mechanic:'ritual',story:'Vzpomínky určily pořadí: Domov, Les, Voda, Paměť. Obejdi kameny a slož příběh v jedinou pečeť.',goal:'Aktivuj čtyři kameny v pořadí 1 → 2 → 3 → 4.',at:[0,-15],xp:140,reward:50},
{id:'strazce',name:'Rozlomený strážce',region:'ruiny',mechanic:'boss',story:'Strážce věří, že údolí zachrání jen uzavřením všech cest. Ukaž mu, že společný domov je silnější než jeho strach.',goal:'U severní brány vyzvi a poraz Rozlomeného strážce.',at:[0,-23],xp:260,reward:120},
{id:'domov',name:'Svět, který zůstal otevřený',region:'udoli',mechanic:'finale',story:'Elara nepřipravila korunovaci. Připravila dlouhý stůl pro všechny, kteří se vrátili. Buddy si sedne vedle tebe. Údolí zase vypráví.',goal:'Vrať se k Elaře a uzavři příběh. Potom můžeš dál objevovat.',at:[2.3,6],xp:200,reward:100},
]
export const SIDEQUESTS=[
{id:'taska',name:'Ztracená brašna',region:'udoli' as RegionId,description:'Najdi brašnu u jižní skály a vrať ji obchodníkovi.',at:[-12,12] as [number,number],reward:35},
{id:'ryba',name:'Večeře pro převozníka',region:'mokrad' as RegionId,description:'U mola nahoď a stiskni Zatáhnout, když se ukazatel dostane do zeleného pole.',at:[-8,10] as [number,number],reward:45},
{id:'recept',name:'Polévka vzpomínek',region:'udoli' as RegionId,description:'U ohniště připrav polévku v pořadí voda → byliny → houby.',at:[-7,4] as [number,number],reward:35},
{id:'milosrdny',name:'Kámen se srdcem',region:'les' as RegionId,description:'Oslov osamělého kamenného tvora. Rozhodni, zda ho uklidníš, nebo osvobodíš jeho jádro.',at:[-13,8] as [number,number],reward:45},
{id:'beh',name:'Poslův závod',region:'les' as RegionId,description:'Projdi tři značky v pořadí během 30 sekund. Vracej se pro lepší čas bez dalších povinných odměn.',at:[10,10] as [number,number],reward:50},
{id:'poklad',name:'Mapa beze slov',region:'ruiny' as RegionId,description:'Sleduj značky půlměsíce, hvězdy a slunce až k ukrytému pokladu.',at:[12,7] as [number,number],reward:65},
]
export const EQUIPMENT=[
{id:'mec',name:'Čepel prvního světla',slot:'weapon',attack:5,armor:0,perk:'Po úhybu je další zásah silnější.',cost:50},
{id:'luk',name:'Luk lesních stezek',slot:'weapon',attack:8,armor:0,perk:'Delší dosah schopnosti Stopaře.',cost:80},
{id:'hul',name:'Hůl tichých run',slot:'weapon',attack:11,armor:0,perk:'Runotvůrce obnoví více zdraví.',cost:110},
{id:'kabatec',name:'Kabátec poutníka',slot:'armor',attack:0,armor:3,perk:'Snižuje příchozí poškození.',cost:45},
{id:'zbroj',name:'Zbroj strážců cest',slot:'armor',attack:0,armor:6,perk:'Větší ochrana pro závěrečné výpravy.',cost:100},
{id:'boty',name:'Boty lehkého kroku',slot:'boots',attack:0,armor:1,perk:'Úhyb se obnovuje o půl sekundy rychleji.',cost:60},
{id:'amulet',name:'Amulet společného světla',slot:'charm',attack:2,armor:1,perk:'Buddyho schopnost se obnovuje rychleji.',cost:75},
{id:'koren',name:'Srdce semene',slot:'charm',attack:4,armor:2,perk:'Trofej Kořenové svatyně.',cost:0},
{id:'perla',name:'Perla čisté vody',slot:'armor',attack:1,armor:8,perk:'Trofej Zatopené vodárny.',cost:0},
{id:'dvojkrok',name:'Boty dvojího kroku',slot:'boots',attack:0,armor:1,perk:'Druhý úhyb do 1,5 s po prvním. Další dvojice za 2,5 s.',cost:140},
{id:'echo',name:'Amulet ozvěny',slot:'charm',attack:1,armor:0,perk:'Buddyho schopnost se za 1 s zopakuje s poloviční silou.',cost:160},
{id:'odraz',name:'Zrcadlový štít',slot:'armor',attack:0,armor:4,perk:'Během Ochranného štítu odráží střely; s jinou cestou během úhybu.',cost:150},
{id:'rozstep',name:'Luk rozvětvených cest',slot:'weapon',attack:5,armor:0,perk:'Stopařova základní střela zasáhne další dva blízké cíle za 40 %.',cost:165},
{id:'stopa',name:'Hůl léčivých stop',slot:'weapon',attack:7,armor:0,perk:'Úhyb zanechá léčivý kruh na 4 sekundy.',cost:155},
{id:'zrcadlo',name:'Střep pravdivého odrazu',slot:'weapon',attack:15,armor:1,perk:'Trofej Zrcadlového archivu.',cost:0},
] as const
export const region=(id:RegionId)=>REGIONS.find(r=>r.id===id)!
