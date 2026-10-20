/** v43 content and pure rules; all rewards are backed by durable proof flags. */
import type { PathId, RegionId } from './content';
export const SPECIALIZATIONS = {
    ochrance: [{ id: 'bastion', name: 'Bastion', text: 'Ochranný štít trvá 6 s a odráží střely.' }, { id: 'bourac', name: 'Bourač', text: 'Kruhový úder způsobí o 25 % větší poškození.' }],
    stopar: [{ id: 'salva', name: 'Salva', text: 'Základní střela zasáhne další blízký cíl za 40 % poškození.' }, { id: 'lovec', name: 'Lovec', text: 'Kořenová past zastaví pohyb na 3 s a obnoví se za 9 s.' }],
    runotvurce: [{ id: 'pecovatel', name: 'Pečovatel', text: 'Obnovující kruh zůstane na zemi a 5 s léčí.' }, { id: 'boure', name: 'Bouře', text: 'Runová vlna přeruší nabíjení a na 3 s zpomalí.' }],
} satisfies Record<PathId, {
    id: string;
    name: string;
    text: string;
}[]>;
export const SECRETS = [
    { id: 'dutina', region: 'udoli', at: [-17, 17], name: 'Dutý kámen', hint: 'U jihozápadní skály se listí pohybuje proti větru.', reward: 55 },
    { id: 'ozvena', region: 'les', at: [-18, 15], name: 'Kořen, který naslouchá', hint: 'Na jihozápadě lesa se v dutém kořeni vrací ozvěna.', reward: 65 },
    { id: 'hladina', region: 'mokrad', at: [17, 15], name: 'Nesouhlasný odraz', hint: 'Na jihovýchodní mělčině svítí v odrazu kámen, který nad vodou chybí.', reward: 75 },
] satisfies {
    id: string;
    region: RegionId;
    at: number[];
    name: string;
    hint: string;
    reward: number;
}[];
export const EVENTS = [
    { id: 'trh', region: 'udoli', name: 'Znovu otevřený trh', requires: 'karavana:done', at: [-5, 14], text: 'Obchodník přivezl vzácné zboží. Vylož s ním tři různé bedny podle značek: nástroje, látka, léčiva.', effect: 'Otevře pět kusů zvláštní výbavy a sníží ceny nákupů o 10 %.' },
    { id: 'pramen', region: 'mokrad', name: 'Živý pramen', requires: 'voda:done', at: [-15, 14], text: 'Vyčištěný přítok vrátil do mokřadů život. Usměrni dva kameny na značky 1 a 2.', effect: 'U pramene se objeví klidný vodní tvor a léčivá zóna.' },
    { id: 'posel', region: 'les', name: 'Poslova tajná stezka', requires: 'sprite', at: [-13, 10], text: 'Zachráněný posel si vzpomněl na ztracené jméno svatyně. Odpověď: Kořen → Světlo → Domov.', effect: 'V každém dungeonu dovolí bezpečnou cestou otevřít obě hlavní brány.' },
] satisfies {
    id: string;
    region: RegionId;
    name: string;
    requires: string;
    at: number[];
    text: string;
    effect: string;
}[];
export const CHALLENGES = [
    { id: 'preruseni', name: 'Nenech je léčit', goal: 'Schopností 1 přeruš nabíjení léčitele nebo vyvolávače.', reward: 'Zlatý znak na Buddyho obojku' },
    { id: 'odraz', name: 'Vrať světlo', goal: 'S vybaveným Zrcadlovým štítem nebo jako Bastion odraz střelu.', reward: 'Modrý znak na Buddyho obojku' },
    { id: 'arena', name: 'Použij okolí', goal: 'Zasáhni příšeru padajícím závažím, párou nebo zřícenou podlahou.', reward: 'Fialový znak na Buddyho obojku' },
    { id: 'kombo', name: 'Společná řeč', goal: 'Proveď jedno kombo s Buddym.', reward: 'Zelený znak na Buddyho obojku' },
] as const;
export const CAMPS = [
    { region: 'udoli', at: [4, 14], name: 'Oheň u domova' },
    { region: 'les', at: [4, 13], name: 'Tábor pod větvemi' },
    { region: 'mokrad', at: [4, 14], name: 'Suché místo na hrázi' },
    { region: 'ruiny', at: [4, 12], name: 'Poslední světlo mezi ruinami' },
] satisfies {
    region: RegionId;
    at: number[];
    name: string;
}[];
export const PERSONALITIES: Record<string, {
    trait: string;
    camp: string;
    gesture: string;
}> = {
    ember: { trait: 'Odvážný zvěd', camp: 'Ember si střeží nejteplejší místo u ohně. Pak ti ho beze slova uvolní.', gesture: 'Nedočkavě poskakuje a točí se za ocasem.' },
    moss: { trait: 'Trpělivý pečovatel', camp: 'Moss přinese lístek jako podložku pod tvůj hrnek. Na ostatní vždycky myslí dřív.', gesture: 'Pomalu se uklání a naslouchá okolí.' },
    nyx: { trait: 'Zvídavý pozorovatel', camp: 'Nyx sleduje hvězdy v louži. Když se podíváš také, ukáže ti tu nejjasnější.', gesture: 'Natočí hlavu, ztichne a náhle se roztočí.' },
    frost: { trait: 'Klidný ochránce', camp: 'Frost obejde tábor a nakonec si lehne tak, aby viděl na cestu. Teď si můžeš odpočinout.', gesture: 'Zvedne hlavu, pokývne a usedne vedle tebe.' },
};
export type ComboKind = 'shatter' | 'pierce' | 'reveal';
export function resolveCombo(input: {
    frozen: boolean;
    rooted: boolean;
    marked: boolean;
    path: PathId;
    heavy: boolean;
}): {
    kind: ComboKind;
    multiplier: number;
} | null {
    if (input.frozen && input.heavy)
        return { kind: 'shatter', multiplier: 1.8 };
    if (input.rooted && input.path === 'stopar' && input.heavy)
        return { kind: 'pierce', multiplier: 1.6 };
    if (input.marked)
        return { kind: 'reveal', multiplier: 1.4 };
    return null;
}
export const COMBO_NAMES: Record<ComboKind, string> = { shatter: 'Ledový tříštivý úder', pierce: 'Průraz kořenů', reveal: 'Pravý cíl' };
export function canReward(facts: readonly string[], id: string) { return facts.includes('v43:proof:' + id) && !facts.includes('v43:reward:' + id); }
export function specialization(path: PathId, choices: Record<string, string>) { return SPECIALIZATIONS[path].some(s => s.id === choices['spec:' + path]) ? choices['spec:' + path] : ''; }
export function routeGate(values: Record<string, number>, gate: 1 | 2, original: boolean) { return original || !!values['route:shortcut'] || !!values['route:safe' + gate]; }
export function dodgeState(now: number, next: number, secondUntil: number, double: boolean) {
    const second = double && now < secondUntil;
    return { allowed: now >= next || second, secondUntil: second ? 0 : double ? now + 1.5 : 0, next: second ? next : now + 2.5 };
}
