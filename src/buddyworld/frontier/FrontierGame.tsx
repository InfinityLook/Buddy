import { assetUrl } from '../assetUrl';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useFrontierScene, type Prompt, type Action } from './useFrontierScene';
import { useVillageStore } from '../useVillageStore';
import { useFrontierStore, objectiveComplete, equipmentStats, unlocked } from './store';
import { REGIONS, STORY, SPECIES, PATHS, EQUIPMENT, SIDEQUESTS, region, type PathId } from './content';
import { useBuddyWorldStore } from '../useBuddyWorldStore';
import { maskotPodleId } from '../data/maskoti';
import { BuddyPanel } from '../components/BuddyPanel';
import { GameSettings } from '../components/GameSettings';
import { VirtualniJoystick } from '@/game/components/VirtualniJoystick';
import { SpecializationPicker, ExpansionJournal, WorldEvents, BuddyExtras } from './ExpansionPanels';
import { BuddyDevelopmentPicker, SavedLoadouts, ContinuationJournal, ResidentMemories, CombatPreferences } from './ContinuationPanels';
import { ActionIcon } from './ActionIcon';
import { PanelIcon } from './PanelIcon';
import './frontier.css';
type Panel = 'story' | 'world' | 'gear' | 'journal' | 'buddy' | 'home' | 'settings';
const NAMES: Record<Panel, string> = { story: 'Příběh', world: 'Mapa', gear: 'Výbava', journal: 'Deník', buddy: 'Buddy', home: 'Domov', settings: 'Nastavení' };
function trap(e: KeyboardEvent) {
    if (e.key !== 'Tab')
        return;
    const es = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),input,select,summary,[tabindex="0"]')).filter(e => e.getClientRects().length);
    const first = es[0], last = es.at(-1);
    if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
    }
    else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
    }
}
export function FrontierGame({ onVillage, onExit }: {
    onVillage: (legacy?: boolean) => void;
    onExit: () => void;
}) {
    const s = useFrontierStore(), player = useBuddyWorldStore(), q = STORY[s.mission], mascot = maskotPodleId(player.aktivniMaskotId);
    const [panel, setPanel] = useState<Panel | null>(s.saves[s.region]?.hp === 0 ? null : 'story'), [prompt, setPrompt] = useState<Prompt | null>(null), [message, setMessage] = useState(''), [replay, setReplay] = useState(false), [fishPhase, setFishPhase] = useState(0);
    const panelRef = useRef<HTMLElement>(null), lastFocus = useRef<HTMLElement | null>(null);
    const api = useFrontierScene(s.region, mascot.id, panel !== null || prompt !== null || replay, setPrompt), hud = api.hud, path = PATHS[s.path], ready = objectiveComplete(s);
    useEffect(() => {
        for (let i = 0; i < s.mission; i++) {
            player.pridejXp(STORY[i].xp, 'frontier:story:' + STORY[i].id);
            useVillageStore.getState().odmenVypravuV42(STORY[i].id);
        }
    }, [s.mission, player.pridejXp]);
    useEffect(() => {
        if (!panel && !prompt && !replay) {
            lastFocus.current?.focus();
            return;
        }
        lastFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const timer = setTimeout(() => panelRef.current?.querySelector<HTMLButtonElement>('button')?.focus(), 40);
        return () => clearTimeout(timer);
    }, [panel, prompt, replay]);
    useEffect(() => {
        const key = (e: globalThis.KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (prompt)
                    return;
                setPanel(p => p ? null : 'settings');
                setReplay(false);
            }
        };
        window.addEventListener('keydown', key);
        return () => window.removeEventListener('keydown', key);
    }, [prompt]);
    useEffect(() => {
        if (prompt?.kind !== 'fish')
            return;
        const start = performance.now();
        setFishPhase(0);
        const t = setInterval(() => setFishPhase(((performance.now() - start) % 2000) / 2000), 40);
        return () => clearInterval(t);
    }, [prompt]);
    function home() {
        if (s.region === 'udoli') {
            api.rest();
            return;
        }
        const old = s.saves.udoli;
        useFrontierStore.setState({ saves: { ...s.saves, udoli: { position: { x: 0, z: 12 }, hp: 1000, enemies: old?.enemies ?? {}, values: { ...old?.values, potions: 3 }, elapsed: old?.elapsed ?? 0 } } });
        s.travel('udoli');
    }
    function open(id: Panel) { setMessage(''); setPanel(p => p === id ? null : id); }
    const actionButton = (action: Action, label: string, cd = 0, extra = '') => <button className={`fw-action fw-action-${action} ${extra}`} disabled={cd > 0 || hud.dead} aria-label={label} onPointerDown={e => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); api.act(action); }} onPointerUp={() => api.act(action, false)} onPointerCancel={() => api.act(action, false)} onLostPointerCapture={() => api.act(action, false)} onKeyDown={e => {
            if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) {
                e.preventDefault();
                api.act(action);
            }
        }} onKeyUp={() => api.act(action, false)}><ActionIcon action={action} path={s.path} buddy={mascot.jmeno}/><span className="fw-action-label">{label}</span>{cd > 0 && <small className="fw-action-cooldown">{Math.ceil(cd)} s</small>}</button>;
    return <main className="fw-game" aria-label="Buddy World — Otevřené cesty">
 <div ref={api.containerRef} className="fw-canvas" aria-label="3D herní svět"/>
 <header className="fw-header"><div><strong>BUDDY WORLD</strong><span>{region(s.region).name} · úroveň {player.level}</span></div><nav aria-label="Panely výpravy">{(Object.keys(NAMES) as Panel[]).map(id => <button key={id} aria-label={NAMES[id]} aria-pressed={panel === id} onClick={() => open(id)}><PanelIcon name={id}/><span>{NAMES[id]}</span></button>)}</nav></header>
 <section className="fw-player"><div><strong>{path.name}</strong><span>{Math.ceil(hud.hp)} / {hud.maxHp} ♥</span></div><progress aria-label="Zdraví hráče" max={hud.maxHp} value={hud.hp}/><small>{s.gold} stříbra · {s.shards} střepů</small></section>
 <button className="fw-objective" onClick={() => open('story')}><small>{s.mission >= 24 ? 'PŘÍBĚH DOKONČEN' : `VÝPRAVA ${s.mission + 1} / ${STORY.length}`}</small><strong>{q?.name ?? 'Svět zůstává otevřený'}</strong><span>{ready ? '✓ Hotovo · převezmi odměnu' : q?.region !== s.region && q ? `Cíl: ${region(q.region).name} · otevři Mapu` : hud.objective || q?.goal || 'Objevuj, stavěj a vrať se do dungeonů.'}</span></button>
 {hud.target && <section className={`fw-target ${hud.target.warning ? 'warning' : ''}`}><button aria-label="Další cíl" onClick={() => api.act('target')}><strong>{hud.target.name}</strong><span>{hud.target.warning ? '⚠ Připravuje útok' : 'Tab · změnit cíl'}</span></button><progress aria-label="Zdraví cíle" value={hud.target.hp} max={hud.target.maxHp}/><small>{hud.target.hint}</small></section>}
 <svg className="fw-minimap" viewBox="0 0 80 80" role="img" aria-label="Minimapa, sever nahoře"><rect x="1" y="1" width="78" height="78" rx="12"/><path d={region(s.region).dungeon ? 'M24 10V60H56V10ZM24 36H56M24 24H56' : 'M40 8V73M12 46H69'}/>{s.region === 'udoli' && <g><rect className="fw-map-building" x="30" y="43" width="5" height="5" rx="1"/><rect className="fw-map-building" x="45" y="43" width="6" height="5" rx="1"/><rect className="fw-map-building" x="31" y="50" width="3" height="3" rx="1"/></g>}{hud.nodes.map((n, i) => <circle key={i} cx={40 + n.x} cy={40 + n.z} r="2" fill="#e5b66a"/>)}<circle cx={40 + hud.position.x} cy={40 + hud.position.z} r="3" fill="#eff9e4"/><text x="40" y="10" textAnchor="middle">S</text></svg>
 <div className="fw-joystick"><VirtualniJoystick onZmena={api.move}/></div>
 <div className="fw-actions"><div className="fw-skills">{actionButton('skill1', path.skill1, hud.cooldowns[0])}{actionButton('skill2', path.skill2, hud.cooldowns[1])}{actionButton('buddy', mascot.jmeno, hud.cooldowns[2])}</div><div className="fw-combat">{actionButton('potion', `Lektvar ${hud.potions}`)}{actionButton('dodge', 'Úhyb', hud.cooldowns[3])}{actionButton('attack', 'Útok', 0, 'fw-attack')}</div>{actionButton('interact', hud.near || 'Interakce · E', 0, 'fw-interact')}{hud.hold > 0 && <progress aria-label="Průběh opravy" max="1.2" value={hud.hold}/>}</div>
 <div className="fw-help">WASD · pohyb / tažení · kamera / mezerník · útok / Shift · úhyb / Q · Buddy / 1, 2 · schopnosti / E · interakce / R · lektvar</div>
 {hud.feedback && <div className={'fw-hit-feedback ' + hud.feedback.kind} aria-live="off">{hud.feedback.text}</div>}
 {hud.training && <div className="fw-training"><strong>Trénink</strong><span>{Math.round(hud.training.damage)} poškození · {hud.training.hits} zásahů · {hud.training.combos} komb</span></div>}
 {hud.tracking && !hud.training && <div className="fw-training"><strong>Sledování</strong><span>{hud.tracking}</span></div>}
 {hud.notice && <p className="fw-notice" role="status">{hud.notice}</p>}
 {hud.failed && <div className="fw-overlay"><article><h2>3D svět se nespustil</h2><p>Prohlížeč nepovolil WebGL. Uložený postup zůstává zachovaný.</p><button onClick={onExit}>Zpět k výběru</button></article></div>}
 {hud.dead && <div className="fw-overlay"><article><h2>Buddy tě nenechá samotného.</h2><p>Postup příběhu a získané předměty zůstávají. Vrátíš se na vstup do této oblasti.</p><button className="fw-primary" onClick={() => api.rest()}>Zpět na bezpečný checkpoint</button><button onClick={() => { home(); }}>Vrátit se domů</button></article></div>}
 {panel && <div className="fw-shade" onPointerDown={e => {
                if (e.target === e.currentTarget)
                    setPanel(null);
            }}><aside ref={panelRef} className="fw-panel" role="dialog" aria-modal="true" aria-label={NAMES[panel]} onKeyDown={trap}><header><div><small>VÝPRAVA JE POZASTAVENÁ</small><h2>{NAMES[panel]}</h2></div><button aria-label="Zavřít panel" onClick={() => setPanel(null)}>×</button></header><div className="fw-panel-body">
 {panel === 'story' && <>{q ? <><div className="fw-eyebrow">OTEVŘENÉ CESTY · {s.mission + 1}/{STORY.length}</div><h2>{q.name}</h2><p className="fw-story">{q.story}</p><div className="fw-card"><strong>{q.goal}</strong><p>{region(q.region).name}</p><small>Odměna: {q.xp} XP · {q.reward} stříbra · střep pro vylepšení · 4 dřeva, 3 kameny a 1 krystal pro osadu.</small></div>{ready ? <button className="fw-primary" onClick={() => {
                            if (s.claim()) {
                                setMessage('Odměna převzata. Příběh pokračuje.');
                                setPanel(null);
                            }
                        }}>Převzít odměnu a pokračovat</button> : <button className="fw-primary" onClick={() => {
                            if (q.region !== s.region)
                                s.travel(q.region);
                            setPanel(null);
                        }}>{q.region === s.region ? 'Vrátit se do výpravy' : 'Vydat se do cílové oblasti'}</button>}</> : <><div className="fw-eyebrow">EPILOG</div><h2>Svět, který zůstal otevřený</h2><p>Elara, obchodník i lesní posel mají místo u jednoho stolu. Buddy stojí po tvém boku. Údolí zůstává domovem pro další výpravy.</p><p>Dokončil jsi všech 24 kroků příběhu Otevřené cesty. Můžeš dokončit vedlejší příběhy, stavět osadu a znovu navštívit dungeony.</p><button onClick={() => { home(); setPanel(null); }}>Vrátit se domů</button></>}
 <details><summary>Dokončené příběhy · {s.mission}</summary>{STORY.slice(0, s.mission).map(x => <p key={x.id}>✓ {x.name}</p>)}</details><p className="fw-muted">Změny ve světě se ukládají automaticky. Příběh nevyžaduje plnění původních loveckých zakázek osady.</p></>}
 {panel === 'world' && <><WorldEvents /><p>Čtyři venkovní regiony a tři samostatné dungeony. Načítá se právě navštívená oblast.</p><div className="fw-world-list">{REGIONS.map(r => <button key={r.id} disabled={!unlocked(r.id, s.mission)} className={s.region === r.id ? 'active' : ''} onClick={() => { s.travel(r.id); setPanel(null); }}><small>{r.dungeon ? 'DUNGEON' : 'KRAJINA'} · {unlocked(r.id, s.mission) ? 'otevřeno' : `po kroku ${r.unlock}`}</small><strong>{r.name}</strong><span>{r.description}</span></button>)}</div>{region(s.region).dungeon && <><p>Nový průchod obnoví nepřátele a hádanky tohoto dungeonu. Příběhové odměny zůstanou jednorázové; strážce při dalším vítězství dává střepy.</p><button onClick={() => setReplay(true)}>Zahájit nový průchod dungeonem</button></>}<button onClick={() => { home(); setPanel(null); }}>Vrátit se do vesnice</button><button disabled={s.region !== 'udoli'} onClick={() => onVillage()}>Osada, výroba a stavění</button></>}
 {panel === 'gear' && <><h3>Cesta strážce</h3><p>Mimo výpravu ve vesnici můžeš změnit bojový styl. Výběr Buddyho zůstává samostatný.</p><div className="fw-paths">{(Object.entries(PATHS) as [
                    PathId,
                    typeof PATHS.ochrance
                ][]).map(([id, p]) => <button key={id} disabled={s.region !== 'udoli'} aria-pressed={s.path === id} onClick={() => s.setPath(id)}><strong>{p.name}</strong><span>{p.description}</span></button>)}</div><SpecializationPicker /><SavedLoadouts onMessage={setMessage}/><p>Bonus výbavy: +{equipmentStats(s).attack} útok · +{equipmentStats(s).armor} obrana.</p><h3>Výbava a obchod</h3><p>Nákup a vylepšení jsou dostupné ve vesnici. Vylepšení je jisté a předmět se nerozbíjí.</p>{EQUIPMENT.map(item => { const special = ['dvojkrok', 'echo', 'odraz', 'rozstep', 'stopa'].includes(item.id), available = !special || s.facts.includes('v43:reward:event:trh'), price = Math.ceil(item.cost * (s.facts.includes('v43:reward:event:trh') ? .9 : 1)); const owned = s.owned.includes(item.id), equipped = s.equipped[item.slot] === item.id, level = s.upgrades[item.id] ?? 0, cost = Math.ceil((20 + level * 15) * (s.choices.pristresek === 'dilna' ? .85 : 1)); return <article className="fw-card" key={item.id}><strong>{item.name} {level ? `+${level}` : ''} {equipped ? '· vybaveno' : ''}</strong><p>{item.perk}</p><small>Útok +{item.attack} · obrana +{item.armor}</small><div className="fw-row">{owned ? <><button disabled={equipped} onClick={() => s.equip(item.id)}>Vybavit</button><button disabled={s.region !== 'udoli' || level >= 5 || s.gold < cost || s.shards < 1} onClick={() => s.upgrade(item.id)}>{level >= 5 ? 'Maximální vylepšení' : `Vylepšit · ${cost} stříbra + 1 střep`}</button></> : item.cost ? <button disabled={s.region !== 'udoli' || s.gold < price || !available} onClick={() => s.buy(item.id)}>{available ? `Koupit · ${price} stříbra` : 'Odemkne znovu otevřený trh'}</button> : <small>Získáš za dokončení příslušného příběhu v dungeonu.</small>}</div></article>; })}</>}
 {panel === 'journal' && <><ContinuationJournal onTrack={() => setPanel(null)}/><ExpansionJournal /><h3>Vedlejší příběhy · {s.side.length}/{SIDEQUESTS.length}</h3>{SIDEQUESTS.map(side => <article className="fw-card" key={side.id}><strong>{s.side.includes(side.id) ? '✓ ' : ''}{side.name}</strong><p>{side.description}</p><small>{region(side.region).name} · {side.reward} stříbra.</small></article>)}<h3>Bestiář · {SPECIES.filter(m => s.bestiary[m.id]).length}/{SPECIES.length}</h3>{SPECIES.map(m => <article className="fw-card" key={m.id}><strong>{s.bestiary[m.id] ? m.name : 'Neprobádaná bytost'} {s.bestiary[m.id] ? `· ${s.bestiary[m.id]} vítězství` : ''}</strong><p>{s.bestiary[m.id] ? m.hint : `Stopy vedou do oblasti ${region(m.region).name}.`}</p></article>)}<h3>Vzpomínky na výpravy</h3><p>Pouto s Buddym: {s.bond} · dokončeno {s.mission} příběhů.</p><p>Zaznamenaný aktivní čas nové kampaně: {Math.floor(s.activeSeconds / 60)} minut. Čas otevřených panelů se nepočítá.</p><p>{s.choices.pristresek ? `První dům: ${s.choices.pristresek === 'dilna' ? 'dílna — levnější vylepšování' : 'útulek — větší pouto s Buddym'}.` : ''}</p><p>{s.choices.dohoda ? `Dohoda: ${s.choices.dohoda === 'ochrana' ? 'strážci cest — +2 obrana' : 'obchodníci — zásoby stříbra'}.` : ''}</p></>}
 {panel === 'home' && <><ResidentMemories /><h3>Tvůj kout ve vesnici</h3><p>Vystav si trofeje výprav a vyber podobu zahrady. Změny uvidíš vedle svého domu v Údolí prvního světla.</p><div className="fw-card"><strong>Zahrada</strong>{!s.facts.includes('garden') && <p>Zahradu zasadíš v příběhu Co přineseš domů. Vzhled si můžeš vybrat předem.</p>}<div className="fw-row">{[['kvetiny', 'Květinová zahrada'], ['krystaly', 'Krystalová zahrada'], ['zahonek', 'Bylinkové záhonky']].map(([id, name]) => <button key={id} aria-pressed={(s.choices.zahrada ?? 'zahonek') === id} onClick={() => s.choose('zahrada', id)}>{name}</button>)}</div></div><h3>Trofej u domu</h3>{[['koren', 'Semeno svatyně'], ['perla', 'Perla čisté vody'], ['zrcadlo', 'Pravdivý odraz']].map(([id, name]) => <div className="fw-card" key={id}><strong>{name}</strong><button disabled={!s.owned.includes(id)} aria-pressed={s.choices.trofej === id} onClick={() => s.choose('trofej', id)}>{s.owned.includes(id) ? 'Vystavit u domu' : 'Získáš dokončením dungeonu'}</button></div>)}<button disabled={s.region !== 'udoli'} onClick={() => onVillage()}>Osada a volné umisťování staveb</button><h3>Obyvatelé, kteří tě znají</h3>{[['Elara', Math.min(5, 1 + Math.floor(s.mission / 5)), 'Vidí, jak se domov mění s každou výpravou.'], ['Mira', Math.min(5, 1 + (s.choices.pristresek ? 1 : 0) + (s.facts.includes('most:done') ? 1 : 0) + (s.facts.includes('garden') ? 1 : 0) + (s.side.includes('recept') ? 1 : 0)), 'Pamatuje si most, první dům a zahradu.'], ['Kael', Math.min(5, 1 + (s.mission > 7 ? 1 : 0) + (s.mission > 15 ? 1 : 0) + (s.mission > 20 ? 1 : 0) + (s.choices.dohoda === 'ochrana' ? 1 : 0)), 'Připravuje se na společnou cestu.']].map(([name, value, text]) => <article className="fw-card" key={name}><strong>{name} · důvěra {value}/5</strong><p>{text}</p></article>)}</>}
 {panel === 'buddy' && <><BuddyDevelopmentPicker mascot={mascot.id}/><BuddyPanel maskot={mascot}/><BuddyExtras mascot={mascot.id} photo={api.photo} onMessage={setMessage}/><h3>Družina</h3><p>Od úrovně 20 může Kael doprovázet tebe a Buddyho jako řízený spojenec. V boji útočí na blízké cíle. Není to jiný hráč.</p><button disabled={player.level < 20} aria-pressed={s.choices.druzina === 'spolu'} onClick={() => s.choose('druzina', s.choices.druzina === 'spolu' ? 'doma' : 'spolu')}>{player.level < 20 ? 'Kael se přidá od úrovně 20' : s.choices.druzina === 'spolu' ? 'Poslat Kaela odpočívat' : 'Pozvat Kaela do družiny'}</button><h3>Společná cesta</h3><p>{mascot.jmeno} reaguje při vítězství a pomáhá vlastní schopností. Pouto roste dokončováním příběhů a pomocí obyvatelům: {s.bond}.</p></>}
 {panel === 'settings' && <><h3>Vzhled a výkon</h3><label className="fw-graphics-setting">Kvalita grafiky<select value={s.choices.graphics46 ?? 'balanced'} onChange={e => s.choose('graphics46', e.target.value)}><option value="light">Úsporná · bez slunečních stínů</option><option value="balanced">Vyvážená · měkké stíny</option><option value="detail">Detailní · jemnější obraz a stíny</option></select></label><p className="fw-muted">Modely a textury zůstávají ve všech režimech. Pokud se hra zpomaluje, zvol Úspornou. Změna se projeví hned.</p><CombatPreferences /><GameSettings inVillage={s.region === 'udoli'} onRest={api.rest} onExit={onExit}/><h3>Rozšířené ovládání</h3><p>Tab vybírá cíl · 1 a 2 používají schopnosti Cesty strážce · R vypije lektvar. Pro opravy drž E nebo tlačítko Interakce. Mapa umožňuje návrat do otevřených oblastí.</p><button onClick={() => onVillage()}>Otevřít osadu a stavební režim</button><details><summary>Původní kronika v41</summary><p>Původní menší údolí zůstává dostupné se svým uloženým příběhem. Nová kampaň jeho zakázky nevyžaduje.</p><button onClick={() => onVillage(true)}>Otevřít původní kroniku</button></details><details><summary>Licence a původ grafiky</summary><p>Nové modely prostředí a procedurální postavy vznikly pro tento projekt. Přehled původu a úplné licence jsou v přiložené dokumentaci a na této stránce.</p><a href={assetUrl('/licence.html')} download="BuddyWorld-licence.html">Otevřít licenční oznámení</a></details></>}
 {message && <p role="status">{message}</p>}</div></aside></div>}
 {prompt && <div className="fw-overlay"><article ref={panelRef} role="dialog" aria-modal="true" aria-label={prompt.title} onKeyDown={trap}><small>OTEVŘENÉ CESTY</small><h2>{prompt.title}</h2><p>{prompt.text}</p>{prompt.kind === 'fish' && <div className="fw-fishing" aria-label="Rybářský ukazatel"><span /><b style={{ left: fishPhase * 100 + '%' }}/></div>}<div className="fw-row">{prompt.options.map((option, i) => <button key={option} onClick={() => api.choose(i)}>{option}</button>)}</div></article></div>}
 {replay && <div className="fw-overlay"><article role="dialog" aria-modal="true" aria-label="Nový průchod dungeonem"><h2>Obnovit tento dungeon?</h2><p>Právě rozehraný průchod se nahradí novým. Předměty, příběh a bestiář zůstávají.</p><button onClick={() => { setReplay(false); s.restartDungeon(); setPanel(null); }}>Spustit nový průchod</button><button onClick={() => setReplay(false)}>Pokračovat v rozehraném</button></article></div>}
 </main>;
}
