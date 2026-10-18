import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CAMPAIGN, currentMission, platnaKampan, careAt, memoryDeck, useAdventureStore, type CampaignProgress } from '../../src/buddyworld/adventure'
import { useBuddyWorldStore } from '../../src/buddyworld/useBuddyWorldStore'
import { useVillageStore } from '../../src/buddyworld/useVillageStore'
import { vytvorZalohu,obnovZalohu,overZalohu } from '../../src/buddyworld/saveBackup'
import { nastavPauzu,herniCas } from '../../src/buddyworld/gameClock'
import { validCheckpoint,WORLD_RADIUS } from '../../src/buddyworld/checkpoint'
import { FRAGMENTY_RUIN } from '../../src/buddyworld/fragmentyRuin'
import { HLIDAC_POZICE } from '../../src/buddyworld/hlidacRuin'
import { CHRAMOVE_RUNY } from '../../src/buddyworld/data/chramovePodzemi'
import { UKOLY } from '../../src/buddyworld/quests'
import { RECEPTY } from '../../src/buddyworld/crafting'
import { overStavby, presunStavbu } from '../../src/buddyworld/buildingPlacement'
const full:CampaignProgress={uroven:5,drevo:200,kamen:200,krystaly:200,porazeniNepratele:40,porazeniBossove:3,care:1,placed:1,crystal1:true,crystal2:true,crystal3:true,crystalBoss:true,forestBoss:true,forestDiscoveries:3,ruinsPuzzle:true,fragments:3,ruinsBoss:true,buildings:2,sideQuests:3,relics:3,seals:true,temple:true,dungeon:true,templeBoss:true,mainQuests:12,puzzleWins:1}
beforeEach(()=>{localStorage.clear();useAdventureStore.setState(useAdventureStore.getInitialState());useBuddyWorldStore.setState(useBuddyWorldStore.getInitialState());useVillageStore.setState(useVillageStore.getInitialState())})
describe('Season 1 campaign and progression',()=>{
 it('contains six complete chapters and unique mission ids',()=>{expect(CAMPAIGN).toHaveLength(24);expect(new Set(CAMPAIGN.map(m=>m.id)).size).toBe(24);expect(new Set(CAMPAIGN.map(m=>m.chapter)).size).toBe(6)})
 it('does not accept a quest out of sequence',()=>{expect(useAdventureStore.getState().claim('usvit',full,true)).toBe(false);expect(useAdventureStore.getState().campaign).toEqual([])})
 it('requires the actual first objective',()=>{expect(useAdventureStore.getState().claim('pouto',{...full,care:0},true)).toBe(false)})
 it('awards coins only once per completed mission',()=>{const a=useAdventureStore.getState();expect(a.claim('pouto',full,true)).toBe(true);expect(a.claim('pouto',full,true)).toBe(false);expect(useAdventureStore.getState().coins).toBe(28)})
 it('requires returning home for the final scene',()=>{useAdventureStore.setState({campaign:CAMPAIGN.slice(0,-1).map(m=>m.id)});expect(useAdventureStore.getState().claim('usvit',full,false)).toBe(false);expect(useAdventureStore.getState().claim('usvit',full,true)).toBe(true)})
 it('sanitizes a damaged campaign to its completed prefix',()=>{expect(platnaKampan(['pouto','lucerna','unknown'])).toEqual(['pouto']);expect(platnaKampan('pouto')).toEqual([])})
 it('can claim all chapters and reaches level 20 without repeated reward farming',()=>{for(const m of CAMPAIGN){expect(currentMission(useAdventureStore.getState().campaign)?.id).toBe(m.id);expect(useAdventureStore.getState().claim(m.id,full,true)).toBe(true);useBuddyWorldStore.getState().pridejXp(m.xp,'campaign:'+m.id)}expect(currentMission(useAdventureStore.getState().campaign)).toBeNull();expect(useBuddyWorldStore.getState().level).toBe(20)})
 it('keeps XP grants and their idempotency ledger in the same write',()=>{useBuddyWorldStore.getState().pridejXp(100,'q1');const first={...useBuddyWorldStore.getState()};useBuddyWorldStore.getState().pridejXp(100,'q1');expect(useBuddyWorldStore.getState().level).toBe(first.level);expect(useBuddyWorldStore.getState().xp).toBe(first.xp);expect(first.odmenyXp).toEqual(['q1'])})
 it('rejects nonfinite XP rather than corrupting a save',()=>{for(const n of [NaN,Infinity,-5])useBuddyWorldStore.getState().pridejXp(n);expect(useBuddyWorldStore.getState().level).toBe(1);expect(useBuddyWorldStore.getState().xp).toBe(0)})
 it('allows every one of the four companions from the beginning',()=>{expect(useBuddyWorldStore.getState().odemceneMaskoty).toHaveLength(4);useBuddyWorldStore.getState().vybratMaskota('frost');expect(useBuddyWorldStore.getState().aktivniMaskotId).toBe('frost')})
 it('makes the first crafting objective available before the first town upgrade',()=>{expect(RECEPTY.find(r=>r.id==='lucerna')?.minUroven).toBe(1)})
 it('persists placement rotation instead of rotating only the preview',()=>{useVillageStore.setState({inventar:{prkna:1,kamenny_blok:0,lucerna:0,amulet:0}});expect(useVillageStore.getState().postav('prkna',8,8,Math.PI/2)).toBe(true);expect(useVillageStore.getState().umisteneStavby[0].rotace).toBeCloseTo(Math.PI/2)})
 it('keeps rotations after validation and moving a placed object',()=>{const b=overStavby([{id:'house',typ:'prkna',x:8,z:8,rotace:Math.PI/2}]);expect(b[0].rotace).toBeCloseTo(Math.PI/2);expect(presunStavbu(b,'house',10,10,Math.PI)[0].rotace).toBeCloseTo(Math.PI)})
 it('allows all twelve legacy story quests using the three distinct bosses',()=>{useVillageStore.setState({...full,splneneUkoly:[]});for(const q of UKOLY)expect(useVillageStore.getState().prevzitOdmenu(q.id)).toBe(true);expect(useVillageStore.getState().splneneUkoly).toHaveLength(12)})
})
describe('Buddy care, memory game and rewards',()=>{
 it('never punishes an absent player below the friendly care floor',()=>{expect(careAt(75,1000,1000+7*24*3600_000)).toBe(20)})
 it('ignores a backwards system clock',()=>expect(careAt(75,2000,1000)).toBe(75))
 it('consumes food once and rejects rapid repeated care',()=>{expect(useAdventureStore.getState().careForBuddy(true,10000)).toBe(true);expect(useAdventureStore.getState().food).toBe(2);expect(useAdventureStore.getState().careForBuddy(true,10001)).toBe(false);expect(useAdventureStore.getState().food).toBe(2)})
 it('petting remains free with no food or coins',()=>{useAdventureStore.setState({food:0,coins:0});expect(useAdventureStore.getState().careForBuddy(false,10000)).toBe(true)})
 it('does not allow buying food with insufficient coins',()=>{useAdventureStore.setState({coins:4});expect(useAdventureStore.getState().buyFood()).toBe(false);expect(useAdventureStore.getState().coins).toBe(4)})
 it('creates six shuffled matching pairs',()=>{const d=memoryDeck(()=>.35);expect(d).toHaveLength(12);for(let i=0;i<6;i++)expect(d.filter(v=>v===i)).toHaveLength(2)})
 it('rate limits real minigame payouts',()=>{expect(useAdventureStore.getState().puzzleReward(100000)).toBe(true);expect(useAdventureStore.getState().puzzleReward(100001)).toBe(false);expect(useAdventureStore.getState().coins).toBe(32);expect(useAdventureStore.getState().puzzleWins).toBe(1)})
})
describe('Full backup and restore',()=>{
 it('includes player, town, campaign and checkpoint but excludes unrelated app data',()=>{localStorage.setItem('unrelated','keep');localStorage.setItem('buddyworld:checkpoint:v1','position');const data=vytvorZalohu(localStorage).data;expect(data).toHaveProperty('schoolbuddy-buddyworld-storage');expect(data).toHaveProperty('schoolbuddy-buddyworld-village-v1');expect(data).toHaveProperty('buddyworld:adventure:v1');expect(data).not.toHaveProperty('unrelated')})
 it('restores a precise snapshot and removes later game-only flags',()=>{const backup=vytvorZalohu(localStorage);localStorage.setItem('buddyworld:later','remove');localStorage.setItem('unrelated','keep');expect(obnovZalohu(backup,localStorage)).toBe(true);expect(localStorage.getItem('buddyworld:later')).toBeNull();expect(localStorage.getItem('unrelated')).toBe('keep')})
 it('rejects another application’s storage keys',()=>{expect(overZalohu({format:'buddyworld-backup',verze:1,data:{token:'secret'}})).toBe(false)})
 // Spying on the localStorage INSTANCE doesn't work: Storage's own [[Set]]/[[DefineOwnProperty]] (per
 // the HTML spec, matching real browsers too) treats any property assignment on it as "write a storage
 // item with that key name", never as redefining an inherited method — so the spy must target the
 // shared Storage.prototype.setItem instead, which every jsdom localStorage instance actually inherits.
 it('rolls a partially written import back on failure',()=>{localStorage.setItem('buddyworld:a','old');const base=Storage.prototype.setItem.bind(localStorage);let writes=0;const spy=vi.spyOn(Storage.prototype,'setItem').mockImplementation((k,v)=>{if(++writes===2)throw Error('Quota');base(k,v)});expect(obnovZalohu({format:'buddyworld-backup',verze:1,data:{'buddyworld:a':'new','buddyworld:b':'fail'}},localStorage)).toBe(false);spy.mockRestore();expect(localStorage.getItem('buddyworld:a')).toBe('old');expect(localStorage.getItem('buddyworld:b')).toBeNull()})
})
describe('Pausable clocks and reachable world',()=>{
 it('freezes deadlines while multiple independent pause reasons are active',()=>{nastavPauzu('test-menu',true);const a=herniCas();nastavPauzu('test-hidden',true);nastavPauzu('test-menu',false);expect(herniCas()).toBe(a);nastavPauzu('test-hidden',false);expect(herniCas()).toBeGreaterThanOrEqual(a)})
 it('validates saved positions and living player health',()=>{expect(validCheckpoint({pozice:{x:0,z:12},hp:60})).toBe(true);expect(validCheckpoint({pozice:{x:100,z:12},hp:60})).toBe(false);expect(validCheckpoint({pozice:{x:0,z:12},hp:0})).toBe(false)})
 it('lets the player reach every ruin fragment and both temple and ruin bosses',()=>{for(const p of [...FRAGMENTY_RUIN,HLIDAC_POZICE,...CHRAMOVE_RUNY.map(r=>r.pozice)])expect(Math.hypot(p.x,p.z)).toBeLessThan(WORLD_RADIUS)})
})
