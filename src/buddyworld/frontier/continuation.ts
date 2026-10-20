import type { RegionId, PathId, Species } from './content';
export const BUDDY_DEVELOPMENT: Record<string, {
    id: string;
    name: string;
    bond: number;
    text: string;
}[]> = {
    ember: [{ id: 'plamen', name: 'Vytrvalý plamen', bond: 3, text: 'Úder 40, hoření 8 s na jednom cíli.' }, { id: 'vybuch', name: 'Jiskřivý výbuch', bond: 8, text: 'Úder 35 až do tří blízkých cílů, hoření 2 s.' }],
    moss: [{ id: 'dotek', name: 'Hluboký dotek', bond: 3, text: 'Okamžitě obnoví 45 % zdraví, jeden cíl zakoření na 2 s.' }, { id: 'zahrada', name: 'Putovní zahrada', bond: 8, text: 'Obnoví 15 % zdraví a zanechá léčivý kruh na 4 s; dva cíle zakoření na 4 s.' }],
    nyx: [{ id: 'lovec', name: 'Lovec pravého stínu', bond: 3, text: 'Jediný cíl za 90, označení na 6 s; Archiváře odhalí na 10 s.' }, { id: 'ozveny', name: 'Tři ozvěny', bond: 8, text: 'Tři cíle za 55 a označení na 4 s. Obnova za 12 s.' }],
    frost: [{ id: 'mraz', name: 'Hluboký mráz', bond: 3, text: 'Úder 35, zmražení a zpomalení na 6 s.' }, { id: 'krusta', name: 'Ochranná krusta', bond: 8, text: 'Úder 50 a zpomalení; místo zmražení ochrání hráče štítem na 3 s.' }],
};
export function buddyDevelopment(mascot: string, choices: Record<string, string>, bond: number) { return (Object.hasOwn(BUDDY_DEVELOPMENT, mascot) ? BUDDY_DEVELOPMENT[mascot] : [])?.find(x => x.id === choices['buddy:' + mascot] && bond >= x.bond)?.id ?? ''; }
export interface Loadout {
    path: PathId;
    equipped: Record<string, string>;
    specialization: string;
}
export const MINIBOSSES: (Species & {
    elite: true;
    mechanic: string;
    at: [
        number,
        number
    ];
    reward: number;
    cosmetic: string;
    unlock: number;
})[] = [
    { id: 'mini-kamen', name: 'Šeptající kámen', region: 'udoli', elite: true, mechanic: 'crystals', at: [-22, -14], reward: 75, cosmetic: 'Jantarový znak', unlock: 3, behaviour: 'shield', color: '#b6a17c', hp: 450, damage: 14, speed: 1.4, range: 2.5, shape: 'golem', hint: 'Tři krystaly drží ochranu. Rozbij je interakcí nebo těžkým úderem.' },
    { id: 'mini-lovec', name: 'Stínový lovec', region: 'les', elite: true, mechanic: 'tracks', at: [22, -18], reward: 95, cosmetic: 'Znak lesního oka', unlock: 5, behaviour: 'hunter', color: '#8b769f', hp: 600, damage: 19, speed: 3, range: 2.2, shape: 'wolf', hint: 'Nejprve najdi jeho tři stopy v okolí. Zviditelní se až po jejich prozkoumání.' },
    { id: 'mini-breh', name: 'Břehový poutník', region: 'mokrad', elite: true, mechanic: 'salt', at: [-22, -20], reward: 115, cosmetic: 'Znak bílé soli', unlock: 10, behaviour: 'charger', color: '#78aeb1', hp: 750, damage: 23, speed: 1.8, range: 3, shape: 'golem', hint: 'Dvě solné nádoby rozptýlí vodní závoj. Potom uhýbej jeho výpadům.' },
    { id: 'mini-rytir', name: 'Rytíř odloženého úderu', region: 'ruiny', elite: true, mechanic: 'dodge', at: [22, -22], reward: 140, cosmetic: 'Znak měsíční čepele', unlock: 16, behaviour: 'shield', color: '#b49fc0', hp: 900, damage: 28, speed: 1.9, range: 2.7, shape: 'knight', hint: 'Úhyb v jeho blízkosti otevře zbroj na 2 s. Využij krátké okno pro protiútok.' },
];
export interface EpisodeStage {
    region: RegionId;
    at: [
        number,
        number
    ];
    title: string;
    text: string;
    options: string[];
    correct?: number;
    hold?: boolean;
}
export interface Episode {
    id: string;
    name: string;
    requires: string;
    reward: number;
    stages: EpisodeStage[];
}
export const EPISODES: Episode[] = [
    { id: 'dopis', name: 'Dopis, který počkal', requires: 'side:taska:done', reward: 70, stages: [
            { region: 'udoli', at: [-5, 12], title: 'Druhé dno brašny', text: 'Obchodník objevil pod podšívkou dopis. Je adresovaný Miře, ale chybí poslední stránka. Na obálce je kresba lavičky pod lesní břízou.', options: ['Převzít nedoručený dopis', 'Později'] },
            { region: 'les', at: [-8, 13], title: 'Stránka pod břízou', text: 'Pisatel prosí, aby Mira nezavírala dílnu. Poslední věta říká: „Domov drží pohromadě ten, kdo opraví i cizí dveře.“ Kdo měl dopis dostat?', options: ['Mira', 'Kael', 'Převozník', 'Později'], correct: 0 },
            { region: 'udoli', at: [-3, 3], title: 'Dopis má adresáta', text: 'Mira poznala písmo svého učitele. Myslela si, že na její práci zapomněl. Jak jí předáš jeho slova?', options: ['Vrátit dopis soukromě', 'Přečíst dopis u společného stolu', 'Později'] },
            { region: 'udoli', at: [-3, 3], title: 'Otevřené dveře', text: 'Mira znovu pověsí nad pracovní stůl učitelovo znamení. Příští opravu nabídne sama. Dopis konečně došel domů.', options: ['Zůstat na chvíli s Mirou', 'Později'] },
        ] },
    { id: 'stul', name: 'Jedno místo u stolu', requires: 'side:recept:done', reward: 80, stages: [
            { region: 'udoli', at: [-7, 4], title: 'Prázdná miska', text: 'Polévka se povedla. Mira ale nechala jednu misku prázdnou pro převozníka, který se neodvažuje opustit hráz. Chce mu připomenout domov.', options: ['Pomoci s pozváním', 'Později'] },
            { region: 'mokrad', at: [-10, 14], title: 'Vůně z hráze', text: 'Převozník si pamatuje vůni sladkého rákosu. Opatrně svaž několik stébel, aby kořeny zůstaly ve vodě.', options: ['Opatrně svázat rákos', 'Později'], hold: true },
            { region: 'udoli', at: [-7, 4], title: 'Koho posadíš vedle sebe?', text: 'Převozník přišel. U ohně stojí obchodník i lesní posel. Každý čeká, jestli je opravdu vítaný.', options: ['Přisednout k převozníkovi', 'Přisednout k lesnímu poslovi', 'Později'] },
            { region: 'udoli', at: [-7, 4], title: 'Stůl pro navrátilce', text: 'Misky jsou prázdné, ale nikdo ještě neodchází. U zahrady zůstane společný stůl jako připomínka této večeře.', options: ['Uzavřít společnou večeři', 'Později'] },
        ] },
    { id: 'srdce', name: 'Srdce z druhé strany', requires: 'side:milosrdny:done', reward: 90, stages: [
            { region: 'les', at: [-13, 8], title: 'Tvor si pamatuje', text: 'Z místa tvého rozhodnutí zůstala drobná jiskra. Nese značku stejné ruky, jaká je vyrytá v měsíčních ruinách.', options: ['Následovat vzpomínku', 'Později'] },
            { region: 'ruiny', at: [12, 12], title: 'Ruka na zdi', text: 'Nápis říká: „Kdo zůstal, hledá zahradu. Kdo byl propuštěn, hledá světlo.“ Připomeň svou volbu u kamenného tvora.', options: ['Zůstal v kameni', 'Jeho světlo je svobodné', 'Později'] },
            { region: 'udoli', at: [-9, 10], title: 'Místo pro jiného', text: 'Vzpomínka dorazila do vesnice. Může se stát součástí domova. V zahradě zůstane kamenný přítel, nebo klidný světelný strážce podle tvého dřívějšího rozhodnutí.', options: ['Připravit místo v zahradě', 'Později'] },
        ] },
];
export function episodeStage(id: string, choices: Record<string, string>) { const n = Number(choices['episode:' + id] ?? 0); return Number.isInteger(n) && n >= 0 && n < 10 ? n : 0; }
export function episodeAnswer(e: Episode, stage: number, index: number, choices: Record<string, string>) { const q = e.stages[stage]; if (!q || index < 0 || index >= q.options.length - 1)
    return false; if (e.id === 'srdce' && stage === 1)
    return index === (choices.kamen === 'klid' ? 0 : 1); return q.correct === undefined || index === q.correct; }
export const NEIGHBORS = [
    { id: 'dum', name: 'Mira a první dům', requires: 'pristresek:done', at: [9, 10] as [
            number,
            number
        ] },
    { id: 'dohoda', name: 'Slib u hráze', requires: 'dohoda:done', at: [-11, 13] as [
            number,
            number
        ] },
    { id: 'posel', name: 'Malý obyvatel údolí', requires: 'sprite', at: [-5, 8] as [
            number,
            number
        ] },
];
export function neighborText(id: string, choices: Record<string, string>) {
    if (id === 'dum')
        return choices.pristresek === 'dilna' ? 'Mira otevřela dílnu pro všechny. U domu připravila pracovní stojan a žádá tě o volbu znamení: lucerna, nebo list. Podle tebe jej vystaví.' : 'Útulek má prvního obyvatele: malou Lumu. Vyber jí místo u teplého kamene, nebo pod listovým přístřeškem. Luma tam bude odpočívat i při dalších návratech.';
    if (id === 'dohoda')
        return choices.dohoda === 'ochrana' ? 'Strážci dodrželi slib. Kael předal hlídce novou standartu. Vyber hlídku u brány, nebo u cesty k domu; její stanoviště ve vesnici uvidíš.' : 'Obchodníci přivezli slíbené zásoby. Vyber bedny u trhu, nebo sudy vedle dílny. Zboží zůstane součástí vesnice.';
    return 'Zachráněný posel už zná jména obyvatel. Chce u domu zasadit vlastní světlo. Vyber květiny, nebo krystalový keř; obojí mu připomene svatyni.';
}
export function bossPattern(id: string, phase: number, turn: number, lastHeavy: boolean) {
    if (id === 'boss-koreny')
        return { name: phase === 2 ? 'Kořenová hradba' : 'Tep kořenů', shape: phase === 2 ? 'line' : 'circle', radius: phase === 2 ? 2 : 4, windup: 1.4, cooldown: 3.2 };
    if (id === 'boss-voda')
        return { name: phase === 2 ? 'Proud mezi ostrůvky' : 'Úder čerpače', shape: phase === 2 ? 'islands' : 'circle', radius: phase === 2 ? 9 : 3.5, windup: 1.5, cooldown: 3.4 };
    if (id === 'boss-archiv' && phase === 1)
        return { name: 'Dotek prázdného archivu', shape: 'circle', radius: 3.5, windup: 1.4, cooldown: 3.2 };
    if (id === 'boss-archiv')
        return { name: lastHeavy ? 'Ozvěna těžkého úderu' : 'Ozvěna posledního kroku', shape: 'echo', radius: lastHeavy ? 3.5 : 2, windup: 1.6, cooldown: 3.5 };
    const stance = turn % (phase === 2 ? 4 : 2);
    return [{ name: 'Slunce · ustup z kruhu', shape: 'circle', radius: 5, windup: 1.5, cooldown: 3 }, { name: 'Kořen · uhni stranou', shape: 'line', radius: 2, windup: 1.5, cooldown: 3 }, { name: 'Voda · přibliž se ke strážci', shape: 'outer', radius: 9, windup: 1.6, cooldown: 3 }, { name: 'Paměť · přeruš těžkým úderem', shape: 'guard', radius: 5, windup: 1.8, cooldown: 3.2 }][stance];
}
export function inLine(point: {
    x: number;
    z: number;
}, from: {
    x: number;
    z: number;
}, to: {
    x: number;
    z: number;
}, width = 1.4) { const dx = to.x - from.x, dz = to.z - from.z, l = dx * dx + dz * dz; if (!l)
    return Math.hypot(point.x - from.x, point.z - from.z) < width; const t = Math.max(0, Math.min(1, ((point.x - from.x) * dx + (point.z - from.z) * dz) / l)); return Math.hypot(point.x - from.x - dx * t, point.z - from.z - dz * t) < width; }

/** PlaneGeometry lies in XY before its -90° X rotation; the long axis is unoriented. */
export function lineTelegraphAngle(from:{x:number;z:number},to:{x:number;z:number}){return Math.atan2(to.x-from.x,to.z-from.z)}
