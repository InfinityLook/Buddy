import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import type { VillageProgress } from './villageProgress'

export interface CampaignProgress extends VillageProgress {
  care: number; placed: number; crystal1: boolean; crystal2: boolean; crystal3: boolean
  crystalBoss: boolean; forestBoss: boolean; forestDiscoveries: number; ruinsPuzzle: boolean; fragments: number
  ruinsBoss: boolean; buildings: number; sideQuests: number; relics: number; seals: boolean
  temple: boolean; dungeon: boolean; templeBoss: boolean; mainQuests: number; puzzleWins: number
}
export interface Mission {
  id: string; chapter: number; name: string; speaker: string; story: string; goal: string; target: string
  xp: number; coins: number; done: (s: CampaignProgress) => boolean
}
export const CHAPTERS = ['Probuzení', 'Ztracené světlo', 'Paměť kořenů', 'Tři pečetě', 'Srdce chrámu', 'Nový úsvit']
export const CAMPAIGN: Mission[] = [
  {id:'pouto',chapter:1,name:'Jiskra přátelství',speaker:'Elara',story:'Když se rozlomil kámen strážců, údolí zahalilo ticho. Dnes poprvé znovu někdo překročil starý most. Tvůj Buddy si tě našel sám. Než se vydáte dál, dej mu najevo, že v tom není sám.',goal:'V panelu Buddy svého společníka pohlaď nebo nakrm.',target:'vesnice',xp:25,coins:8,done:s=>s.care>=1},
  {id:'zasoby',chapter:1,name:'Z čeho vzniká domov',speaker:'Mira',story:'Po poslední bouři zůstala z mostu jen prkna. Můžeme čekat na pomoc, nebo začít sami. V okolí náměstí leží dřevo a kámen. Zářící uzly se časem obnovují.',goal:'Nasbírej alespoň 3 dřeva a 2 kameny. Používej tlačítko Sebrat poblíž surovin.',target:'vesnice',xp:35,coins:8,done:s=>s.drevo>=3&&s.kamen>=2},
  {id:'lucerna',chapter:1,name:'Světlo před prahem',speaker:'Mira',story:'Stíny se drží dál od světla. Vyrob v dílně lucernu, vyjdi na volné místo ve vesnici a postav ji. První světlo nebude velké. Ale bude naše.',goal:'V Osadě → Dílna vyrob lucernu a ve Stavění ji umísti do světa.',target:'vesnice',xp:45,coins:10,done:s=>s.placed>=1},
  {id:'hlidka',chapter:1,name:'První hlídka',speaker:'Kael',story:'Kdysi jsem strážil celé údolí. Teď sotva uhlídám jeho bránu. Nepřátelé ve Stínech lesa zkouší naši odvahu. Neútoč bezhlavě: kryj se a přivolej Buddyho schopnost.',goal:'Poraz 3 běžné nepřátele v lese nebo na mýtině.',target:'stiny-lesa',xp:55,coins:12,done:s=>s.porazeniNepratele>=3},
  {id:'vesnice',chapter:1,name:'Místo u ohně',speaker:'Elara',story:'Poprvé po dlouhé době se děti ptají, kdo se k nám přistěhuje. Rozšiř osadu. Nový domov není odměna za vítězství. Je důvodem, proč dál bojovat.',goal:'Rozšiř osadu na úroveň 2 v panelu Osada.',target:'vesnice',xp:65,coins:15,done:s=>s.uroven>=2},
  {id:'svetlo',chapter:2,name:'Ztracené světlo',speaker:'Elara',story:'Z mýtiny se v noci ozývá praskání. Tři úlomky odletěly z jejího krystalu. Přijmi výpravu Ztracené světlo, najdi je, poraz vetřelce a přines mi zprávu.',goal:'Dokonči výpravu Ztracené světlo v Deníku → Krystalové výpravy.',target:'kristalova-mytina',xp:85,coins:16,done:s=>s.crystal1},
  {id:'ozveny',chapter:2,name:'Ozvěny pod povrchem',speaker:'Elara',story:'Úlomky září ve stejném rytmu jako srdce tvého Buddyho. Něco na mýtině odpovídá. Vydej se tam znovu a zjisti, co krystal probudilo.',goal:'Přijmi a dokonči navazující výpravu Ozvěny krystalů.',target:'kristalova-mytina',xp:95,coins:18,done:s=>s.crystal2},
  {id:'signal',chapter:2,name:'Srdce mýtiny',speaker:'Elara',story:'Staré zápisky mluví o hlase, který slyší jen společníci. Buddy nás vede k samotnému středu krystalu. Tentokrát se nepokoušej světlu poroučet. Poslouchej ho.',goal:'Dokonči třetí krystalovou výpravu Srdce mýtiny.',target:'kristalova-mytina',xp:105,coins:20,done:s=>s.crystal3},
  {id:'krystalovy',chapter:2,name:'Strážce rozbitého světla',speaker:'Kael',story:'Krystalový strážce nerozeznává přátele od vetřelců. Uvnitř jeho těla praská temnota. Vstup do arény a přeruš její moc. Ustup z vyznačených kruhů nebo načasuj úhyb.',goal:'Na mýtině vyzvi a poraz Krystalového strážce.',target:'kristalova-mytina',xp:160,coins:30,done:s=>s.crystalBoss},
  {id:'lesni-hlasy',chapter:3,name:'Tři hlasy lesa',speaker:'Mossův odkaz',story:'Po strážcově pádu se les nadechl. Mezi stromy svítí tři krystaly: Ozvěna, Paměť a Světlo. Každý drží část příběhu těch, kteří tu stáli před námi.',goal:'Prozkoumej všechny 3 zářící krystaly v magickém lese.',target:'stiny-lesa',xp:110,coins:20,done:s=>s.forestDiscoveries>=3},
  {id:'runy-ruin',chapter:3,name:'Kořeny, světlo, paměť',speaker:'Mira',story:'V ruinách na severozápadě stojí kámen, který nezná lidská slova. Jen znamení. „Kořeny probudí světlo a světlo uchová paměť.“ To je klíč, který jsme hledali.',goal:'Dojdi do Zapomenutých ruin a vyřeš runovou hádanku.',target:'ruiny',xp:100,coins:20,done:s=>s.ruinsPuzzle},
  {id:'fragmenty',chapter:3,name:'Co strážci zanechali',speaker:'Elara',story:'Za rozsvícenými runami se otevřely tři vzpomínky. Kamenná pečeť, List paměti a Jiskra úsvitu. Najdi je kolem ruin. Dohromady odhalí, proč strážci opustili chrám.',goal:'Sesbírej všechny 3 fragmenty kolem ruin.',target:'ruiny',xp:110,coins:22,done:s=>s.fragments>=3},
  {id:'hlidac',chapter:3,name:'Poslední přísaha hlídače',speaker:'Hlídač ruin',story:'„Přísahal jsem chránit jejich paměť. Dokaž, že ji poneseš dál.“ Hlídač ti nedá nic zadarmo. Sleduj jeho výpad a zůstaň mimo kruh v okamžiku úderu.',goal:'Poraz Hlídače ruin. Útok i obrana fungují přes hlavní HUD.',target:'ruiny',xp:150,coins:28,done:s=>s.ruinsBoss},
  {id:'mesto',chapter:4,name:'Řemeslníci se vracejí',speaker:'Mira',story:'Nové světlo je vidět až z průsmyku. Lidé se vracejí a přinášejí řemesla. Postav funkční dílnu nebo sklad a udělej z naší osady skutečnou vesnici.',goal:'Dosáhni osady 3 a postav alespoň jednu funkční budovu.',target:'vesnice',xp:100,coins:22,done:s=>s.uroven>=3&&s.buildings>=1},
  {id:'pomoc',chapter:4,name:'Tváře našeho domova',speaker:'Elara',story:'Město netvoří jen domy. Kael potřebuje pomoc s hlídkou, Mira se stavbou a já se zásobami. Zastav se u nás. Občas je malá laskavost důležitější než velké vítězství.',goal:'Dokonči alespoň 2 vedlejší úkoly obyvatel.',target:'vesnice',xp:110,coins:24,done:s=>s.sideQuests>=2},
  {id:'haj',chapter:4,name:'Stín v háji',speaker:'Kael',story:'Lesní strážce chránil údolí dávno před mou první hlídkou. Temnota ho obrátila proti nám. Najdeš ho na severu. Teď už víš, že ani velká síla není neporazitelná.',goal:'Poraz Lesního strážce v severním háji.',target:'haj-strazce',xp:170,coins:32,done:s=>s.forestBoss},
  {id:'relikvie',chapter:4,name:'Tři pečetě',speaker:'Elara',story:'Jedna relikvie nese kořeny, druhá paměť a třetí naději. Aktivuj všechny tři. Nesou totéž znamení jako dveře starého chrámu.',goal:'Najdi 3 relikvie a aktivuj je tlačítkem Sebrat. Polohy najdeš na mapě v panelu Svět.',target:'chram',xp:130,coins:25,done:s=>s.relics>=3},
  {id:'probuzeni',chapter:5,name:'Odpověď strážců',speaker:'Hlas údolí',story:'Z tří světel se stává jediný paprsek. Strážci konečně odpovídají: „Cesta je otevřená. Rozhodnutí zůstává na vás.“',goal:'V panelu Svět → Probuzení strážců spoj všechny pečetě.',target:'chram',xp:100,coins:20,done:s=>s.seals},
  {id:'oltar',chapter:5,name:'Za kamennou branou',speaker:'Elara',story:'Chrám nezavřeli, aby nás udrželi venku. Zavřeli ho, aby temnota zůstala uvnitř. Prozkoumej oltář. Buddyho světlo nás ochrání.',goal:'Přibliž se k oltáři starého chrámu a prozkoumej ho v panelu Svět.',target:'chram',xp:100,coins:24,done:s=>s.temple},
  {id:'podzemi',chapter:5,name:'Zkouška tichých run',speaker:'Hlas strážce',story:'„Síla bez paměti jen opakuje staré chyby.“ Najdi tři runy kolem chrámu, rozzař je ve správném pořadí a vrať se do jeho síně.',goal:'Aktivuj 3 chrámové runy a otevři síň u oltáře.',target:'chram',xp:120,coins:25,done:s=>s.dungeon},
  {id:'chramovy',chapter:5,name:'Srdce chrámu',speaker:'Kael',story:'Poslední strážce stále drží svůj post. Pod jeho zbrojí bije temné jádro. Toto je poslední boj o údolí. Pozor na širší fialovou vlnu v druhé fázi.',goal:'V aréně na východ od oltáře poraz Chrámového strážce.',target:'chram',xp:200,coins:45,done:s=>s.templeBoss},
  {id:'pecovat',chapter:6,name:'Chvíle pro nás',speaker:'Buddy',story:'Po bitvě se Buddy tiše opře o tvou ruku. Celou cestu stál po tvém boku. Dnes nikam nespěcháte. Vyhrajte spolu jednu krystalovou paměťovou hru.',goal:'Vyhraj minihru Krystalová paměť v panelu Buddy.',target:'vesnice',xp:100,coins:22,done:s=>s.puzzleWins>=1},
  {id:'novy-domov',chapter:6,name:'Město pod novým nebem',speaker:'Mira',story:'Chrám ztichl a stezky jsou zase bezpečné. Máme dost místa pro všechny, kteří se chtějí vrátit. Dokonči město a úkoly obyvatel z původní kroniky.',goal:'Dosáhni osady 5 a dokonči všech 12 hlavních úkolů v Osadě → Úkoly.',target:'vesnice',xp:150,coins:30,done:s=>s.uroven>=5&&s.mainQuests>=12},
  {id:'usvit',chapter:6,name:'Údolí, které si pamatuje',speaker:'Elara',story:'Ráno se vrací zvony. Elara stojí u nového mostu a usmívá se. „Strážci chránili kameny. Vy jste ochránili to, co mezi nimi žije.“ Buddy zvedne hlavu ke světlu. Tohle je váš domov.',goal:'Vrať se do vesnice a uzavři příběh. Potom můžeš dál volně hrát.',target:'vesnice',xp:120,coins:50,done:()=>true},
]

export const platnaKampan = (input: unknown): string[] => {
  if (!Array.isArray(input)) return []
  const result: string[] = []
  for (const m of CAMPAIGN) {if (!input.includes(m.id)) break; result.push(m.id)}
  return result
}
export const currentMission = (claims: readonly string[]) => CAMPAIGN.find(m=>!claims.includes(m.id)) ?? null
export const careAt = (care: number, updatedAt: number, now: number) => Math.max(20, Math.min(100, care - Math.max(0, now-updatedAt)/3_600_000*5))
export const memoryDeck = (random: ()=>number = Math.random): number[] => {
  const deck = [0,1,2,3,4,5,0,1,2,3,4,5]
  for(let i=deck.length-1;i>0;i--){const j=Math.max(0,Math.min(i,Math.floor(random()*(i+1))));[deck[i],deck[j]]=[deck[j],deck[i]]}
  return deck
}
interface Adventure {
  coins: number; food: number; care: number; careAt: number; careActions: number; lastCare: number
  campaign: string[]; puzzleWins: number; lastPuzzleReward: number; seenIntro: boolean
  sound: boolean; difficulty: 'normalni'|'pribehova'; reducedMotion: boolean; largeText: boolean
  startedAt: number
  careForBuddy: (feed: boolean, now?: number)=>boolean
  buyFood: ()=>boolean
  puzzleReward: (now?: number)=>boolean
  claim: (id: string, snapshot: CampaignProgress, inVillage: boolean)=>boolean
  preferences: (p: Partial<Pick<Adventure,'sound'|'difficulty'|'reducedMotion'|'largeText'|'seenIntro'>>)=>void
}
export const useAdventureStore = create<Adventure>()(persist((set,get)=>({
  coins: 20, food: 3, care: 70, careAt: Date.now(), careActions: 0, lastCare: 0,
  campaign: [], puzzleWins: 0, lastPuzzleReward: 0, seenIntro: false, sound: false, difficulty:'normalni',
  reducedMotion:false, largeText:false, startedAt:Date.now(),
  careForBuddy: (feed, now=Date.now())=>{
    const s=get(); if(now-s.lastCare<5000 || (feed&&s.food<=0)) return false
    set({food:s.food-(feed?1:0),care:Math.min(100,careAt(s.care,s.careAt,now)+(feed?25:10)),careAt:now,lastCare:now,careActions:s.careActions+1});return true
  },
  buyFood:()=>{const s=get();if(s.coins<5)return false;set({coins:s.coins-5,food:Math.min(999,s.food+1)});return true},
  puzzleReward:(now=Date.now())=>{const s=get();if(now-s.lastPuzzleReward<60000)return false;set({puzzleWins:s.puzzleWins+1,coins:Math.min(1_000_000,s.coins+12),lastPuzzleReward:now});return true},
  claim:(id,snapshot,inVillage)=>{const s=get(),m=currentMission(s.campaign);if(!m||m.id!==id||!m.done(snapshot)||(id==='usvit'&&!inVillage))return false;set({campaign:[...s.campaign,id],coins:Math.min(1_000_000,s.coins+m.coins)});return true},
  preferences:p=>set(p),
}),{
  // appka tenhle store, stejně jako každý jiný appčin persistovaný
  // Zustand store (useBuddyWorldStore.ts, useVillageStore.ts), drží
  // přes sdílený secureStorage (XOR obfuskace, ne skutečné
  // zabezpečení — appka to má jen jako slabé, levné odrazení od
  // ručního hraboše v devtools, ne skutečnou hranici) — appčin
  // saveBackup.ts umí zálohovat/obnovit tenhle klíč beze změny, ať
  // appka v localStorage drží čistý JSON, nebo appčinu obfuskovanou
  // hodnotu, protože appka při zálohování kopíruje syrové řetězce,
  // nikdy je nedekóduje.
  name:'buddyworld:adventure:v1', storage:createJSONStorage(()=>secureStorage),
  merge:(saved,current)=>{
    const s=(saved&&typeof saved==='object'?saved:{}) as Partial<Adventure>
    const n=(value:unknown,fallback:number,max=1_000_000)=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=max?value:fallback
    return {...current,coins:n(s.coins,20),food:n(s.food,3,999),care:n(s.care,70,100),careAt:n(s.careAt,Date.now(),Date.now()),lastCare:n(s.lastCare,0,Date.now()),careActions:n(s.careActions,0),campaign:platnaKampan(s.campaign),puzzleWins:n(s.puzzleWins,0),lastPuzzleReward:n(s.lastPuzzleReward,0,Date.now()),seenIntro:s.seenIntro===true,sound:s.sound===true,difficulty:s.difficulty==='pribehova'?'pribehova':'normalni',reducedMotion:s.reducedMotion===true,largeText:s.largeText===true,startedAt:n(s.startedAt,Date.now(),Date.now())}
  },
}))
