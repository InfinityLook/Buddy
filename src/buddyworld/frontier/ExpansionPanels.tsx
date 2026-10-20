import { useFrontierStore } from './store';
import { SPECIALIZATIONS, SECRETS, EVENTS, CHALLENGES, CAMPS, PERSONALITIES } from './expansion';
import { region } from './content';
export function SpecializationPicker() {
    const s = useFrontierStore();
    return <><h3>Dvě specializace každé cesty</h3><p>Ve vesnici je můžeš bezplatně měnit. Používají stejná tlačítka schopností.</p><div className="fw-paths">{SPECIALIZATIONS[s.path].map(x => <button key={x.id} disabled={s.region !== 'udoli'} aria-pressed={s.choices['spec:' + s.path] === x.id} onClick={() => s.setSpecialization(x.id)}><strong>{x.name}</strong><span>{x.text}</span></button>)}</div></>;
}
export function ExpansionJournal() {
    const s = useFrontierStore();
    return <><h3>Skrytá místa · {SECRETS.filter(x => s.facts.includes('v43:reward:secret:' + x.id)).length}/{SECRETS.length}</h3><p>Buddy upozorní na úkryt v blízkosti. Značky tajemství se objeví teprve pět kroků od vás.</p>{SECRETS.map(x => <article className="fw-card" key={x.id}><strong>{s.facts.includes('v43:reward:secret:' + x.id) ? '✓ ' + x.name : 'Stopa v krajině'}</strong><p>{x.hint}</p><small>{region(x.region).name}</small></article>)}
 <h3>Dovednostní výzvy · {CHALLENGES.filter(x => s.facts.includes('v43:reward:challenge:' + x.id)).length}/{CHALLENGES.length}</h3><p>Výzvy jsou nepovinné. Jejich odměnou je barevný znak na Buddyho obojku.</p>{CHALLENGES.map(x => { const done = s.facts.includes('v43:reward:challenge:' + x.id); return <article className="fw-card" key={x.id}><strong>{done ? '✓ ' : ''}{x.name}</strong><p>{x.goal}</p><small>{x.reward}</small><div className="fw-row"><button disabled={!done} aria-pressed={s.choices.znak === x.id} onClick={() => s.choose('znak', x.id)}>{done ? 'Nosit znak' : 'Zatím neodemčeno'}</button></div></article>; })}
 <h3>Vzpomínky u ohně</h3>{CAMPS.map(c => <p key={c.region}>{s.facts.includes('v43:reward:camp:' + c.region) ? '✓' : '○'} {c.name} · {region(c.region).name}</p>)}
 <h3>Co umí vaše společné útoky</h3><p>Frost: zmrazit → schopnost 1 = tříštivý zásah ×1,8. Moss: kořeny → Stopařova schopnost 1 = průraz ×1,6. Nyx: označit → další zásah hráče ×1,4 nebo silnější Kaelův zásah. V archivu Nyx odkrývá skutečného strážce. Ember: zapálí olejovou skvrnu a zasáhne okolní příšery.</p>
 <h3>Arény a cesty</h3><p>U strážců uvolni závaží, otevři páru nebo rozlom popraskanou podlahu. Nejprve do dosahu nalákej nepřátele. Sloupy zastaví střely a poskytují kryt. Mechanismy se obnoví s novým průchodem.</p><p>U vchodu do každého dungeonu si můžeš vybrat runovou cestu, nebezpečnou zkratku, záchranu průzkumníka nebo dvě bonusové vlny. Záchrana zpřístupní ukrytou komoru s 50 stříbra a dvěma střepy, zkouška přidá dva střepy za průchod.</p></>;
}
export function WorldEvents() { const s = useFrontierStore(); return <><h3>Svět odpovídá na tvé činy</h3>{EVENTS.map(e => <article className="fw-card" key={e.id}><strong>{s.facts.includes('v43:reward:event:' + e.id) ? '✓ ' : ''}{e.name}</strong><p>{e.effect}</p><small>{region(e.region).name} · {s.facts.includes('v43:reward:event:' + e.id) ? 'Svět se změnil' : s.facts.includes(e.requires) ? 'Událost čeká v oblasti' : 'Nejdříve pomoz v hlavním příběhu'}</small></article>)}</>; }
export function BuddyExtras({ mascot, photo, onMessage }: {
    mascot: string;
    photo: () => boolean;
    onMessage: (text: string) => void;
}) {
    const s = useFrontierStore(), personality = PERSONALITIES[mascot] ?? PERSONALITIES.ember;
    return <><h3>{personality.trait}</h3><p>{personality.camp}</p><p>{personality.gesture}</p><div className="fw-row">{[['pozdrav', 'Pozdrav'], ['tanec', 'Tanec'], ['odpocinek', 'Odpočinek']].map(([id, name]) => <button key={id} onClick={() => { s.choose('gesture', id); s.choose('gestureNonce', String(Number(s.choices.gestureNonce ?? 0) + 1)); onMessage('Po zavření panelu Buddy předvede: ' + name.toLowerCase() + '.'); }}>{name}</button>)}<button onClick={() => onMessage(photo() ? 'Fotka výpravy se stáhla jako PNG.' : 'Fotku se nepodařilo vytvořit.')}>Vyfotit společnou vzpomínku</button></div><p className="fw-muted">Fotka zachytí herní krajinu bez panelů. Fotografie se stáhne do zařízení. Chvíle u ohně se ukládají do Deníku.</p>
 <h3>Kaelovy pokyny</h3><p>Pokyny platí při Kaelově doprovodu od úrovně 20. Při ochraně v tvé blízkosti snižuje příchozí poškození o 20 %.</p><div className="fw-row"><button aria-pressed={s.choices.kael !== 'cil'} onClick={() => s.choose('kael', 'chran')}>Chraň mě</button><button aria-pressed={s.choices.kael === 'cil'} onClick={() => s.choose('kael', 'cil')}>Soustřeď označený cíl</button></div></>;
}
