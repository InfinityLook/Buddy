import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { STORY, REGIONS, EQUIPMENT, SIDEQUESTS, type RegionId, type PathId } from './content';
import { canReward, SPECIALIZATIONS } from './expansion';
import { BUDDY_DEVELOPMENT, MINIBOSSES, EPISODES, NEIGHBORS, episodeStage, episodeAnswer, type Loadout } from './continuation';
export interface Position {
    x: number;
    z: number;
}
export interface EnemySave extends Position {
    hp: number;
    dead?: boolean;
}
export interface LocationSave {
    position: Position;
    hp: number;
    enemies: Record<string, EnemySave>;
    values: Record<string, number>;
    elapsed: number;
}
export interface FrontierState {
    version: 44;
    region: RegionId;
    path: PathId;
    mission: number;
    facts: string[];
    choices: Record<string, string>;
    gold: number;
    shards: number;
    owned: string[];
    equipped: Record<string, string>;
    upgrades: Record<string, number>;
    bestiary: Record<string, number>;
    side: string[];
    saves: Partial<Record<RegionId, LocationSave>>;
    activeSeconds: number;
    missionTimes: number[];
    runs: Record<string, number>;
    bond: number;
    notice: string;
    flag: (id: string) => void;
    choose: (id: string, value: string) => void;
    claim: () => boolean;
    travel: (id: RegionId) => boolean;
    buy: (id: string) => boolean;
    equip: (id: string) => boolean;
    upgrade: (id: string) => boolean;
    setPath: (id: PathId) => void;
    finishSide: (id: string) => boolean;
    recordKill: (species: string) => void;
    save: (location: LocationSave, seconds: number, region?: RegionId) => void;
    rewardDiscovery: (id: string) => boolean;
    setSpecialization: (id: string) => boolean;
    loadouts: Partial<Record<'1' | '2', Loadout>>;
    saveLoadout: (slot: '1' | '2') => boolean;
    applyLoadout: (slot: '1' | '2') => boolean;
    developBuddy: (mascot: string, id: string) => boolean;
    advanceEpisode: (id: string, index: number) => boolean;
    rewardMoment: (id: string) => boolean;
    restartDungeon: () => void;
}
export const initialLocation = (): LocationSave => ({ position: { x: 0, z: 12 }, hp: 100, enemies: {}, values: {}, elapsed: 0 });
export function objectiveComplete(state: Pick<FrontierState, 'facts' | 'mission'>) { return !!STORY[state.mission] && state.facts.includes(STORY[state.mission].id + ':done'); }
export function unlocked(id: RegionId, mission: number) { return REGIONS.some(r => r.id === id && mission >= r.unlock); }
export function equipmentStats(s: Pick<FrontierState, 'equipped' | 'upgrades'>) {
    let attack = 0, armor = 0;
    for (const id of Object.values(s.equipped)) {
        const item = EQUIPMENT.find(i => i.id === id);
        if (item) {
            attack += item.attack + (s.upgrades[id] ?? 0) * 2;
            armor += item.armor + (s.upgrades[id] ?? 0);
        }
    }
    return { attack, armor };
}
const cleanStrings = (v: unknown, allowed?: (s: string) => boolean) => Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string' && x.length < 160 && (!allowed || allowed(x))))].slice(0, 1000) : [];
const finite = (v: unknown, fallback: number, max = 1e7) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max ? v : fallback;
export const useFrontierStore = create<FrontierState>()(persist((set, get) => ({
    version: 44, region: 'udoli', path: 'ochrance', mission: 0, facts: [], choices: {}, gold: 60, shards: 0, owned: ['mec', 'kabatec'], equipped: { weapon: 'mec', armor: 'kabatec' }, upgrades: {}, bestiary: {}, side: [], saves: {}, activeSeconds: 0, missionTimes: [], runs: {}, bond: 0, notice: '', loadouts: {},
    flag: id => set(s => s.facts.includes(id) ? s : { facts: [...s.facts, id] }),
    choose: (id, value) => set(s => ({ choices: { ...s.choices, [id]: value } })),
    claim: () => {
        const s = get(), q = STORY[s.mission];
        if (!q || !objectiveComplete(s))
            return false;
        const trophy = q.id === 'svatyne' ? 'koren' : q.id === 'vodarna' ? 'perla' : q.id === 'archiv' ? 'zrcadlo' : null;
        set({ mission: s.mission + 1, gold: s.gold + q.reward, shards: s.shards + (trophy ? 3 : 1), bond: s.bond + 1 + (q.id === 'pristresek' && s.choices.pristresek === 'utulek' ? 3 : 0), owned: trophy && !s.owned.includes(trophy) ? [...s.owned, trophy] : s.owned, missionTimes: [...s.missionTimes, s.activeSeconds] });
        return true;
    },
    travel: id => {
        if (!unlocked(id, get().mission))
            return false;
        set({ region: id, notice: REGIONS.find(r => r.id === id)!.description });
        return true;
    },
    buy: id => {
        const s = get(), item = EQUIPMENT.find(x => x.id === id);
        const cost = Math.ceil((item?.cost ?? 0) * (s.facts.includes('v43:reward:event:trh') ? .9 : 1));
        if (!item || !cost || (['dvojkrok', 'echo', 'odraz', 'rozstep', 'stopa'].includes(id) && !s.facts.includes('v43:reward:event:trh')) || s.owned.includes(id) || s.gold < cost || s.region !== 'udoli')
            return false;
        set({ gold: s.gold - cost, owned: [...s.owned, id] });
        return true;
    },
    equip: id => {
        const s = get(), item = EQUIPMENT.find(x => x.id === id);
        if (!item || !s.owned.includes(id))
            return false;
        set({ equipped: { ...s.equipped, [item.slot]: id } });
        return true;
    },
    upgrade: id => {
        const s = get(), level = s.upgrades[id] ?? 0, cost = Math.ceil((20 + level * 15) * (s.choices.pristresek === 'dilna' ? .85 : 1));
        if (s.region !== 'udoli' || !s.owned.includes(id) || level >= 5 || s.gold < cost || s.shards < 1)
            return false;
        set({ gold: s.gold - cost, shards: s.shards - 1, upgrades: { ...s.upgrades, [id]: level + 1 } });
        return true;
    },
    setPath: id => {
        if (get().region === 'udoli')
            set({ path: id });
    },
    finishSide: id => {
        const s = get(), q = SIDEQUESTS.find(x => x.id === id);
        if (!q || s.side.includes(id) || !s.facts.includes('side:' + id + ':done'))
            return false;
        set({ side: [...s.side, id], gold: s.gold + q.reward, shards: s.shards + 1, bond: s.bond + 1 });
        return true;
    },
    recordKill: id => set(s => ({ bestiary: { ...s.bestiary, [id]: (s.bestiary[id] ?? 0) + 1 }, gold: s.gold + 3 })),
    save: (location, seconds, region) => set(s => ({ saves: { ...s.saves, [region ?? s.region]: location }, activeSeconds: s.activeSeconds + Math.max(0, Math.min(seconds, 10)) })),
    rewardDiscovery: (id) => {
        const s = get();
        if (!/^(secret:(dutina|ozvena|hladina)|event:(trh|pramen|posel)|camp:(udoli|les|mokrad|ruiny)|challenge:(preruseni|odraz|arena|kombo)|cache:(koreny|vodarna|archiv))$/.test(id) || !canReward(s.facts, id))
            return false;
        const reward = id.startsWith('secret:') ? ({ dutina: 55, ozvena: 65, hladina: 75 }[id.slice(7)] ?? 0) : id.startsWith('event:') ? 35 : id.startsWith('cache:') ? 50 : 0;
        set({ facts: [...s.facts, 'v43:reward:' + id], gold: s.gold + reward, shards: s.shards + (id.startsWith('cache:') ? 2 : id.startsWith('secret:') ? 1 : 0), bond: s.bond + (id.startsWith('camp:') ? 2 : 1) });
        return true;
    },
    setSpecialization: id => {
        const s = get();
        if (s.region !== 'udoli' || !SPECIALIZATIONS[s.path].some(x => x.id === id))
            return false;
        s.choose('spec:' + s.path, id);
        return true;
    },
    saveLoadout: slot => { const s = get(); if (s.region !== 'udoli' || !['1', '2'].includes(slot))
        return false; set({ loadouts: { ...s.loadouts, [slot]: { path: s.path, equipped: { ...s.equipped }, specialization: s.choices['spec:' + s.path] ?? '' } } }); return true; },
    applyLoadout: slot => { const s = get(), l = s.loadouts[slot]; if (s.region !== 'udoli' || !l || !['1', '2'].includes(slot))
        return false; const equipped = Object.fromEntries(Object.entries(l.equipped).filter(([key, id]) => s.owned.includes(id) && EQUIPMENT.some(i => i.id === id && i.slot === key))); if (!Object.keys(equipped).length)
        return false; const spec = SPECIALIZATIONS[l.path].some(x => x.id === l.specialization) ? l.specialization : ''; set({ path: l.path, equipped, choices: { ...s.choices, ['spec:' + l.path]: spec } }); return true; },
    developBuddy: (mascot, id) => { const s = get(), option = (Object.hasOwn(BUDDY_DEVELOPMENT, mascot) ? BUDDY_DEVELOPMENT[mascot] : [])?.find(x => x.id === id); if (s.region !== 'udoli' || (id !== '' && (!option || s.bond < option.bond)) || !Object.hasOwn(BUDDY_DEVELOPMENT, mascot))
        return false; s.choose('buddy:' + mascot, id); return true; },
    advanceEpisode: (id, index) => { const s = get(), e = EPISODES.find(x => x.id === id), stage = episodeStage(id, s.choices); if (!e || !s.facts.includes(e.requires) || s.facts.includes('v44:done:episode:' + id) || e.stages[stage]?.region !== s.region || !s.facts.includes('v44:proof:episode:' + id + ':' + stage) || !episodeAnswer(e, stage, index, s.choices))
        return false; const done = stage + 1 === e.stages.length; set({ choices: { ...s.choices, ['episode:' + id]: String(stage + 1), ['episode:' + id + ':answer' + stage]: String(index) }, facts: done ? [...s.facts, 'v44:done:episode:' + id] : s.facts, gold: s.gold + (done ? e.reward : 0), bond: s.bond + (done ? 3 : 0) }); return true; },
    rewardMoment: id => { const s = get(); const mini = MINIBOSSES.find(x => 'mini:' + x.id === id), neighbor = NEIGHBORS.find(x => 'neighbor:' + x.id === id); if ((!mini && !neighbor) || (mini && s.mission < mini.unlock) || (neighbor && s.region !== 'udoli') || !s.facts.includes('v44:proof:' + id) || s.facts.includes('v44:done:' + id) || (neighbor && !s.facts.includes(neighbor.requires)))
        return false; set({ facts: [...s.facts, 'v44:done:' + id], gold: s.gold + (mini?.reward ?? 0), shards: s.shards + (mini ? 2 : 0), bond: s.bond + (mini ? 1 : 2) }); return true; },
    restartDungeon: () => set(s => ({ saves: { ...s.saves, [s.region]: undefined }, runs: { ...s.runs, [s.region]: (s.runs[s.region] ?? 0) + 1 } })),
}), { name: 'buddyworld:frontier:v42', storage: createJSONStorage(() => localStorage), merge: (saved, current) => {
        const s = (saved && typeof saved === 'object' ? saved : {}) as Partial<FrontierState>;
        const mission = Math.floor(finite(s.mission, 0, STORY.length)), rid = REGIONS.find(r => r.id === s.region && mission >= r.unlock)?.id ?? 'udoli';
        const owned = cleanStrings(s.owned, id => EQUIPMENT.some(e => e.id === id)), equipped: Record<string, string> = {};
        if (s.equipped && typeof s.equipped === 'object')
            for (const [slot, id] of Object.entries(s.equipped))
                if (owned.includes(id) && EQUIPMENT.some(i => i.id === id && i.slot === slot))
                    equipped[slot] = id;
        const numbers = (v: unknown, max: number) => Object.fromEntries(Object.entries(v && typeof v === 'object' ? v : {}).filter(([k, x]) => !['__proto__', 'constructor', 'prototype'].includes(k) && typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= max)) as Record<string, number>;
        const saves: Partial<Record<RegionId, LocationSave>> = {};
        for (const r of REGIONS) {
            const v = s.saves?.[r.id];
            if (v && typeof v === 'object' && v.position && [v.position.x, v.position.z, v.hp].every(Number.isFinite) && Math.abs(v.position.x) <= 34 && Math.abs(v.position.z) <= 34) {
                const enemies: Record<string, EnemySave> = {};
                for (const [id, e] of Object.entries(v.enemies ?? {}))
                    if (e && [e.x, e.z, e.hp].every(Number.isFinite) && Math.abs(e.x) < 100 && Math.abs(e.z) < 100 && e.hp >= 0)
                        enemies[id] = { x: e.x, z: e.z, hp: e.hp, dead: e.dead === true };
                saves[r.id] = { position: v.position, hp: Math.max(0, Math.min(1000, v.hp)), enemies, values: numbers(v.values, 1e8), elapsed: finite(v.elapsed, 0) };
            }
        }
        const loadouts: Partial<Record<'1' | '2', Loadout>> = {};
        for (const slot of ['1', '2'] as const) {
            const l = s.loadouts?.[slot];
            if (l && ['ochrance', 'stopar', 'runotvurce'].includes(l.path)) {
                const eq = Object.fromEntries(Object.entries(l.equipped && typeof l.equipped === 'object' ? l.equipped : {}).filter(([k, id]) => typeof id === 'string' && owned.includes(id) && EQUIPMENT.some(i => i.id === id && i.slot === k)));
                loadouts[slot] = { path: l.path, equipped: eq, specialization: SPECIALIZATIONS[l.path].some(x => x.id === l.specialization) ? l.specialization : '' };
            }
        }
        return { ...current, loadouts, region: rid, path: ['ochrance', 'stopar', 'runotvurce'].includes(s.path ?? '') ? s.path! : 'ochrance', mission, facts: cleanStrings(s.facts), choices: s.choices && typeof s.choices === 'object' ? Object.fromEntries(Object.entries(s.choices).filter(([k, v]) => k.length < 100 && typeof v === 'string' && v.length < 100)) : {}, gold: finite(s.gold, 60), shards: finite(s.shards, 0), owned: owned.length ? owned : current.owned, equipped: Object.keys(equipped).length ? equipped : current.equipped, upgrades: numbers(s.upgrades, 5), bestiary: numbers(s.bestiary, 1e6), runs: numbers(s.runs, 1e6), side: cleanStrings(s.side, id => SIDEQUESTS.some(q => q.id === id)), saves, activeSeconds: finite(s.activeSeconds, 0), missionTimes: Array.isArray(s.missionTimes) ? s.missionTimes.filter(x => typeof x === 'number' && Number.isFinite(x) && x >= 0).slice(0, 24) : [], bond: finite(s.bond, 0), notice: '' };
    } }));
