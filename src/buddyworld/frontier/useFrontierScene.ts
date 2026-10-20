import { useEffect, useRef, useState } from 'react';
import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { assetUrl } from '../assetUrl';
import { createCharacter } from '../scene/characters';
import { createCompanion, createMonster } from './figures';
import { createArt47 } from './art47';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { STORY, SPECIES, SIDEQUESTS, PATHS, region as getRegion, species, type RegionId, type Species } from './content';
import { useFrontierStore, initialLocation, equipmentStats, type Position, type LocationSave } from './store';
import { useBuddyWorldStore } from '../useBuddyWorldStore';
import { useAdventureStore } from '../adventure';
import { advanceSequence, puzzleSolved, withinWorld, blocked, shieldDamage, incomingDamage, distance } from './rules';
import { playCue } from '../audio';
import { MINIBOSSES, EPISODES, NEIGHBORS, neighborText, episodeStage, buddyDevelopment, bossPattern, inLine, lineTelegraphAngle } from './continuation';
import { SECRETS, EVENTS, CAMPS, PERSONALITIES, resolveCombo, COMBO_NAMES, specialization, routeGate, dodgeState } from './expansion';
export type Action = 'attack' | 'dodge' | 'buddy' | 'skill1' | 'skill2' | 'interact' | 'target' | 'potion';
export interface Prompt {
    title: string;
    text: string;
    options: string[];
    kind: string;
}
export interface FrontierHUD {
    hp: number;
    maxHp: number;
    position: Position;
    near: string;
    target: {
        name: string;
        hp: number;
        maxHp: number;
        hint: string;
        warning: boolean;
    } | null;
    cooldowns: number[];
    dead: boolean;
    notice: string;
    hold: number;
    objective: string;
    ready: boolean;
    potions: number;
    time: number;
    nodes: {
        x: number;
        z: number;
    }[];
    tracking: string;
    training: {
        damage: number;
        hits: number;
        combos: number;
        mode: number;
    } | null;
    feedback: {
        text: string;
        kind: string;
    } | null;
    failed: boolean;
}
const startHUD: FrontierHUD = { hp: 100, maxHp: 100, position: { x: 0, z: 12 }, near: '', target: null, cooldowns: [0, 0, 0, 0], dead: false, notice: '', hold: 0, objective: '', ready: false, potions: 3, time: 0, nodes: [], failed: false, training: null, feedback: null, tracking: '' };
const glbCache = new Map<string, Promise<T.Group>>();
function loadModel(id: string) {
    if (!glbCache.has(id))
        glbCache.set(id, new GLTFLoader().loadAsync(assetUrl('/buddyworld/artpack-v1/models/' + id + '.glb')).then(g => g.scene));
    return glbCache.get(id)!;
}
interface Actor {
    id: string;
    s: Species;
    mesh: T.Group;
    hp: number;
    maxHp: number;
    home: Position;
    cooldown: number;
    tell: number;
    aim: Position;
    slow: number;
    burn: number;
    recover: number;
    summons: number;
    warning: T.Mesh;
    story: boolean;
    frozen: number;
    rooted: number;
    marked: number;
    recoil: number;
    turn: number;
    move?: ReturnType<typeof bossPattern>;
    line?: T.Mesh;
}
interface Node {
    id: string;
    name: string;
    x: number;
    z: number;
    mesh: T.Group;
    index: number;
    side?: string;
}
export function useFrontierScene(regionId: RegionId, mascot: string, paused: boolean, onPrompt: (p: Prompt | null) => void) {
    const instance = useFrontierStore(s => s.runs[regionId] ?? 0);
    const containerRef = useRef<HTMLDivElement>(null), pausedRef = useRef(paused), promptRef = useRef(onPrompt);
    pausedRef.current = paused;
    promptRef.current = onPrompt;
    const controls = useRef({ x: 0, z: 0, held: false, actions: [] as Action[], choice: -1, rest: false });
    const [hud, setHUD] = useState(startHUD);
    const [failure, setFailure] = useState(false);
    useEffect(() => {
        const container = containerRef.current;
        if (!container)
            return;
        let disposed = false, raf = 0, ready = false;
        let renderer: T.WebGLRenderer;
        try {
            renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'low-power', preserveDrawingBuffer: true });
        }
        catch {
            setFailure(true);
            return;
        }
        renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
        renderer.outputColorSpace = T.SRGBColorSpace;
        renderer.toneMapping = T.ACESFilmicToneMapping;
        renderer.toneMappingExposure = .96;
        renderer.shadowMap.type = T.PCFShadowMap;
        renderer.shadowMap.autoUpdate = false;
        container.appendChild(renderer.domElement);
        const r = getRegion(regionId), dungeon = !!r.dungeon, scene = new T.Scene();
        scene.background = new T.Color(r.fog);
        scene.fog = new T.Fog(r.fog, 24, 62);
        const camera = new T.PerspectiveCamera(48, 1, .1, 100);
        let cameraAngle = .18;
        scene.add(new T.HemisphereLight('#fff1d3', dungeon ? '#2b3440' : '#607345', dungeon ? 1.7 : 1.9));
        const sun = new T.DirectionalLight('#ffe5b0', dungeon ? 1.5 : 2.5);
        sun.position.set(-15, 25, 10);
        sun.shadow.mapSize.set(1024, 1024);
        sun.shadow.camera.left = sun.shadow.camera.bottom = -22;
        sun.shadow.camera.right = sun.shadow.camera.top = 22;
        sun.shadow.camera.near = .5;
        sun.shadow.camera.far = 75;
        sun.shadow.camera.updateProjectionMatrix();
        sun.shadow.normalBias = .035;
        sun.shadow.bias = -.0003;
        sun.shadow.radius = 2;
        scene.add(sun, sun.target);
        const art = createArt47();
        let graphicsMode = '', lastShadowUpdate = -1;
        const geometries = new Set<T.BufferGeometry>(), materials = new Set<T.Material>();
        const mesh = (g: T.Object3D, geo: T.BufferGeometry, color: string, x: number, y: number, z: number) => { const m = new T.Mesh(geo, new T.MeshStandardMaterial({ color, roughness: .9 })); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; g.add(m); geometries.add(geo); materials.add(m.material); return m; };
        const plane = mesh(scene, new T.PlaneGeometry(dungeon ? 35 : 70, dungeon ? 61 : 70), r.ground, 0, -.03, dungeon ? -8 : 0);
        plane.rotation.x = -Math.PI / 2;
        plane.material = dungeon ? art.floor(regionId) : art.ground(regionId === 'udoli' ? '#8b9d5b' : r.ground);
        plane.castShadow = false;
        const boxes: {
            x: number;
            z: number;
            w: number;
            d: number;
        }[] = [];
        const decorations = new T.Group();
        scene.add(decorations);
        const occludingWalls: T.Mesh<T.BufferGeometry, T.MeshStandardMaterial>[] = [];
        const wallRay = new T.Raycaster();
        const box = (g: T.Object3D, color: string, w: number, h: number, d: number, x: number, z: number, collide = false) => {
            const m = mesh(g, h > .1 ? new RoundedBoxGeometry(w, h, d, 1, Math.min(.055, w / 4, h / 4, d / 4)) : new T.BoxGeometry(w, h, d), color, x, h / 2, z);
            if (['#785239', '#ad7950', '#483b36'].includes(color)) m.material = art.material(color, 'wood');
            else if (['#737d7d','#99a7a0','#a5a2b1','#b8b0c2','#9ba6a2','#9c927f','#aca0af'].includes(color)) m.material = art.material(color, 'stone');
            if (collide)
                boxes.push({ x, z, w, d });
            // Keep dungeon walls separate from static batching so only the
            // actual obstruction fades, rather than every stone in the map.
            if (dungeon && g === decorations && (h >= 2.5 || h === .7)) {
                scene.add(m);
                m.material = m.material.clone();
                materials.add(m.material);
                m.material.transparent = true;
                occludingWalls.push(m);
            }
            return m;
        };
        let pendingModels = 0, batchTimer: ReturnType<typeof setTimeout> | null = null;
        const batch = (parent: T.Object3D) => {
            if (disposed)
                return;
            parent.updateMatrixWorld(true);
            const buckets = new Map<string, {
                geos: T.BufferGeometry[];
                material: T.Material;
            }>();
            parent.traverse(o => {
                if (o instanceof T.Mesh && o.material instanceof T.MeshStandardMaterial) {
                    let geo = o.geometry.clone().applyMatrix4(o.matrixWorld);
                    if (!geo.getAttribute('uv')) geo.setAttribute('uv', new T.Float32BufferAttribute(new Float32Array(geo.getAttribute('position').count * 2), 2));
                    if (geo.index)
                        geo = geo.toNonIndexed();
                    const key = [o.material.color.getHexString(), o.material.map?.uuid ?? '', o.material.emissive.getHexString(), o.material.emissiveIntensity, o.material.roughness, o.material.flatShading, o.material.transparent, o.material.opacity].join(':');
                    if (!buckets.has(key))
                        buckets.set(key, { geos: [], material: o.material });
                    buckets.get(key)!.geos.push(geo);
                }
            });
            parent.clear();
            for (const bucket of buckets.values()) {
                const geo = mergeGeometries(bucket.geos);
                if (geo) {
                    geometries.add(geo);
                    const combined = new T.Mesh(geo, bucket.material);
                    combined.castShadow = combined.receiveShadow = true;
                    parent.add(combined);
                }
                bucket.geos.forEach(g => g.dispose());
            }
            renderer.shadowMap.needsUpdate = true;
        };
        const model = (id: string, x: number, z: number, scale = 1, rotation = 0, parent: T.Object3D = decorations) => {
            const original = art.model(id);
            if (original) {
                original.position.set(x, 0, z);
                original.scale.setScalar(scale);
                original.rotation.y = rotation;
                parent.add(original);
                original.updateWorldMatrix(true, true);
                const crowns: T.Mesh<T.BufferGeometry, T.MeshStandardMaterial>[] = [];
                original.traverse(o => { if (o instanceof T.Mesh && o.name === 'v46-canopy') crowns.push(o as T.Mesh<T.BufferGeometry, T.MeshStandardMaterial>); });
                for (const crown of crowns) { scene.attach(crown); occludingWalls.push(crown); }
                if (batchTimer) clearTimeout(batchTimer);
                batchTimer = setTimeout(() => batch(decorations), 80);
                return;
            }
            pendingModels++;
            void loadModel(id).then(source => {
                if (disposed)
                    return;
                const m = source.clone(true);
                m.position.set(x, 0, z);
                m.scale.setScalar(scale);
                m.rotation.y = rotation;
                m.traverse(o => { if (o instanceof T.Mesh) { o.castShadow = true; o.receiveShadow = true; } });
                parent.add(m);
            }).catch(() => {
                if (!disposed)
                    mesh(parent, new T.IcosahedronGeometry(.45, 0), r.accent, x, .5, z);
            }).finally(() => {
                pendingModels--;
                if (!disposed && pendingModels === 0) {
                    if (batchTimer)
                        clearTimeout(batchTimer);
                    batchTimer = setTimeout(() => batch(decorations), 80);
                }
            });
        };
        let saved = useFrontierStore.getState().saves[regionId] ?? initialLocation();
        const values = { ...saved.values }, enemySaved = { ...saved.enemies };
        let time = saved.elapsed, active = 0, lastSave = 0, lastHUD = 0, lastNoticeTime = 0, notice = '', lastMission = -1, hold = 0, interactCD = 0;
        const playerTints = { ochrance: new T.Color('#648b88'), stopar: new T.Color('#4b8e76'), runotvurce: new T.Color('#727e9e') };
        const player = createCharacter(playerTints[useFrontierStore.getState().path].getHex());
        scene.add(player.group);
        player.group.position.set(saved.position.x, 0, saved.position.z);
        const buddy = createCompanion(mascot);
        scene.add(buddy.group);
        buddy.group.position.copy(player.group.position).add(new T.Vector3(-1, 0, 1));
        const sword = new T.Group(), bow = new T.Group(), staff = new T.Group();
        player.arms[1].add(sword, bow, staff);
        sword.add(art.model('mec')!);
        bow.add(art.model('luk')!);
        staff.add(art.model('hul')!);
        let maxHp = 100 + (useBuddyWorldStore.getState().level - 1) * 5, hp = Math.min(saved.hp, maxHp), target: Actor | null = null, lastAttack = -10, shieldUntil = 0, dodgeUntil = 0, dodgeCooldown = -10, bonusStrike = false, buddyCD = -20, skill1CD = -20, skill2CD = -20, phase = 0, attackPose = 0, zoom = 1;
        let lastImpactPulse = -100;
        let impactUntilReal = 0, shakeUntil = 0, feedbackUntil = 0, lastFeedback: {
            text: string;
            kind: string;
        } | null = null;
        let secondDodgeUntil = 0, buddyEchoAt = 0, gestureStart = 0, lastGesture = '', expansionVersion = '';
        const healingZones: {
            x: number;
            z: number;
            until: number;
        }[] = [];
        let dash = { x: 0, z: -1 }, pendingPrompt: Prompt | null = null, potions = values.potions ?? 3;
        const cue = (k: 'attack' | 'defend' | 'reward' | 'buddy') => {
            if (useAdventureStore.getState().sound)
                playCue(k);
        };
        const say = (text: string) => { notice = text; lastNoticeTime = time; };
        const ring = (color: string, radius: number) => { const m = new T.Mesh(new T.RingGeometry(radius - .05, radius, 32), new T.MeshBasicMaterial({ color, transparent: true, opacity: .75, side: T.DoubleSide, depthWrite: false })); m.rotation.x = -Math.PI / 2; return m; };
        const targetRing = ring('#e5b66a', 1);
        targetRing.position.y = .045;
        scene.add(targetRing);
        targetRing.visible = false;
        const actors: Actor[] = [], projectiles: {
            mesh: T.Mesh;
            x: number;
            z: number;
            dx: number;
            dz: number;
            age: number;
            damage: number;
            training: boolean;
        }[] = [], effects: {
            mesh: T.Object3D;
            until: number;
        }[] = [];
        function spawn(id: string, kind: string, x: number, z: number, story = false) {
            if (actors.some(a => a.id === id))
                return;
            const s = MINIBOSSES.find(m => m.id === kind) ?? species(kind), ss = enemySaved[id], obj = createMonster(s), scale = s.boss ? 1.35 : 1;
            obj.scale.multiplyScalar(scale);
            obj.position.set(ss?.x ?? x, 0, ss?.z ?? z);
            scene.add(obj);
            const warning = ring('#e17c67', s.behaviour === 'burrow' ? 2.1 : s.behaviour === 'ranged' ? 1 : s.boss ? 5 : s.range + 1);
            warning.visible = false;
            warning.position.y = .04;
            scene.add(warning);
            const a: Actor = { id, s, mesh: obj, hp: ss?.hp ?? s.hp, maxHp: s.hp, home: { x, z }, cooldown: time + 1, tell: 0, aim: { x, z }, slow: 0, burn: 0, recover: 0, summons: 0, warning, story, frozen: 0, rooted: 0, marked: 0, recoil: 0, turn: values['turn:' + id] ?? 0 };
            if (ss?.dead || a.hp <= 0) {
                obj.visible = false;
                a.hp = 0;
            }
            actors.push(a);
            return a;
        }
        const seed = (n: number) => { const v = Math.sin(n * 78.233 + regionId.length * 12.89) * 43758.5453; return v - Math.floor(v); };
        if (!dungeon) {
            box(decorations, '#c8b18c', 2.8, .03, 63, 0, 0).material = art.path(2.8, 63);
            box(decorations, '#c8b18c', 57, .025, 2.5, 0, 6).material = art.path(57, 2.5);
            if (regionId === 'udoli') {
                model('chata', -7, 6, 1.25);
                boxes.push({ x: -7, z: 6, w: 3.8, d: 3.4 });
                model('dilna', 7, 6, 1.1);
                boxes.push({ x: 7, z: 6, w: 5.8, d: 3.2 });
                model('studna', 0, 5);
                boxes.push({ x: 0, z: 5, w: 1.5, d: 1.5 });
                box(decorations, '#6ba9a4', 24, .04, 1.8, 10, -12).position.y = .03;
                model('stanek', -7, 12);
                model('brana', 0, -8, 1.3);
                model('mustek', 10, -12, 1.25);
                model('zahonek', -6, 9);
                model('lavicka', 3, 7);
                for (const x of [-3, 3])
                    for (const z of [1, 10])
                        model('lucerna', x, z);
                for (const z of [8, 10.5, 13, 15.5, 18])
                    for (const x of [-2.1, 2.1]) model('kvetiny', x, z, .85);
                for (const [x, z] of [[-9.8, 5], [9.5, 5], [-8.5, 9], [9, 8]]) {
                    model('ker', x, z, .7);
                    model('kvetiny', x + .7, z + .6, .9);
                }
            }
            else if (regionId === 'mokrad') {
                const water = box(decorations, '#6ba9a4', 60, .055, 2, 0, 3);
                water.position.y = .05;
                model('mustek', 0, 3, 1.4);
                model('mustek', -14, 3, 1.2);
                model('studna', 8, -12, 1.2);
            }
            else if (regionId === 'ruiny') {
                for (const x of [-6, 6])
                    for (const z of [-8, -20])
                        box(decorations, '#a5a2b1', 1.4, 4, 1.4, x, z, true);
                box(decorations, '#b8b0c2', 13, .7, 1.5, 0, -20).position.y = 4.3;
                model('runovy-kamen', -8, -5, 1.5);
            }
            for (let i = 0; i < 55; i++) {
                let x = (seed(i + 1) - .5) * 62, z = (seed(i + 200) - .5) * 60;
                if (Math.abs(x) < 4 || regionId === 'udoli' && Math.abs(x) < 12 && z > 0)
                    continue;
                const id = regionId === 'ruiny' ? (i % 3 ? 'kamen-velky' : 'runovy-kamen') : i % 4 === 0 ? 'briza' : regionId === 'les' && i % 3 ? 'jedle' : 'dub';
                model(id, x, z, .75 + seed(i + 800) * .6);
                if (!['runovy-kamen', 'kamen-velky'].includes(id))
                    boxes.push({ x, z, w: .5, d: .5 });
                if (i % 3 === 0)
                    model(i % 2 ? 'houby' : 'ker', x + 1, z + .6);
            }
            for (let i = 0; i < 20; i++) {
                const x = (seed(i + 400) - .5) * 48, z = (seed(i + 600) - .5) * 50;
                if (Math.abs(x) > 3)
                    model(i % 3 ? 'trava' : 'kvetiny', x, z, 1.4);
            }
            const kinds = SPECIES.filter(s => s.region === regionId && !s.boss);
            kinds.forEach((s, i) => {
                for (let j = 0; j < 2; j++) {
                    const x = (i % 2 ? -1 : 1) * (14 + j * 5), z = -4 - Math.floor(i / 2) * 9 + j * 4;
                    spawn('wild:' + i + ':' + j, s.id, x, z);
                }
            });
        }
        else {
            for (const x of [-17, 17])
                box(decorations, '#737d7d', 1, 4, 61, x, -8, true);
            for (const z of [16, -32])
                box(decorations, '#737d7d', 35, 4, 1, 0, z, true);
            for (const z of [-4, -16]) {
                box(decorations, '#737d7d', 14, 3.5, 1, -10, z, true);
                box(decorations, '#737d7d', 14, 3.5, 1, 10, z, true);
                box(decorations, '#99a7a0', 6, .7, 1, 0, z).position.y = 3.5;
            }
            for (const z of [9, -7, -22])
                for (const x of [-13, 13]) {
                    model(regionId === 'koreny' ? 'koreneny-oblouk' : 'runovy-kamen', x, z, 1.2);
                    model('lucerna', x + 1, z + 1, 1.1);
                }
            const kinds = SPECIES.filter(s => s.region === (r.parent ?? 'les') && !s.boss);
            for (let i = 0; i < 6; i++)
                spawn('room:' + i, kinds[i % kinds.length].id, i % 2 ? -8 : 8, 6 - Math.floor(i / 2) * 12);
            spawn('dungeon-boss', regionId === 'koreny' ? 'boss-koreny' : regionId === 'vodarna' ? 'boss-voda' : 'boss-archiv', 0, -25, true);
        }
        if (regionId === 'les') {
            for (const [x,z] of [[-9,8],[10,-17],[-18,-22]]) { model('kmen',x,z,1.1,.6); model('houby',x+1,z+.8,1.3); }
        } else if (regionId === 'mokrad') {
            for (const x of [-22,-17,-9,8,16,23]) { model('rakosi',x,4.8,1.5); model('rakosi',x,-.5,1.1); }
            model('potrubi',11,-13,1.2); model('ventil',9.7,-12.7,.75);
        } else if (regionId === 'ruiny') {
            for (const [x,z] of [[-10,1],[11,-9],[-11,-25],[12,11]]) { model('sloup',x,z,1.2); model('krystaly',x+.8,z+.3,.65); }
        } else if (dungeon) {
            for (const z of [10,-1,-12,-25]) for (const x of [-15,15]) {
                model(regionId === 'archiv' ? 'police' : regionId === 'vodarna' ? 'potrubi' : 'koreneny-oblouk',x,z,regionId === 'koreny' ? .7 : 1,x<0?Math.PI/2:-Math.PI/2);
                model(regionId === 'archiv' ? 'sloup' : regionId === 'vodarna' ? 'ventil' : 'houby',x*.88,z-1,.7);
            }
            for (const x of [-10,10]) model('krystaly',x,-29,1.2);
        }
        for (const mini of MINIBOSSES.filter(m => m.region === regionId && useFrontierStore.getState().mission >= m.unlock && !useFrontierStore.getState().facts.includes('v44:done:mini:' + m.id)))
            spawn(mini.id, mini.id, mini.at[0], mini.at[1], true);
        const gate1 = box(scene, '#a7bc9d', 5, 2.5, .45, 0, -4), gate2 = box(scene, '#a7bc9d', 5, 2.5, .45, 0, -16);
        gate1.visible = gate2.visible = dungeon;
        const merchant = createCharacter('#b78565');
        merchant.group.visible = false;
        scene.add(merchant.group);
        const npc = createCharacter('#e2bd79');
        npc.group.position.set(2.3, 0, 6);
        npc.group.visible = regionId === 'udoli';
        scene.add(npc.group);
        const boat = art.model('lod')!;
        boat.visible = false;
        scene.add(boat);
        const ally = createCharacter('#6f9c93');
        ally.group.visible = false;
        scene.add(ally.group);
        let allyAttack = 0;
        const returned = createCharacter('#b78565');
        returned.group.position.set(-5, 0, 12);
        returned.group.visible = false;
        scene.add(returned.group);
        const sprite = createCompanion('moss');
        sprite.group.scale.setScalar(.65);
        sprite.group.position.set(-5, 0, 8);
        sprite.group.visible = false;
        scene.add(sprite.group);
        const cage = art.model('klec')!;
        cage.position.set(9, 0, -10);
        cage.visible = false;
        scene.add(cage);
        const caged = createCompanion('moss');
        caged.group.scale.setScalar(.55);
        cage.add(caged.group);
        const townChanges = new T.Group();
        scene.add(townChanges);
        let townVersion = '';
        let nodes: Node[] = [], missionRoot = new T.Group();
        scene.add(missionRoot);
        function node(id: string, name: string, x: number, z: number, index = 0, side?: string) {
            const g = new T.Group();
            const crystal = mesh(g, new T.OctahedronGeometry(side ? .23 : .34), side ? '#af8fab' : '#e5b66a', 0, 1.5, 0);
            g.position.set(x, 0, z);
            const base = ring(side ? '#af8fab' : '#e5b66a', .65);
            base.position.y = .04;
            g.add(base);
            missionRoot.add(g);
            const current = STORY[useFrontierStore.getState().mission];
            if (!side && index < 3 && current?.region === regionId && (current.mechanic === 'mirror' || current.mechanic === 'valves')) {
                const mechanism = new T.Group();
                mechanism.name = 'mechanism';
                mechanism.add(art.model(current.mechanic === 'mirror' ? 'zrcadlo' : 'ventil')!);
                g.add(mechanism);
            }
            const n = { id, name, x, z, index, mesh: g, side };
            nodes.push(n);
            return crystal;
        }
        const atThree = (base: [
            number,
            number
        ]) => [[base[0] - 4, base[1] + 3], [base[0] + 4, base[1]], [base[0], base[1] - 5]] as [
            number,
            number
        ][];
        const collar = mesh(buddy.group, new T.OctahedronGeometry(.12), '#e5b66a', 0, .65, .4);
        const expansionRoot = new T.Group();
        scene.add(expansionRoot);
        const arenaObjects: {
            id: string;
            x: number;
            z: number;
            mesh: T.Object3D;
            kind: string;
        }[] = [];
        if (dungeon || regionId === 'ruiny') {
            for (const [id, x, z, kind] of [['weight', -4, -22, 'weight'], ['steam', 4, -22, 'steam'], ['floor', 0, -27, 'floor']] as [
                string,
                number,
                number,
                string
            ][]) {
                const g = new T.Group();
                g.position.set(x, 0, z);
                scene.add(g);
                if (kind === 'weight') {
                    box(g, '#9c927f', 1, 1, 1, 0, 0).position.y = 3.7;
                    box(g, '#785239', .12, 4, .12, 0, 0);
                }
                if (kind === 'steam') {
                    mesh(g, new T.CylinderGeometry(.45, .45, .7, 8), '#78b7b7', 0, .35, 0);
                    const w = mesh(g, new T.TorusGeometry(.4, .06, 6, 12), '#e5b66a', 0, 1, 0);
                    w.rotation.x = Math.PI / 2;
                }
                if (kind === 'floor') {
                    box(g, '#aca0af', 3, .08, 3, 0, 0);
                    for (const x of [-.6, .6])
                        box(g, '#4b435d', .08, .09, 2, x, 0);
                }
                arenaObjects.push({ id, x, z, mesh: g, kind });
            }
            // Solid waist-high columns block both movement and flying projectiles.
            for (const x of [-5, 5])
                box(expansionRoot, '#9ba6a2', 1.1, 1.5, 1.1, x, -19, true);
        }
        for (const camp of CAMPS.filter(x => x.region === regionId)) {
            const g = new T.Group();
            g.position.set(camp.at[0], 0, camp.at[1]);
            scene.add(g);
            const base = ring('#b6a184', .8);
            base.position.y = .05;
            g.add(base);
            for (const x of [-.3, .3])
                box(g, '#785239', .18, .18, 1, x, 0);
            mesh(g, new T.ConeGeometry(.3, .6, 6), '#e5b66a', 0, .5, 0);
            mesh(g, new T.ConeGeometry(.2, .45, 6), '#df9265', .2, .4, 0);
        }
        const spring = mesh(expansionRoot, new T.CircleGeometry(2.4, 24), '#69d5cc', -15, .06, 14);
        spring.rotation.x = -Math.PI / 2;
        spring.visible = false;
        const oil = new T.Group();
        oil.position.set(dungeon ? 0 : 15, 0, dungeon ? -24 : -5);
        const oilDisk = mesh(oil, new T.CircleGeometry(2, 24), '#625347', 0, .035, 0);
        oilDisk.rotation.x = -Math.PI / 2;
        scene.add(oil);
        const bossRoots = new T.Group();
        scene.add(bossRoots);
        bossRoots.visible = false;
        for (const x of [-8, 0, 8]) {
            const m = box(bossRoots, '#647d51', 5, 1.8, .8, x, -22);
            m.rotation.z = x < 0 ? -.1 : .1;
        }
        const islands: T.Mesh[] = [];
        if (regionId === 'vodarna')
            for (const [x, z] of [[-6, -23], [6, -23], [0, -19]]) {
                const m = ring('#8fe2b9', 1.9);
                m.position.set(x, .08, z);
                scene.add(m);
                islands.push(m);
            }
        const guardResident = createCharacter('#6f9c93'), dinnerGuest = createCharacter('#86b0b7');
        scene.add(guardResident.group, dinnerGuest.group);
        const mira = createCharacter('#a7c08b'), resident = createCompanion('ember'), stoneFriend = createMonster(species('ostnatec')), spiritFriend = createCompanion('nyx');
        mira.group.position.set(9, 0, 10);
        resident.group.scale.setScalar(.65);
        stoneFriend.position.set(-9, 0, 10);
        spiritFriend.group.position.set(-9, 0, 10);
        scene.add(mira.group, resident.group, stoneFriend, spiritFriend.group);
        function moment(id: string) { const st = useFrontierStore.getState(); st.flag('v44:proof:' + id); st.rewardMoment(id); configure(); save(); cue('reward'); }
        function impact(a: Actor, amount: number, kind: string) {
            const st = useFrontierStore.getState(), reduced = useAdventureStore.getState().reducedMotion;
            a.recoil = time + .22;
            lastFeedback = { text: kind === 'clang' ? 'Štít · ' + Math.round(amount) : kind === 'combo' ? 'KOMBO · ' + Math.round(amount) : Math.round(amount) + '', kind };
            feedbackUntil = time + 1.2;
            if (st.choices.impact !== 'off' && !reduced)
                impactUntilReal = Math.max(impactUntilReal, performance.now() + (kind === 'combo' ? 65 : kind === 'heavy' ? 50 : 25));
            if (st.choices.shake === 'on' && !reduced)
                shakeUntil = time + .18;
            const pulse = time - lastImpactPulse > .08;
            if (pulse) lastImpactPulse = time;
            if (pulse && useAdventureStore.getState().sound)
                playCue(kind === 'clang' ? 'clang' : kind === 'combo' ? 'combo' : kind === 'heavy' ? 'heavy' : 'hit');
            if (pulse && st.choices.haptics === 'on')
                try {
                    navigator.vibrate?.(kind === 'combo' ? [20, 20, 30] : kind === 'heavy' ? 25 : 10);
                }
                catch { }
        }
        function discovery(id: string) {
            const st = useFrontierStore.getState();
            st.flag('v43:proof:' + id);
            if (st.rewardDiscovery(id)) {
                cue('reward');
                say(id.startsWith('challenge:') ? 'Dovednostní výzva splněna. V Deníku si můžeš vybrat nový znak.' : 'Nový objev se uložil do Deníku.');
            }
            save();
        }
        function challenge(id: string) {
            if (!useFrontierStore.getState().facts.includes('v43:reward:challenge:' + id))
                discovery('challenge:' + id);
        }
        function healingZone(seconds: number) { const pos = player.group.position; healingZones.push({ x: pos.x, z: pos.z, until: time + seconds }); const m = ring('#91d5a0', 1.8); m.position.set(pos.x, .08, pos.z); scene.add(m); effects.push({ mesh: m, until: time + seconds }); }
        function configure() {
            missionRoot.traverse(o => {
                if (o instanceof T.Mesh) {
                    o.geometry.dispose();
                    for (const m of Array.isArray(o.material) ? o.material : [o.material])
                        m.dispose();
                }
            });
            scene.remove(missionRoot);
            missionRoot = new T.Group();
            scene.add(missionRoot);
            nodes = [];
            boat.visible = false;
            cage.visible = false;
            const s = useFrontierStore.getState(), q = STORY[s.mission];
            merchant.group.visible = false;
            if (dungeon) {
                if (regionId === 'koreny') {
                    [[-8, 7], [8, -8], [-8, -21]].forEach(([x, z], i) => node('lens' + i, `Čočka ${i + 1} · cíl ${i + 1}`, x, z, i));
                }
                if (regionId === 'vodarna') {
                    [[-8, 7], [-8, -21], [8, -8]].forEach(([x, z], i) => node('valve' + i, `Ventil ${i + 1}`, x, z, i));
                }
                if (regionId === 'archiv') {
                    node('mural0', 'První svědectví', -8, 7, 0);
                    node('mural1', 'Druhé svědectví', 8, -8, 1);
                    node('beacon', 'Zlatý maják · odhalit Archiváře', 0, -19, 2);
                }
                node('exit', 'Návrat z podzemí', 0, 13, 99);
            }
            else if (q?.region === regionId && !s.facts.includes(q.id + ':done')) {
                const a = q.at, mechanic = q.mechanic;
                boat.visible = mechanic === 'tow';
                if (boat.visible)
                    boat.position.set(values['boat:x'] ?? 12, .08, values['boat:z'] ?? 6);
                if (['trail', 'sequence', 'fresco', 'ritual', 'valves', 'mirror', 'sneak', 'tow', 'escape'].includes(mechanic)) {
                    const points = mechanic === 'sneak' ? [[-12, -2], [-8, -10], [0, -14]] : mechanic === 'escape' ? [[-12, -12], [-4, -3], [0, 9]] : mechanic === 'tow' ? [[12, 6], [7, 10], [0, 13]] : atThree(a);
                    points.forEach(([x, z], i) => node(q.id + ':' + i, `${mechanic === 'trail' ? ['Kolo', 'Šátek', 'Lucerna'][i] : mechanic === 'sequence' ? ['Kořen', 'List', 'Hvězda'][i] : mechanic === 'fresco' ? ['Strom', 'Město', 'Strážce'][i] : mechanic === 'valves' ? 'Ventil ' + (i + 1) : mechanic === 'mirror' ? 'Zrcadlo ' + (i + 1) : 'Bod ' + (i + 1)}`, x, z, i));
                    if (mechanic === 'ritual')
                        node(q.id + ':3', 'Kámen 4', a[0] + 7, a[1] - 4, 3);
                    if (mechanic === 'valves' || mechanic === 'mirror')
                        node('confirm', 'Potvrdit nastavení', a[0], a[1] + 7, 9);
                    if (mechanic === 'escape')
                        node('start', 'Spustit únik · 45 sekund', a[0], a[1] + 2, 9);
                }
                else if (mechanic === 'repair') {
                    for (let i = 0; i < 2; i++)
                        node(q.id + ':' + i, 'Oprava podpěry ' + (i + 1) + ' · podrž E', a[0] + (i ? 2 : -2), a[1], i);
                }
                else
                    node(q.id, q.name, ...a);
                if (mechanic === 'defend' && (values[q.id + ':wave'] ?? 0) > 0 && (values[q.id + ':wave'] ?? 0) <= 2) {
                    const w = values[q.id + ':wave'];
                    for (let i = 0; i < 3; i++)
                        spawn(`${q.id}:wave${w}:${i}`, regionId === 'udoli' ? 'trnovlk' : i === 0 ? 'korenovec' : 'mura', (w % 2 ? 1 : -1) * (4 + i * 2), -10 - i, true);
                }
                if (mechanic === 'escort') {
                    if (values.ambush) {
                        spawn('ambush0', 'trnovlk', 5, -3, true);
                        spawn('ambush1', 'ostnatec', 1, -4, true);
                    }
                    merchant.group.visible = true;
                    merchant.group.position.set(values[q.id + ':x'] ?? a[0], 0, values[q.id + ':z'] ?? a[1]);
                }
                if (mechanic === 'rescue') {
                    cage.visible = true;
                    spawn('cage1', 'korenovec', a[0] - 2, a[1] - 1, true);
                    spawn('cage2', 'pavouk', a[0] + 2, a[1] - 1, true);
                }
                if (mechanic === 'boss')
                    spawn('final', 'boss-final', a[0], a[1], true);
            }
            if (!dungeon && regionId === 'les' && values.raceStart) {
                [[10, -8], [-8, -7], [10, 10]].forEach(([x, z], i) => node('race' + i, 'Závodní bod ' + (i + 1), x, z, i, 'race-point'));
            }
            if (!dungeon && regionId === 'ruiny' && !s.side.includes('poklad')) {
                [[15, -3], [8, -18], [-12, 4]].forEach(([x, z], i) => node('treasure' + i, ['Půlměsíc', 'Hvězda', 'Slunce'][i], x, z, i, 'treasure-point'));
            }
            if (!dungeon)
                for (const side of SIDEQUESTS.filter(x => x.region === regionId && !s.side.includes(x.id)))
                    node('side:' + side.id, side.name, ...side.at, 0, side.id);
            for (const secret of SECRETS.filter(x => x.region === regionId && !s.facts.includes('v43:reward:secret:' + x.id))) {
                const marker = node('secret:' + secret.id, secret.name, secret.at[0], secret.at[1], 0, 'v43');
                marker.visible = false;
                const n = nodes.at(-1)!;
                if (secret.id === 'dutina') {
                    const rock = mesh(n.mesh, new T.IcosahedronGeometry(.7, 0), '#9b9b8a', 0, .55, 0);
                    rock.scale.set(1.4, .8, 1);
                    const hole = mesh(n.mesh, new T.CircleGeometry(.25, 12), '#334940', 0, .6, .6);
                    hole.rotation.x = -.2;
                    for (const x of [-.7, .7])
                        mesh(n.mesh, new T.OctahedronGeometry(.13, 0), '#8da67b', x, .25, .8);
                }
                else if (secret.id === 'ozvena') {
                    const hollow = mesh(n.mesh, new T.TorusGeometry(.48, .18, 6, 12), '#785239', 0, .6, 0);
                    hollow.rotation.x = -.4;
                    mesh(n.mesh, new T.CylinderGeometry(.2, .4, 1.4, 6), '#785239', .7, .25, 0).rotation.z = Math.PI / 2;
                }
                else {
                    const water = mesh(n.mesh, new T.CircleGeometry(.9, 20), '#69d5cc', 0, .04, 0);
                    water.rotation.x = -Math.PI / 2;
                    const reflection = mesh(n.mesh, new T.OctahedronGeometry(.25), '#e5b66a', 0, .055, 0);
                    reflection.scale.y = .08;
                }
                n.mesh.add(ring('#69d5cc', 1));
            }
            for (const camp of CAMPS.filter(x => x.region === regionId))
                node('camp:' + regionId, camp.name, camp.at[0], camp.at[1], 0, 'v43');
            for (const e of EVENTS.filter(x => x.region === regionId && s.facts.includes(x.requires) && !s.facts.includes('v43:reward:event:' + x.id)))
                node('event:' + e.id, e.name, e.at[0], e.at[1], 0, 'v43');
            if (dungeon) {
                if (!values['route:chosen'])
                    node('route', 'Zvolit cestu dungeonem', 4, 11, 0, 'v43');
                if (values['route:chosen'] === 1 && !(values['route:safe2'])) {
                    node('safe0', 'Runa listu · první', -4, 8, 0, 'v43');
                    node('safe1', 'Runa slunce · druhá', 4, 7, 1, 'v43');
                }
                if (values['route:chosen'] === 3 && !values['route:rescued'])
                    node('prisoner', 'Osvobodit průzkumníka', 11, -10, 0, 'v43');
                if (values['route:rescued'] && !s.facts.includes('v43:reward:cache:' + regionId))
                    node('cache', 'Otevřít ukrytou komoru', 11, -23, 0, 'v43');
                if (values['route:chosen'] === 4 && !values['trial:done'])
                    node('trial', 'Spustit nepovinnou zkoušku', -10, -22, 0, 'v43');
            }
            if (regionId === 'udoli') {
                node('training', 'Tréninkový dvorek', 11, 18, 0, 'v44');
                for (const n of NEIGHBORS.filter(n => s.facts.includes(n.requires) && !s.facts.includes('v44:done:neighbor:' + n.id)))
                    node('neighbor:' + n.id, n.name, n.at[0], n.at[1], 0, 'v44');
            }
            for (const e of EPISODES) {
                const step = episodeStage(e.id, s.choices), stage = e.stages[step];
                if (s.facts.includes(e.requires) && !s.facts.includes('v44:done:episode:' + e.id) && stage?.region === regionId)
                    node('episode:' + e.id, stage.title + (stage.hold ? ' · podrž E' : ''), stage.at[0], stage.at[1], step, 'v44');
            }
            for (const m of MINIBOSSES.filter(m => m.region === regionId && s.mission >= m.unlock && !s.facts.includes('v44:done:mini:' + m.id))) {
                if (m.mechanic === 'crystals' || m.mechanic === 'tracks' || m.mechanic === 'salt')
                    for (let i = 0; i < (m.mechanic === 'salt' ? 2 : 3); i++) {
                        if (values[m.id + ':' + i])
                            continue;
                        const x = m.at[0] + (i - 1) * 3, z = m.at[1] + 4 + (i % 2) * 2;
                        node('mini:' + m.id + ':' + i, m.mechanic === 'crystals' ? 'Rozbít ochranný krystal' : m.mechanic === 'tracks' ? 'Prozkoumat stopu lovce' : 'Rozsypat bílou sůl', x, z, i, 'v44');
                        const n = nodes.at(-1)!;
                        const prop = mesh(n.mesh, m.mechanic === 'crystals' ? new T.OctahedronGeometry(.7) : m.mechanic === 'tracks' ? new T.CircleGeometry(.4, 8) : new T.CylinderGeometry(.35, .4, .6, 8), m.mechanic === 'crystals' ? '#69d5cc' : m.mechanic === 'salt' ? '#f2e7d0' : '#b3a2bf', 0, m.mechanic === 'tracks' ? .06 : .5, 0);
                        if (m.mechanic === 'tracks')
                            prop.rotation.x = -Math.PI / 2;
                    }
            }
            if (regionId === 'koreny' && values['boss:roots'] && !values['boss:rootCut'] && actors.some(a => a.id === 'dungeon-boss' && a.hp > 0))
                node('cut-root', 'Otevřít průchod kořeny', 0, -20, 0, 'v44');
            for (const a of arenaObjects) {
                a.mesh.visible = !values['arena:' + a.id];
                if (a.mesh.visible)
                    node('arena:' + a.id, a.kind === 'weight' ? 'Uvolnit závaží' : a.kind === 'steam' ? 'Otevřít parní ventil' : 'Rozlomit popraskanou podlahu', a.x, a.z + 1.8, 0, 'v43');
            }
        }
        function flagDone() {
            const q = STORY[useFrontierStore.getState().mission];
            if (q) {
                useFrontierStore.getState().flag(q.id + ':done');
                say('Výprava splněna. Otevři Příběh a převezmi odměnu.');
                cue('reward');
                configure();
            }
        }
        function sideDone(id: string) { const s = useFrontierStore.getState(); s.flag('side:' + id + ':done'); s.finishSide(id); say('Vedlejší příběh dokončen. Odměna je v inventáři.'); configure(); cue('reward'); }
        function prompt(p: Prompt) { pendingPrompt = p; controls.current.held = false; promptRef.current(p); }
        function save() {
            const es: LocationSave['enemies'] = {};
            for (const a of actors)
                es[a.id] = { x: a.mesh.position.x, z: a.mesh.position.z, hp: a.hp, dead: a.hp <= 0 };
            useFrontierStore.getState().save({ position: { x: player.group.position.x, z: player.group.position.z }, hp: Math.max(0, hp), enemies: es, values: { ...values, potions }, elapsed: time }, active, regionId);
            active = 0;
        }
        function kill(a: Actor) {
            if (a.hp > 0)
                return;
            if (a.id === 'training') {
                a.hp = a.maxHp;
                return;
            }
            a.hp = 0;
            a.mesh.visible = false;
            a.warning.visible = false;
            if (a.line) a.line.visible = false;
            useFrontierStore.getState().recordKill(a.s.id);
            if (MINIBOSSES.some(m => m.id === a.id)) {
                moment('mini:' + a.id);
                say('Vzácný protivník poražen. Znak najdeš v Deníku.');
            }
            const run = useFrontierStore.getState().runs[regionId] ?? 0;
            useBuddyWorldStore.getState().pridejXp(a.s.boss ? 60 : 12, `frontier:${regionId}:${run}:${a.id}`);
            if (a.s.boss) {
                const ss = useFrontierStore.getState();
                useFrontierStore.setState({ shards: ss.shards + 3, gold: ss.gold + 25 });
                if (a.id === 'dungeon-boss') {
                    values.bossDefeated = 1;
                    const q = STORY[ss.mission];
                    if (q?.region === regionId && q.mechanic === 'dungeon')
                        flagDone();
                    say('Strážce poražen. Trofej najdeš v odměně příběhu; další průchody dávají střepy.');
                }
                if (a.id === 'final')
                    flagDone();
            }
            save();
        }
        function hit(a: Actor, damage: number, ignoreShield = false, heavy = false, playerHit = false) {
            if (a.hp <= 0)
                return;
            if (a.id === 'training') {
                const actual = Math.min(a.hp, damage);
                values['training:damage'] = (values['training:damage'] ?? 0) + actual;
                values['training:hits'] = (values['training:hits'] ?? 0) + 1;
                const c = resolveCombo({ frozen: time < a.frozen, rooted: time < a.rooted, marked: time < a.marked, path: useFrontierStore.getState().path, heavy });
                if (playerHit && c) {
                    values['training:combos'] = (values['training:combos'] ?? 0) + 1;
                    a.frozen = a.rooted = a.marked = 0;
                    damage *= c.multiplier;
                }
                const front = Math.sin(a.mesh.rotation.y) * (player.group.position.x - a.mesh.position.x) + Math.cos(a.mesh.rotation.y) * (player.group.position.z - a.mesh.position.z) > 0;
                const actualHit = a.s.behaviour === 'shield' && !ignoreShield ? shieldDamage(damage, front, false) : damage;
                values['training:damage'] = (values['training:damage'] ?? 0) - actual + actualHit;
                a.hp = a.maxHp;
                impact(a, actualHit, c ? 'combo' : heavy ? 'heavy' : 'hit');
                return;
            }
            const mini = MINIBOSSES.find(m => m.id === a.id);
            if (mini) {
                const count = mini.mechanic === 'salt' ? 2 : 3;
                if ((mini.mechanic === 'crystals' || mini.mechanic === 'tracks' || mini.mechanic === 'salt') && !Array.from({ length: count }, (_, i) => values[mini.id + ':' + i]).every(Boolean)) {
                    say(mini.hint);
                    return;
                }
                if (mini.mechanic === 'dodge' && time >= a.recover) {
                    say(mini.hint);
                    return;
                }
            }
            if (a.s.id === 'boss-final' && a.move?.shape === 'guard' && a.tell && heavy) {
                a.tell = 0;
                a.warning.visible = false;
                if (a.line)
                    a.line.visible = false;
                a.recover = time + 6;
                a.cooldown = time + 4;
                a.turn++;
                values['turn:' + a.id] = a.turn;
                damage *= 1.5;
                say('Protiútok prolomil postoj Paměti.');
            }
            if (a.id === 'dungeon-boss') {
                if (regionId === 'koreny' && !puzzleSolved([values.lens0 ?? 0, values.lens1 ?? 0, values.lens2 ?? 0], [1, 2, 3])) {
                    say('Jádro chrání světla. Nejdříve nasměruj všechny tři čočky.');
                    return;
                }
                if (regionId === 'vodarna' && (values.valveOrder ?? 0) < 3) {
                    say('Jádro je pod vodou. Otevři ventily 1 → 3 → 2.');
                    return;
                }
                if (regionId === 'archiv' && time > (values.exposedUntil ?? 0)) {
                    say('Archiváře chrání odrazy. Aktivuj zlatý maják.');
                    return;
                }
            }
            let combined = false;
            if (playerHit) {
                const combo = resolveCombo({ frozen: time < a.frozen, rooted: time < a.rooted, marked: time < a.marked, path: useFrontierStore.getState().path, heavy });
                if (combo) {
                    damage *= combo.multiplier;
                    combined = true;
                    if (combo.kind === 'shatter')
                        a.frozen = 0;
                    if (combo.kind === 'pierce')
                        a.rooted = 0;
                    if (combo.kind === 'reveal')
                        a.marked = 0;
                    challenge('kombo');
                    say('KOMBO · ' + COMBO_NAMES[combo.kind]);
                }
            }
            if (heavy && a.tell && (a.s.behaviour === 'healer' || a.s.behaviour === 'summoner')) {
                a.tell = 0;
                a.warning.visible = false;
                a.cooldown = time + 3;
                challenge('preruseni');
            }
            const dx = player.group.position.x - a.mesh.position.x, dz = player.group.position.z - a.mesh.position.z, front = Math.sin(a.mesh.rotation.y) * dx + Math.cos(a.mesh.rotation.y) * dz > 0;
            const amount = a.s.behaviour === 'shield' && !ignoreShield ? shieldDamage(damage, front, time < a.recover) : damage;
            a.hp = Math.max(0, a.hp - amount);
            impact(a, amount, combined ? 'combo' : amount < damage ? 'clang' : heavy ? 'heavy' : 'hit');
            if (heavy && !a.s.boss && !mini) {
                const d = new T.Vector2(a.mesh.position.x - player.group.position.x, a.mesh.position.z - player.group.position.z).normalize();
                const next = { x: a.mesh.position.x + d.x * .45, z: a.mesh.position.z + d.y * .45 };
                if (withinWorld(next, dungeon) && !blocked(next, boxes))
                    a.mesh.position.set(next.x, 0, next.z);
            }
            const flash = ring('#f3dd9e', a.s.boss ? 1.7 : .7);
            flash.position.copy(a.mesh.position);
            flash.position.y = .1;
            scene.add(flash);
            effects.push({ mesh: flash, until: time + .25 });
            if (a.hp <= 0)
                kill(a);
        }
        function damagePlayer(damage: number) {
            if (damage <= 0 || hp <= 0 || time < dodgeUntil)
                return;
            const s = useFrontierStore.getState(), armor = equipmentStats(s).armor + (s.choices.dohoda === 'ochrana' ? 2 : 0);
            const protectedByKael = useBuddyWorldStore.getState().level >= 20 && s.choices.druzina === 'spolu' && s.choices.kael !== 'cil' && distance(player.group.position, ally.group.position) < 3;
            hp = Math.max(0, hp - incomingDamage(damage * (protectedByKael ? .8 : 1), armor, useAdventureStore.getState().difficulty === 'pribehova', time < shieldUntil));
            if (hp <= 0) {
                controls.current.x = controls.current.z = 0;
                controls.current.held = false;
                say('Buddy tě chrání. Vrať se na bezpečný checkpoint.');
                save();
            }
        }
        const nearestEnemy = () => actors.filter(a => a.hp > 0 && a.mesh.visible && distance(player.group.position, a.mesh.position) < 14).sort((a, b) => distance(player.group.position, a.mesh.position) - distance(player.group.position, b.mesh.position))[0] ?? null;
        function projectile(a: Actor) { const delta = new T.Vector2(a.aim.x - a.mesh.position.x, a.aim.z - a.mesh.position.z).normalize(); const m = mesh(scene, new T.SphereGeometry(.16, 6, 4), '#dfa3b5', a.mesh.position.x, 1, a.mesh.position.z); projectiles.push({ mesh: m, x: m.position.x, z: m.position.z, dx: delta.x * 6, dz: delta.y * 6, age: 0, damage: a.id === 'training' ? 0 : a.s.damage, training: a.id === 'training' }); }
        function castBuddy(power = 1) {
            const st = useFrontierStore.getState(), mod = buddyDevelopment(mascot, st.choices, st.bond), nearby = actors.filter(a => a.hp > 0 && a.mesh.visible && distance(player.group.position, a.mesh.position) < 10).sort((a, b) => distance(player.group.position, a.mesh.position) - distance(player.group.position, b.mesh.position));
            // Buddy follows the player's selected target when it is in spell range.
            // Moving enemies must not silently redirect a targeted ability elsewhere.
            const selectedIndex = target ? nearby.indexOf(target) : -1;
            if (selectedIndex > 0) nearby.unshift(nearby.splice(selectedIndex, 1)[0]);
            if (mascot === 'moss') {
                hp = Math.min(maxHp, hp + maxHp * (mod === 'dotek' ? .45 : mod === 'zahrada' ? .15 : .3) * power);
                if (mod === 'zahrada')
                    healingZone(4 * power);
            }
            if (mascot === 'frost' && mod === 'krusta')
                shieldUntil = Math.max(shieldUntil, time + 3 * power);
            if (mascot === 'nyx' && regionId === 'archiv')
                values.exposedUntil = Math.max(values.exposedUntil ?? 0, time + (mod === 'lovec' ? 10 : 8) * power);
            let targets = nearby.slice(0, mascot === 'nyx' ? (mod === 'lovec' ? 1 : 3) : mascot === 'moss' ? (mod === 'dotek' ? 1 : 2) : 1);
            if (mascot === 'ember' && mod === 'vybuch' && targets[0])
                targets = nearby.filter(a => distance(a.mesh.position, targets[0].mesh.position) < 3).slice(0, 3);
            for (const a of targets) {
                const damage = mascot === 'nyx' ? (mod === 'lovec' ? 90 : mod === 'ozveny' ? 55 : 70) : mascot === 'ember' ? (mod === 'plamen' ? 40 : mod === 'vybuch' ? 35 : 50) : mascot === 'frost' && mod === 'mraz' ? 35 : 50;
                hit(a, damage * power, true);
                if (mascot === 'ember')
                    a.burn = Math.max(a.burn, time + (mod === 'plamen' ? 8 : mod === 'vybuch' ? 2 : 4) * power);
                if (mascot === 'frost') {
                    a.slow = Math.max(a.slow, time + (mod === 'mraz' ? 6 : 5) * power);
                    if (mod !== 'krusta')
                        a.frozen = Math.max(a.frozen, time + (mod === 'mraz' ? 6 : 4) * power);
                }
                if (mascot === 'moss')
                    a.rooted = Math.max(a.rooted, time + (mod === 'dotek' ? 2 : 4) * power);
                if (mascot === 'nyx')
                    a.marked = Math.max(a.marked, time + (mod === 'lovec' ? 6 : mod === 'ozveny' ? 4 : 5) * power);
            }
            if (mascot === 'ember' && distance(player.group.position, oil.position) < 10) {
                values.oilUntil = Math.max(values.oilUntil ?? 0, time + 5 * power);
                for (const a of actors.filter(a => a.id !== 'training' && a.hp > 0 && distance(a.mesh.position, oil.position) < 3)) {
                    a.burn = Math.max(a.burn, time + 5 * power);
                    hit(a, 65 * power, true);
                    challenge('kombo');
                }
                say('Ember zapálil olej. Plameny trvají 5 s.');
            }
            else
                say(mascot === 'moss' ? 'Moss léčí a poutá kořeny · použij průbojný výstřel.' : mascot === 'frost' && mod !== 'krusta' ? 'Frost zmrazil cíl · použij schopnost 1.' : mascot === 'frost' ? 'Frost tě chrání ledovou krustou.' : mascot === 'nyx' ? 'Nyx odhalil pravý cíl · další zásah bude silnější.' : 'Ember zapálil cíl. Olej zesílí jeho oheň.');
            cue('buddy');
        }
        function action(kind: Action) {
            if (hp <= 0)
                return;
            const state = useFrontierStore.getState(), p = PATHS[state.path], stats = equipmentStats(state);
            if (kind === 'target') {
                const candidates = actors.filter(a => a.hp > 0 && a.mesh.visible && distance(player.group.position, a.mesh.position) < 18);
                target = candidates[(candidates.indexOf(target!) + 1) % Math.max(1, candidates.length)] ?? null;
                return;
            }
            if (kind === 'dodge') {
                const ds = dodgeState(time, dodgeCooldown, secondDodgeUntil, state.equipped.boots === 'dvojkrok');
                if (!ds.allowed)
                    return;
                secondDodgeUntil = ds.secondUntil;
                dodgeCooldown = ds.next - (state.equipped.boots === 'boty' ? .5 : 0);
                const v = new T.Vector2(controls.current.x, -controls.current.z);
                if (v.length() < .1)
                    v.set(-Math.sin(player.group.rotation.y), -Math.cos(player.group.rotation.y));
                v.normalize();
                dash = { x: v.x, z: v.y };
                dodgeUntil = time + .34;
                bonusStrike = true;
                for (const a of actors.filter(a => a.id === 'mini-rytir' && distance(a.mesh.position, player.group.position) < 6))
                    a.recover = time + 2;
                if (state.equipped.weapon === 'stopa')
                    healingZone(4);
                cue('defend');
                return;
            }
            if (kind === 'potion') {
                if (potions > 0 && hp < maxHp) {
                    hp = Math.min(maxHp, hp + maxHp * .55);
                    potions--;
                    say('Cestovní lektvar obnovil zdraví. Doplníš jej u odpočinku.');
                    save();
                }
                return;
            }
            if (kind === 'attack' && time - lastAttack > .55) {
                target = target?.hp ? target : nearestEnemy();
                if (!target) {
                    say('V dosahu není nepřítel.');
                    return;
                }
                const range = p.range + (state.equipped.weapon === 'luk' && state.path === 'stopar' ? 2 : 0);
                if (distance(player.group.position, target.mesh.position) > range) {
                    say('Přibliž se k označenému cíli.');
                    return;
                }
                values['last:heavy'] = 0;
                values['last:x'] = player.group.position.x + 40;
                values['last:z'] = player.group.position.z + 40;
                lastAttack = time;
                attackPose = time + .3;
                const base = 18 + useBuddyWorldStore.getState().level * .9 + stats.attack;
                hit(target, Math.round(base * (bonusStrike && state.equipped.weapon === 'mec' ? 1.5 : 1)), false, false, true);
                const split = state.path === 'stopar' ? (state.equipped.weapon === 'rozstep' ? 2 : specialization(state.path, state.choices) === 'salva' ? 1 : 0) : 0;
                for (const other of actors.filter(a => a !== target && a.hp > 0 && distance(a.mesh.position, target!.mesh.position) < 4).slice(0, split))
                    hit(other, base * .4, false, false, true);
                bonusStrike = false;
                cue('attack');
                if (range > 3) {
                    const line = new T.Line(new T.BufferGeometry().setFromPoints([player.group.position.clone().add(new T.Vector3(0, 1, 0)), target.mesh.position.clone().add(new T.Vector3(0, 1, 0))]), new T.LineBasicMaterial({ color: p.color }));
                    scene.add(line);
                    effects.push({ mesh: line, until: time + .15 });
                }
                return;
            }
            if (kind === 'skill1' && time > skill1CD) {
                skill1CD = time + 7;
                values['last:heavy'] = 1;
                values['last:x'] = player.group.position.x + 40;
                values['last:z'] = player.group.position.z + 40;
                let mechanismsChanged = false;
                for (const m of MINIBOSSES.filter(m => m.region === regionId && m.mechanic === 'crystals'))
                    for (let i = 0; i < 3; i++) {
                        const point = { x: m.at[0] + (i - 1) * 3, z: m.at[1] + 4 + (i % 2) * 2 };
                        if (distance(player.group.position, point) < 4 && !values[m.id + ':' + i]) {
                            values[m.id + ':' + i] = 1;
                            mechanismsChanged = true;
                        }
                    }
                if (mechanismsChanged) { configure(); save(); }
                if (regionId === 'koreny' && values['boss:roots'] && distance(player.group.position, { x: 0, z: -22 }) < 4) {
                    values['boss:rootCut'] = 1;
                    configure();
                }
                const spec = specialization(state.path, state.choices);
                for (const a of actors.filter(a => a.hp > 0 && a.mesh.visible && distance(player.group.position, a.mesh.position) < (state.path === 'ochrance' ? 4 : 10))) {
                    hit(a, Math.round((30 + stats.attack + useBuddyWorldStore.getState().level) * 1.7 * (spec === 'bourac' ? 1.25 : 1)), true, true, true);
                    if (spec === 'boure') {
                        a.slow = time + 3;
                        if (a.tell) {
                            a.tell = 0;
                            a.warning.visible = false;
                            a.cooldown = time + 3;
                        }
                    }
                }
                cue('attack');
                return;
            }
            if (kind === 'skill2' && time > skill2CD) {
                const spec = specialization(state.path, state.choices);
                skill2CD = time + (spec === 'lovec' ? 9 : 12);
                if (state.path === 'ochrance')
                    shieldUntil = time + (spec === 'bastion' ? 6 : 4);
                else if (state.path === 'stopar')
                    for (const a of actors.filter(a => a.hp > 0 && a.mesh.visible && distance(player.group.position, a.mesh.position) < 9)) {
                        a.slow = time + 5;
                        if (spec === 'lovec')
                            a.rooted = time + 3;
                    }
                else {
                    hp = Math.min(maxHp, hp + maxHp * (state.equipped.weapon === 'hul' ? .45 : .35));
                    if (spec === 'pecovatel')
                        healingZone(5);
                }
                say(p.skill2);
                cue('defend');
                return;
            }
            if (kind === 'buddy' && time > buddyCD) {
                buddyCD = time + (state.equipped.charm === 'amulet' ? 10 : buddyDevelopment(mascot, state.choices, state.bond) === 'ozveny' ? 12 : 14);
                castBuddy();
                if (state.equipped.charm === 'echo')
                    buddyEchoAt = time + 1;
                return;
            }
            if (kind === 'interact')
                interact();
        }
        function interact() {
            if (time < interactCD)
                return;
            interactCD = time + .35;
            const n = nodes.filter(n => distance(player.group.position, n) < 2.5).sort((a, b) => distance(player.group.position, a) - distance(player.group.position, b))[0];
            if (!n) {
                say('Přibliž se ke zlaté nebo fialové značce.');
                return;
            }
            const s = useFrontierStore.getState(), q = STORY[s.mission];
            if (n.side === 'v44') {
                interactContinuation(n);
                return;
            }
            if (n.side === 'v43') {
                interactExpansion(n);
                return;
            }
            if (n.side) {
                const id = n.side;
                if (id === 'taska') {
                    if (!s.facts.includes('side:taska:found')) {
                        s.flag('side:taska:found');
                        say('Brašna nalezena. Vrať ji obchodníkovi u studny.');
                    }
                    else
                        say('Obchodník čeká u studny.');
                    return;
                }
                if (id === 'ryba') {
                    values.fishStart = performance.now() / 1000;
                    prompt({ title: 'Rybaření u mola', text: 'Zatáhni, když je ukazatel v zeleném pásmu.', options: ['Zatáhnout', 'Nechat na později'], kind: 'fish' });
                    return;
                }
                if (id === 'recept') {
                    prompt({ title: 'Polévka vzpomínek', text: 'Pořadí: voda → byliny → houby. Hotovo: ' + (values.cook ?? 0) + '/3.', options: ['Voda', 'Byliny', 'Houby', 'Zavřít'], kind: 'cook' });
                    return;
                }
                if (id === 'milosrdny') {
                    prompt({ title: 'Kámen se srdcem', text: 'Tvor se bojí vlastních trhlin. Můžeš mu pomoci zůstat, nebo uvolnit jeho světlo.', options: ['Uklidnit tvora', 'Osvobodit jádro'], kind: 'mercy' });
                    return;
                }
                if (id === 'beh') {
                    values.raceStart = time;
                    values.raceProgress = 0;
                    configure();
                    say('Závod začal: nejprve severovýchodní značka, pak severozápad, nakonec domů.');
                    return;
                }
                if (id === 'poklad') {
                    values.treasureProgress ??= 0;
                    say('Mapa: půlměsíc na východě, hvězda na severu, slunce na západě.');
                    return;
                }
            }
            if (n.id === 'exit') {
                save();
                s.travel(r.parent ?? 'udoli');
                return;
            }
            if (dungeon) {
                if (regionId === 'koreny') {
                    values['lens' + n.index] = ((values['lens' + n.index] ?? 0) + 1) % 4;
                    say(`Čočka ${n.index + 1}: ${values['lens' + n.index]}/3.`);
                }
                if (regionId === 'vodarna') {
                    values.valveOrder = advanceSequence(values.valveOrder ?? 0, n.index, [0, 2, 1]);
                    say(`Ventily: ${values.valveOrder}/3 správně. Pořadí je 1 → 3 → 2.`);
                }
                if (regionId === 'archiv') {
                    if (n.index < 2) {
                        values['mural' + n.index] = 1;
                        say('Záznam přečten. Další brána se otevřela.');
                    }
                    else {
                        values.exposedUntil = time + 12;
                        say('Zlatý maják odhaluje skutečného Archiváře na 12 sekund.');
                        for (const a of actors.filter(a => a.id.startsWith('reflection')))
                            if (a.hp > 0) {
                                a.hp = 0;
                                a.mesh.visible = false;
                            }
                        if (!values.reflections) {
                            spawn('reflection1', 'prizrak', -7, -24, true);
                            spawn('reflection2', 'prizrak', 7, -24, true);
                            values.reflections = 1;
                        }
                    }
                }
                save();
                return;
            }
            if (!q || q.region !== regionId || s.facts.includes(q.id + ':done'))
                return;
            const key = q.id + ':progress';
            if (['trail', 'sequence', 'fresco', 'ritual'].includes(q.mechanic)) {
                const order = q.mechanic === 'ritual' ? [0, 1, 2, 3] : [0, 1, 2];
                values[key] = advanceSequence(values[key] ?? 0, n.index, order);
                say(`${values[key]}/${order.length} · ${q.goal}`);
                if (values[key] === order.length)
                    flagDone();
            }
            else if (q.mechanic === 'valves' || q.mechanic === 'mirror') {
                const desired = q.mechanic === 'valves' ? [1, 2, 0] : [2, 0, 1];
                if (n.index === 9) {
                    if (puzzleSolved([values[q.id + ':0'] ?? 0, values[q.id + ':1'] ?? 0, values[q.id + ':2'] ?? 0], desired))
                        flagDone();
                    else
                        say('Paprsky / proudy ještě nesměřují správně. ' + q.goal);
                }
                else {
                    values[q.id + ':' + n.index] = ((values[q.id + ':' + n.index] ?? 0) + 1) % 3;
                    say(`${n.name}: ${values[q.id + ':' + n.index]}. Cíl ${desired.join(' / ')}.`);
                }
            }
            else if (q.mechanic === 'choice')
                prompt({ title: q.name, text: q.story, options: q.id === 'pristresek' ? ['Dílna · levnější vylepšení v příběhu', 'Útulek · přátelství s poslem'] : ['Zásoby obchodníků · 30 stříbra', 'Ochrana strážců · +2 obrana'], kind: 'choice' });
            else if (q.mechanic === 'talk' || q.mechanic === 'finale')
                prompt({ title: q.name, text: q.story, options: [q.mechanic === 'finale' ? 'Uzavřít příběh' : 'Vydat se po stopách'], kind: 'story' });
            else if (q.mechanic === 'restore') {
                s.flag('garden');
                flagDone();
            }
            else if (q.mechanic === 'rescue') {
                if (actors.filter(a => a.id === 'cage1' || a.id === 'cage2').some(a => a.hp > 0))
                    say('Nejprve zastav hlídače klece.');
                else {
                    s.flag('sprite');
                    flagDone();
                }
            }
            else if (q.mechanic === 'defend') {
                if (!values[q.id + ':wave'])
                    startWave(q.id, 1);
                else
                    say('Dokonči právě probíhající obranu.');
            }
            else if (q.mechanic === 'escort') {
                values[q.id + ':started'] = 1;
                say('Obchodník jde za tebou. Cíl je studna.');
            }
            else if (q.mechanic === 'tow') {
                values[q.id + ':started'] = 1;
                say('Lano je připojené. Projdi značkami v pořadí.');
            }
            else if (q.mechanic === 'sneak')
                say('Pohybuj se opatrně přes značky. Odhalení obnoví trasu, ne celý příběh.');
            else if (q.mechanic === 'escape' && n.index === 9) {
                values[q.id + ':start'] = time;
                values[key] = 0;
                say('Chodba se hroutí. Máš 45 sekund.');
            }
            else if (q.mechanic === 'boss')
                say('Strážce čeká před tebou. Sleduj výstražné kruhy.');
            save();
        }
        function startWave(id: string, wave: number) {
            values[id + ':wave'] = wave;
            for (let i = 0; i < 3; i++)
                spawn(`${id}:wave${wave}:${i}`, regionId === 'udoli' ? 'trnovlk' : i === 0 ? 'korenovec' : 'mura', (wave % 2 ? 1 : -1) * (4 + i * 2), -10 - i, true);
            say('Přichází ' + wave + '. vlna.');
            save();
        }
        function setTraining(mode: number) { values['training:mode'] = mode; let a = actors.find(a => a.id === 'training'); if (!a)
            a = spawn('training', 'korenovec', 14, 18, true); if (!a)
            return; a.s = { ...species('korenovec'), name: mode === 2 ? 'Štítová figurína' : mode === 3 ? 'Střelecká figurína' : 'Cvičná figurína', hp: 1000, behaviour: mode === 2 ? 'shield' : mode === 3 ? 'ranged' : 'hunter', damage: 0 }; a.hp = mode ? 1000 : 0; a.maxHp = 1000; a.mesh.visible = mode > 0; a.frozen = a.rooted = a.marked = a.burn = 0; a.mesh.position.set(14, 0, 18); a.mesh.rotation.y = Math.atan2(player.group.position.x - 14, player.group.position.z - 18); a.cooldown = time + 1; if (!mode && target === a)
            target = null; }
        function interactContinuation(n: Node) {
            const st = useFrontierStore.getState();
            if (n.id === 'training') {
                prompt({ title: 'Tréninkový dvorek', text: 'Zkoušej přímé zásahy, komba, štíty a odrazy. Figurína nepřidává XP, měnu ani výzvy a cvičná střela nezraňuje. Měření: ' + Math.round(values['training:damage'] ?? 0) + ' poškození / ' + (values['training:hits'] ?? 0) + ' zásahů / ' + (values['training:combos'] ?? 0) + ' komb.', options: ['Běžná figurína', 'Štítová figurína', 'Cvičná střela', 'Resetovat měření a schopnosti', 'Ukončit trénink'], kind: 'training' });
                return;
            }
            if (n.id === 'cut-root') {
                values['boss:rootCut'] = 1;
                say('Kořenová hradba se rozestoupila.');
                configure();
                save();
                return;
            }
            if (n.id.startsWith('mini:')) {
                const parts = n.id.split(':');
                values[parts[1] + ':' + parts[2]] = 1;
                say(parts[1] === 'mini-lovec' ? 'Lovcova stopa se rozjasnila.' : 'Ochranný mechanismus je vyřazený.');
                configure();
                save();
                return;
            }
            if (n.id.startsWith('neighbor:')) {
                const id = n.id.slice(9), stage = values['neighbor:' + id] ?? 0;
                const options = id === 'dum' ? (st.choices.pristresek === 'dilna' ? ['Znamení lucerny', 'Znamení listu', 'Později'] : ['U teplého kamene', 'Pod listovým přístřeškem', 'Později']) : id === 'dohoda' ? (st.choices.dohoda === 'ochrana' ? ['Hlídka u brány', 'Hlídka u cesty', 'Později'] : ['Bedny u trhu', 'Sudy u dílny', 'Později']) : ['Květiny pro posla', 'Krystalový keř pro posla', 'Později'];
                prompt({ title: NEIGHBORS.find(x => x.id === id)!.name, text: stage ? 'Tvá volba už má své místo v plánech obyvatel. Společně ji dokončíte a při dalších návratech ji uvidíš ve vesnici.' : neighborText(id, st.choices), options: stage ? ['Dokončit společnou chvíli', 'Později'] : options, kind: 'neighbor:' + id });
                return;
            }
            if (n.id.startsWith('episode:')) {
                const id = n.id.slice(8), e = EPISODES.find(x => x.id === id)!, stage = episodeStage(id, st.choices), part = e.stages[stage];
                if (part.hold && !values['episode:held:' + id]) {
                    say('U této značky podrž E nebo tlačítko Interakce.');
                    return;
                }
                st.flag('v44:proof:episode:' + id + ':' + stage);
                prompt({ title: part.title, text: part.text, options: part.options, kind: 'episode:' + id });
            }
        }
        function chooseContinuation(p: Prompt, index: number) {
            const st = useFrontierStore.getState();
            if (p.kind === 'training') {
                if (index <= 2)
                    setTraining(index + 1);
                if (index === 3) {
                    values['training:damage'] = values['training:hits'] = values['training:combos'] = 0;
                    buddyCD = skill1CD = skill2CD = dodgeCooldown = 0;
                    secondDodgeUntil = 0;
                    buddyEchoAt = 0;
                    say('Měření i schopnosti jsou připravené.');
                }
                if (index === 4)
                    setTraining(0);
                return true;
            }
            if (p.kind.startsWith('neighbor:')) {
                const id = p.kind.slice(9), stage = values['neighbor:' + id] ?? 0;
                if (stage) {
                    if (index === 0) {
                        moment('neighbor:' + id);
                        say('Obyvatelé si společnou chvíli pamatují.');
                    }
                }
                else if (index < 2) {
                    st.choose('neighbor:' + id, String(index));
                    values['neighbor:' + id] = 1;
                    say('Ještě jednou oslov obyvatele a dokonči společnou chvíli.');
                }
                return true;
            }
            if (p.kind.startsWith('episode:')) {
                const id = p.kind.slice(8), e = EPISODES.find(x => x.id === id)!;
                if (index === p.options.length - 1)
                    return true;
                const before = episodeStage(id, st.choices);
                if (st.advanceEpisode(id, index)) {
                    say(episodeStage(id, useFrontierStore.getState().choices) >= e.stages.length ? 'Příběh dokončen. Vzpomínka i odměna se uložily.' : 'Příběh pokračuje. Další místo najdeš v Deníku.');
                    cue('reward');
                    configure();
                }
                else
                    say(id === 'srdce' && before === 1 ? 'Vzpomeň si na své rozhodnutí o kamenném tvorovi.' : 'Přečti si ještě jednou dopis a jeho adresáta.');
                return true;
            }
            return false;
        }
        function continuationTick(dt: number) { const st = useFrontierStore.getState(); if (values['training:mode'] && distance(player.group.position, { x: 11, z: 18 }) > 12)
            setTraining(0); const n = nodes.find(n => n.id.startsWith('episode:') && distance(player.group.position, n) < 2.5 && EPISODES.find(e => 'episode:' + e.id === n.id)?.stages[n.index]?.hold); if (n && controls.current.held) {
            hold += dt;
            if (hold >= 1.2) {
                values['episode:held:' + n.id.slice(8)] = 1;
                hold = 0;
                controls.current.held = false;
                interactContinuation(n);
                save();
            }
        }
        else if (STORY[st.mission]?.mechanic !== 'repair')
            hold = 0; }
        function canDamage(a: Actor) { const mini = MINIBOSSES.find(m => m.id === a.id); if (mini) {
            if (mini.mechanic === 'dodge')
                return time < a.recover;
            const count = mini.mechanic === 'salt' ? 2 : 3;
            return Array.from({ length: count }, (_, i) => values[mini.id + ':' + i]).every(Boolean);
        } if (a.id === 'dungeon-boss') {
            if (regionId === 'koreny')
                return puzzleSolved([values.lens0 ?? 0, values.lens1 ?? 0, values.lens2 ?? 0], [1, 2, 3]);
            if (regionId === 'vodarna')
                return (values.valveOrder ?? 0) >= 3;
            if (regionId === 'archiv')
                return time <= (values.exposedUntil ?? 0);
        } return true; }
        function bossTick(a: Actor, dt: number, gates: {
            x: number;
            z: number;
            w: number;
            d: number;
        }[]) {
            const pos = a.mesh.position, dist = distance(pos, player.group.position), phase = a.hp < a.maxHp * .5 ? 2 : 1;
            if (phase === 2 && values['phase:' + a.id] !== 2) {
                values['phase:' + a.id] = 2;
                if (a.s.id === 'boss-koreny') {
                    values['boss:roots'] = 1;
                    values['boss:rootGap'] = 0;
                    for (let i = 0; i < 3; i++)
                        if (Math.abs(player.group.position.x - (i - 1) * 8) < 3.1 && Math.abs(player.group.position.z + 22) < 1)
                            values['boss:rootGap'] = i + 1;
                    configure();
                }
                say(a.s.name + ' mění způsob boje. Fáze 2.');
                save();
            }
            if (phase === 2 && !a.summons) {
                a.summons = 1;
                for (let i = 0; i < 2; i++)
                    spawn('phase-helper:' + a.id + ':' + i, regionId === 'koreny' ? 'pavouk' : regionId === 'vodarna' ? 'pijavice' : 'prizrak', pos.x + (i ? 4 : -4), pos.z + 2, true);
            }
            if (time < a.frozen) {
                a.tell = 0;
                a.warning.visible = false;
                if (a.line)
                    a.line.visible = false;
                return;
            }
            if (a.burn > time && canDamage(a)) {
                a.hp -= dt * 12;
                if (a.hp <= 0) {
                    kill(a);
                    return;
                }
            }
            if (regionId === 'vodarna' && phase === 2 && !islands.some(m => distance(m.position, player.group.position) < 1.9))
                tryMove(Math.sin(time * .8) * dt * .9, -dt * .65, gates);
            if (!a.tell && dist > 3) {
                const v = new T.Vector2(player.group.position.x - pos.x, player.group.position.z - pos.z).normalize();
                const speed = a.s.speed * (time < a.rooted ? 0 : time < a.slow ? .3 : 1);
                const next = { x: pos.x + v.x * dt * speed, z: pos.z + v.y * dt * speed };
                if (!blocked(next, gates) && withinWorld(next, dungeon))
                    pos.set(next.x, 0, next.z);
                a.mesh.rotation.y = Math.atan2(v.x, v.y);
            }
            const nextMove = bossPattern(a.s.id, phase, a.turn, !!values['last:heavy']);
            const reach = nextMove.shape === 'circle' || nextMove.shape === 'guard' ? nextMove.radius : nextMove.shape === 'islands' ? 11 : nextMove.shape === 'echo' ? 10 : 9;
            if (!a.tell && time > a.cooldown && dist < reach) {
                a.move = nextMove;
                a.tell = time + a.move.windup;
                a.aim = a.move.shape === 'echo' ? { x: (values['last:x'] ?? player.group.position.x + 40) - 40, z: (values['last:z'] ?? player.group.position.z + 40) - 40 } : { x: player.group.position.x, z: player.group.position.z };
                const echo = a.move.shape === 'echo';
                a.warning.position.set(echo ? a.aim.x : pos.x, .07, echo ? a.aim.z : pos.z);
                a.warning.scale.set(a.move.radius / 5, a.move.radius / 5, 1);
                (a.warning.material as T.MeshBasicMaterial).color.set(a.move.shape === 'islands' ? '#69d5cc' : a.move.shape === 'guard' ? '#e5b66a' : '#ef987e');
                a.warning.visible = true;
                if (a.move.shape === 'line') {
                    if (!a.line) {
                        a.line = mesh(scene, new T.PlaneGeometry(2.8, 10), '#dba67f', 0, .065, 0);
                        a.line.rotation.x = -Math.PI / 2;
                        const mat = a.line.material as T.MeshStandardMaterial;
                        mat.transparent = true;
                        mat.opacity = .45;
                        mat.depthWrite = false;
                    }
                    const dx = a.aim.x - pos.x, dz = a.aim.z - pos.z, l = Math.hypot(dx, dz) || 1;
                    a.aim = { x: pos.x + dx / l * 10, z: pos.z + dz / l * 10 };
                    a.line.position.set((pos.x + a.aim.x) / 2, .065, (pos.z + a.aim.z) / 2);
                    a.line.rotation.z = lineTelegraphAngle(pos, a.aim);
                    a.line.visible = true;
                }
                say(a.move.name);
            }
            if (a.tell && time >= a.tell) {
                const move = a.move!;
                a.tell = 0;
                a.warning.visible = false;
                if (a.line)
                    a.line.visible = false;
                const pp = player.group.position, d = distance(pos, pp);
                let hits = false;
                if (move.shape === 'line')
                    hits = inLine(pp, pos, a.aim, 1.4);
                else if (move.shape === 'echo') {
                    hits = distance(pp, a.aim) < move.radius;
                    if (distance(pos, a.aim) < move.radius && canDamage(a)) {
                        hit(a, 90, true);
                        say('Archiváře zasáhla jeho vlastní ozvěna.');
                        if (a.hp <= 0)
                            return;
                    }
                }
                else if (move.shape === 'outer')
                    hits = d > 3 && d < 9;
                else if (move.shape === 'islands')
                    hits = d < 11 && !islands.some(m => distance(m.position, pp) < 1.9);
                else
                    hits = d < move.radius;
                if (hits)
                    damagePlayer(a.s.damage * (phase === 2 ? 1.15 : 1));
                a.recover = time + 1;
                a.cooldown = time + move.cooldown - (phase === 2 ? .3 : 0);
                a.turn++;
                values['turn:' + a.id] = a.turn;
                save();
            }
        }
        function interactExpansion(n: Node) {
            const st = useFrontierStore.getState();
            if (n.id.startsWith('secret:')) {
                const id = n.id.slice(7), secret = SECRETS.find(x => x.id === id)!;
                prompt({ title: secret.name, text: secret.hint + ' Buddy tě dovedl k ukrytému zápisníku. Získáš ' + secret.reward + ' stříbra a jeden střep.', options: ['Prozkoumat úkryt', 'Později'], kind: 'secret:' + id });
                return;
            }
            if (n.id.startsWith('camp:')) {
                prompt({ title: 'Chvíle u táborového ohně', text: (PERSONALITIES[mascot] ?? PERSONALITIES.ember).camp + ' Odpočinek doplní zdraví a lektvary. První společná vzpomínka z této oblasti posílí pouto.', options: ['Zůstat chvíli spolu', 'Jít dál'], kind: 'camp' });
                return;
            }
            if (n.id.startsWith('event:')) {
                const e = EVENTS.find(x => 'event:' + x.id === n.id)!;
                prompt({ title: e.name, text: e.text + ' ' + e.effect, options: e.id === 'trh' ? ['Nástroje', 'Látka', 'Léčiva', 'Později'] : e.id === 'pramen' ? ['Přítok · cíl 1', 'Odtok · cíl 2', 'Potvrdit', 'Později'] : ['Kořen', 'Světlo', 'Domov', 'Později'], kind: 'event:' + e.id });
                return;
            }
            if (n.id === 'route') {
                prompt({ title: 'Každá cesta něco stojí', text: 'Bezpečná cesta: dvě runy místo první brány. Zkratka: rovnou ke strážci se dvěma dalšími hlídači. Záchrana: osvoboď průzkumníka a otevře se komora. Zkouška: volitelné dvě vlny za dva střepy navíc. Příběhové odměny zůstávají stejné.', options: ['Bezpečná cesta', 'Nebezpečná zkratka', 'Zachránit průzkumníka', 'Nepovinná zkouška', 'Rozhodnout později'], kind: 'route' });
                return;
            }
            if (n.id === 'safe0' || n.id === 'safe1') {
                values['route:runes'] = advanceSequence(values['route:runes'] ?? 0, n.index, [0, 1]);
                if (values['route:runes'] === 2) {
                    values['route:safe1'] = 1;
                    if (st.facts.includes('v43:reward:event:posel'))
                        values['route:safe2'] = 1;
                    say('Runy otevřely cestu.');
                    configure();
                }
                else
                    say('Runa listu → runa slunce.');
                save();
                return;
            }
            if (n.id === 'prisoner') {
                if (actors.some(a => a.id === 'route-guard' && a.hp > 0)) {
                    say('Nejprve odveď pozornost hlídače.');
                    return;
                }
                values['route:rescued'] = 1;
                say('Průzkumník označil komoru na východě poslední síně.');
                configure();
                save();
                return;
            }
            if (n.id === 'cache') {
                discovery('cache:' + regionId);
                configure();
                return;
            }
            if (n.id === 'trial') {
                if (!values['trial:wave']) {
                    values['trial:wave'] = 1;
                    trialWave(1);
                }
                else
                    say('Nejprve dokonči právě probíhající vlnu.');
                save();
                return;
            }
            if (n.id.startsWith('arena:')) {
                const obj = arenaObjects.find(a => 'arena:' + a.id === n.id)!;
                values[n.id] = 1;
                obj.mesh.visible = false;
                let count = 0;
                for (const a of actors.filter(a => a.hp > 0 && distance(a.mesh.position, obj) < (obj.kind === 'floor' ? 4 : 6))) {
                    hit(a, obj.kind === 'weight' ? 180 : 120, true);
                    a.slow = time + 4;
                    count++;
                }
                if (count)
                    challenge('arena');
                say(count ? 'Mechanismus zasáhl ' + count + ' nepřátel.' : 'Mechanismus se spustil. Příště sem nejprve přilákej nepřítele.');
                configure();
                save();
            }
        }
        function trialWave(wave: number) {
            for (let i = 0; i < 3; i++)
                spawn('trial:' + wave + ':' + i, regionId === 'koreny' ? 'pavouk' : regionId === 'vodarna' ? 'pijavice' : 'prizrak', -7 + i * 3, -23, true);
            say('Zkouška · vlna ' + wave + '/2.');
        }
        function chooseExpansion(p: Prompt, index: number) {
            const st = useFrontierStore.getState();
            if (p.kind.startsWith('secret:')) {
                if (index === 0)
                    discovery(p.kind);
                configure();
                return true;
            }
            if (p.kind === 'camp') {
                if (index === 0) {
                    hp = maxHp;
                    potions = 3;
                    discovery('camp:' + regionId);
                    st.choose('gesture', 'odpocinek');
                    say('Nová vzpomínka: ' + getRegion(regionId).name + '.');
                }
                return true;
            }
            if (p.kind === 'route') {
                if (index > 3)
                    return true;
                values['route:chosen'] = index + 1;
                if (index === 1) {
                    values['route:shortcut'] = 1;
                    if (regionId === 'koreny') {
                        values.lens0 = 1;
                        values.lens1 = 2;
                        values.lens2 = 3;
                    }
                    if (regionId === 'vodarna')
                        values.valveOrder = 3;
                    if (regionId === 'archiv') {
                        values.mural0 = 1;
                        values.mural1 = 1;
                        values.exposedUntil = time + 15;
                    }
                    player.group.position.set(0, 0, -20);
                    spawn('shortcut:0', 'korenovec', -3, -23, true);
                    spawn('shortcut:1', 'korenovec', 3, -23, true);
                }
                if (index === 2)
                    spawn('route-guard', regionId === 'koreny' ? 'korenovec' : regionId === 'vodarna' ? 'krab' : 'rytir', 11, -10, true);
                configure();
                return true;
            }
            if (p.kind.startsWith('event:')) {
                const id = p.kind.slice(6);
                if (index === 3)
                    return true;
                if (id === 'pramen') {
                    if (index < 2)
                        values['event:pramen:' + index] = ((values['event:pramen:' + index] ?? 0) + 1) % 3;
                    else if (puzzleSolved([values['event:pramen:0'] ?? 0, values['event:pramen:1'] ?? 0], [1, 2]))
                        discovery(p.kind);
                    else
                        say('Přítok musí ukazovat 1, odtok 2.');
                    if (index < 2)
                        say('Přítok ' + (values['event:pramen:0'] ?? 0) + ' / odtok ' + (values['event:pramen:1'] ?? 0) + '.');
                }
                else {
                    values['event:' + id] = advanceSequence(values['event:' + id] ?? 0, index, [0, 1, 2]);
                    if (values['event:' + id] === 3)
                        discovery(p.kind);
                    else
                        say('Správně ' + values['event:' + id] + '/3. Znovu oslov účastníka události.');
                }
                configure();
                return true;
            }
            return false;
        }
        function choose(index: number) {
            const p = pendingPrompt;
            if (!p)
                return;
            pendingPrompt = null;
            interactCD = 0;
            promptRef.current(null);
            const s = useFrontierStore.getState(), q = STORY[s.mission];
            if (chooseContinuation(p, index)) {
                save();
                return;
            }
            if (chooseExpansion(p, index)) {
                save();
                return;
            }
            if (p.kind === 'story')
                flagDone();
            if (p.kind === 'choice' && q) {
                s.choose(q.id, q.id === 'pristresek' ? (index === 0 ? 'dilna' : 'utulek') : (index === 0 ? 'zasoby' : 'ochrana'));
                if (q.id === 'dohoda' && index === 0)
                    useFrontierStore.setState({ gold: s.gold + 30 });
                flagDone();
            }
            if (p.kind === 'mercy') {
                s.choose('kamen', index === 0 ? 'klid' : 'svetlo');
                sideDone('milosrdny');
            }
            if (p.kind === 'cook' && index < 3) {
                const next = advanceSequence(values.cook ?? 0, index, [0, 1, 2]);
                values.cook = next;
                if (next === 3)
                    sideDone('recept');
                else
                    prompt({ title: 'Polévka vzpomínek', text: `Hotovo ${next}/3. Pořadí voda → byliny → houby.`, options: ['Voda', 'Byliny', 'Houby', 'Zavřít'], kind: 'cook' });
            }
            if (p.kind === 'fish' && index === 0) {
                const phase = ((performance.now() / 1000 - (values.fishStart ?? 0)) % 2) / 2;
                if (phase >= .38 && phase <= .68)
                    sideDone('ryba');
                else
                    say('Ryba unikla. Zkus znovu nahodit u mola.');
            }
            save();
        }
        const keys = new Set<string>();
        function keydown(e: KeyboardEvent) {
            if (e.target instanceof HTMLElement && e.target.closest('input,select,textarea'))
                return;
            if (e.target instanceof HTMLButtonElement && ['Space', 'Enter'].includes(e.code))
                return;
            if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'ShiftLeft', 'ShiftRight', 'KeyQ', 'KeyE', 'KeyR', 'Digit1', 'Digit2', 'Tab'].includes(e.code))
                e.preventDefault();
            if (pausedRef.current || pendingPrompt)
                return;
            keys.add(e.code);
            if (e.repeat)
                return;
            const map: Record<string, Action> = { Space: 'attack', ShiftLeft: 'dodge', ShiftRight: 'dodge', KeyQ: 'buddy', KeyE: 'interact', KeyR: 'potion', Digit1: 'skill1', Digit2: 'skill2', Tab: 'target' };
            if (e.code === 'KeyE')
                controls.current.held = true;
            if (map[e.code])
                controls.current.actions.push(map[e.code]);
        }
        const keyup = (e: KeyboardEvent) => {
            keys.delete(e.code);
            if (e.code === 'KeyE')
                controls.current.held = false;
        };
        const blur = () => { keys.clear(); controls.current.held = false; controls.current.x = controls.current.z = 0; save(); };
        window.addEventListener('keydown', keydown);
        window.addEventListener('keyup', keyup);
        window.addEventListener('blur', blur);
        const resize = () => { const w = container.clientWidth, h = container.clientHeight; renderer.setSize(w, h); camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix(); };
        const observer = new ResizeObserver(resize);
        observer.observe(container);
        resize();
        let drag: {
            x: number;
            id: number;
        } | null = null;
        const down = (e: PointerEvent) => { drag = { x: e.clientX, id: e.pointerId }; renderer.domElement.setPointerCapture(e.pointerId); };
        const move = (e: PointerEvent) => {
            if (drag?.id === e.pointerId) {
                cameraAngle -= (e.clientX - drag.x) * .007;
                drag.x = e.clientX;
            }
        };
        const up = () => { drag = null; };
        const wheel = (e: WheelEvent) => { e.preventDefault(); zoom = T.MathUtils.clamp(zoom + e.deltaY * .0008, .7, 1.4); };
        renderer.domElement.addEventListener('pointerdown', down);
        renderer.domElement.addEventListener('pointermove', move);
        renderer.domElement.addEventListener('pointerup', up);
        renderer.domElement.addEventListener('pointercancel', up);
        renderer.domElement.addEventListener('wheel', wheel, { passive: false });
        function tryMove(dx: number, dz: number, obstacles = boxes) {
            const position = player.group.position;
            const nextX = { x: position.x + dx, z: position.z }, nextZ = { x: position.x, z: position.z + dz };
            if (withinWorld(nextX, dungeon) && !blocked(nextX, obstacles))
                position.x = nextX.x;
            if (withinWorld(nextZ, dungeon) && !blocked({ x: position.x, z: nextZ.z }, obstacles))
                position.z = nextZ.z;
        }
        function missionTick(dt: number) {
            const s = useFrontierStore.getState(), q = STORY[s.mission];
            if (!q || q.region !== regionId || s.facts.includes(q.id + ':done'))
                return;
            const key = q.id + ':progress', pos = player.group.position;
            if (q.mechanic === 'repair') {
                const n = nodes.find(n => !n.side && distance(pos, n) < 2.5 && (values['fixed:' + n.id] ?? 0) < 1);
                if (n && controls.current.held) {
                    hold += dt;
                    if (hold >= 1.2) {
                        values['fixed:' + n.id] = 1;
                        n.mesh.visible = false;
                        hold = 0;
                        say('Podpěra opravena.');
                        if (nodes.filter(n => !n.side).every(n => values['fixed:' + n.id]))
                            flagDone();
                        save();
                    }
                }
                else
                    hold = 0;
            }
            if (q.mechanic === 'tow' && values[q.id + ':started']) {
                const desired = new T.Vector3(pos.x, .08, pos.z + 1.7);
                boat.position.lerp(desired, Math.min(1, dt * 2));
                values['boat:x'] = boat.position.x;
                values['boat:z'] = boat.position.z;
            }
            if (q.mechanic === 'escort' && values[q.id + ':started']) {
                const mp = merchant.group.position;
                const ambush = actors.filter(a => a.id.startsWith('ambush') && a.hp > 0);
                if (!values.ambush && mp.z > -5) {
                    values.ambush = 1;
                    spawn('ambush0', 'trnovlk', mp.x + 4, mp.z - 2, true);
                    spawn('ambush1', 'ostnatec', mp.x - 4, mp.z, true);
                }
                if (!ambush.length && distance(mp, pos) > 1.8 && distance(mp, pos) < 12) {
                    const v = new T.Vector3().subVectors(pos, mp);
                    v.y = 0;
                    v.normalize();
                    mp.addScaledVector(v, dt * 3.5);
                    merchant.group.rotation.y = Math.atan2(v.x, v.z);
                    merchant.animate(time * 7, true);
                }
                values[q.id + ':x'] = mp.x;
                values[q.id + ':z'] = mp.z;
                if (distance(mp, { x: 0, z: 5 }) < 3 && values.ambush && !actors.some(a => a.id.startsWith('ambush') && a.hp > 0))
                    flagDone();
            }
            if (q.mechanic === 'defend') {
                const wave = values[q.id + ':wave'] ?? 0;
                if (wave && wave <= 2 && !actors.some(a => a.id.startsWith(q.id + ':wave' + wave) && a.hp > 0)) {
                    if (wave === 2) {
                        values[q.id + ':wave'] = 3;
                        flagDone();
                    }
                    else
                        startWave(q.id, 2);
                }
            }
            if (q.mechanic === 'sneak' || q.mechanic === 'tow' || q.mechanic === 'escape') {
                let progress = values[key] ?? 0;
                const n = nodes.find(n => !n.side && n.index === progress);
                if (q.mechanic === 'sneak' && actors.some(a => a.hp > 0 && distance(a.mesh.position, pos) < 3)) {
                    values[key] = 0;
                    say('Hlídka tě zahlédla. Vrať se k první značce.');
                }
                else if (n && distance(pos, n) < 1.5 && (q.mechanic === 'sneak' || q.mechanic === 'tow' && values[q.id + ':started'] || q.mechanic === 'escape' && values[q.id + ':start'])) {
                    values[key] = ++progress;
                    say(`Bezpečný bod ${progress}/3.`);
                    if (progress === 3)
                        flagDone();
                }
                if (q.mechanic === 'escape' && values[q.id + ':start'] && time - values[q.id + ':start'] > 45) {
                    delete values[q.id + ':start'];
                    values[key] = 0;
                    player.group.position.set(q.at[0], 0, q.at[1] + 2);
                    say('Chodba se uzavřela. Buddy našel návrat k bezpečné bráně. Zkus únik znovu.');
                }
            }
        }
        function sideTick() {
            const s = useFrontierStore.getState(), pos = player.group.position;
            if (regionId === 'udoli' && s.facts.includes('side:taska:found') && !s.side.includes('taska') && distance(pos, { x: 0, z: 5 }) < 2.5)
                sideDone('taska');
            if (regionId === 'les' && values.raceStart && !s.side.includes('beh')) {
                if (time - values.raceStart > 30) {
                    values.raceStart = 0;
                    say('Závod skončil. Posel nabídne nový pokus.');
                }
                else {
                    const points = [[10, -8], [-8, -7], [10, 10]], n = points[values.raceProgress ?? 0];
                    if (n && distance(pos, { x: n[0], z: n[1] }) < 2) {
                        values.raceProgress = (values.raceProgress ?? 0) + 1;
                        say(`Závod ${values.raceProgress}/3.`);
                        if (values.raceProgress === 3) {
                            values.raceStart = 0;
                            sideDone('beh');
                        }
                    }
                }
            }
            if (regionId === 'ruiny' && !s.side.includes('poklad')) {
                const pts = [[15, -3], [8, -18], [-12, 4]], progress = values.treasureProgress ?? 0, n = pts[progress];
                if (n && distance(pos, { x: n[0], z: n[1] }) < 2) {
                    values.treasureProgress = progress + 1;
                    say(`Značka pokladu ${progress + 1}/3 nalezena.`);
                    if (progress === 2)
                        sideDone('poklad');
                }
            }
        }
        const opticalLines: T.Line[] = [];
        for (let i = 0; i < 3; i++) {
            const l = new T.Line(new T.BufferGeometry(), new T.LineBasicMaterial({ color: '#f3d98d' }));
            l.visible = false;
            scene.add(l);
            opticalLines.push(l);
        }
        let previous = performance.now();
        configure();
        ready = true;
        // Restore phase reinforcements even when the player reloads at the
        // entrance, outside the boss's activation radius. Otherwise the next
        // checkpoint would silently discard their saved living/dead state.
        for (const boss of [...actors].filter(a => a.s.boss && a.hp > 0)) {
            if ([0, 1].some(i => enemySaved['phase-helper:' + boss.id + ':' + i])) {
                boss.summons = 1;
                for (let i = 0; i < 2; i++)
                    spawn('phase-helper:' + boss.id + ':' + i, regionId === 'koreny' ? 'pavouk' : regionId === 'vodarna' ? 'pijavice' : 'prizrak', boss.mesh.position.x + (i ? 4 : -4), boss.mesh.position.z + 2, true);
            }
        }
        if (values['route:chosen'] === 3)
            spawn('route-guard', regionId === 'koreny' ? 'korenovec' : regionId === 'vodarna' ? 'krab' : 'rytir', 11, -10, true);
        if (values['route:chosen'] === 2) {
            spawn('shortcut:0', 'korenovec', -3, -23, true);
            spawn('shortcut:1', 'korenovec', 3, -23, true);
        }
        if (values['trial:wave'] && !values['trial:done'])
            trialWave(values['trial:wave']);
        if (regionId === 'udoli' && values['training:mode'])
            setTraining(values['training:mode']);
        function loop(now: number) {
            if (disposed)
                return;
            raf = requestAnimationFrame(loop);
            const raw = Math.min(1, (now - previous) / 1000);
            previous = now;
            const hitStopped = now < impactUntilReal;
            const dt = hitStopped ? 0 : raw;
            const simulationSteps = Math.max(1, Math.ceil(dt / .05));
            const state = useFrontierStore.getState();
            sword.visible = state.path === 'ochrance';
            bow.visible = state.path === 'stopar';
            staff.visible = state.path === 'runotvurce';
            if (controls.current.choice >= 0) {
                const c = controls.current.choice;
                controls.current.choice = -1;
                choose(c);
            }
            if (controls.current.rest) {
                controls.current.rest = false;
                hp = maxHp;
                potions = 3;
                player.group.position.set(0, 0, 12);
                say('Buddy si odpočinul. Zdraví i lektvary jsou doplněné.');
                save();
            }
            if (lastMission !== state.mission) {
                lastMission = state.mission;
                configure();
            }
            const extraKey = state.facts.filter(x => x.startsWith('v43:reward:') || x.startsWith('v44:')).join('|') + JSON.stringify(Object.entries(state.choices).filter(([k]) => k.startsWith('episode:') || k.startsWith('neighbor:')));
            if (expansionVersion !== extraKey) {
                expansionVersion = extraKey;
                configure();
            }
            spring.visible = regionId === 'mokrad' && state.facts.includes('v43:reward:event:pramen');
            const cosmetic = state.choices.znak ?? '';
            collar.visible = !!cosmetic && (state.facts.includes('v43:reward:challenge:' + cosmetic) || state.facts.includes('v44:done:mini:' + cosmetic));
            (collar.material as T.MeshStandardMaterial).color.set(({ preruseni: '#e5b66a', odraz: '#69d5cc', arena: '#af8fab', kombo: '#8da67b', 'mini-kamen': '#e5b66a', 'mini-lovec': '#97b18c', 'mini-breh': '#f2e7d0', 'mini-rytir': '#af8fab' } as Record<string, string>)[cosmetic] ?? '#e5b66a');
            for (const secret of SECRETS.filter(x => x.region === regionId && !state.facts.includes('v43:reward:secret:' + x.id))) {
                const d = distance(player.group.position, { x: secret.at[0], z: secret.at[1] });
                if (d < 5 && !values['hint:' + secret.id]) {
                    values['hint:' + secret.id] = 1;
                    say('Buddy naslouchá: ' + secret.hint);
                }
            }
            if (state.choices.gesture + state.choices.gestureNonce !== lastGesture) {
                lastGesture = state.choices.gesture + state.choices.gestureNonce;
                gestureStart = time;
            }
            for (const n of nodes.filter(n => n.id.startsWith('secret:')))
                n.mesh.visible = distance(player.group.position, n) < 5;
            const townKey = state.choices.pristresek + ':' + state.facts.includes('garden') + ':' + state.facts.includes('sprite') + ':' + state.mission + ':' + state.choices.zahrada + ':' + state.choices.trofej + ':' + extraKey;
            if (regionId === 'udoli' && townVersion !== townKey) {
                townVersion = townKey;
                townChanges.clear();
                if (state.facts.includes('garden')) {
                    for (let i = 0; i < 3; i++)
                        model(state.choices.zahrada ?? 'zahonek', -6 + i * 2.5, 9, 1, 0, townChanges);
                }
                if (state.mission > 4)
                    model(state.choices.pristresek === 'dilna' ? 'dilna' : 'chata', 11, 13, .8, 0, townChanges);
                if (state.facts.includes('sprite'))
                    model('krystaly', -4, 5, 1, 0, townChanges);
                if (state.mission > 15)
                    model('stanek', -11, 13, 1, 0, townChanges);
                if (state.facts.includes('v44:done:neighbor:dum') && state.choices.pristresek === 'dilna')
                    model(state.choices['neighbor:dum'] === '0' ? 'lucerna' : 'kvetiny', 11, 15, 1, 0, townChanges);
                if (state.facts.includes('v44:done:neighbor:dohoda')) {
                    if (state.choices.dohoda === 'ochrana')
                        model('brana', state.choices['neighbor:dohoda'] === '0' ? 2 : 11, state.choices['neighbor:dohoda'] === '0' ? -8 : 16, .45, 0, townChanges);
                    else
                        model(state.choices['neighbor:dohoda'] === '0' ? 'bedna' : 'sud', state.choices['neighbor:dohoda'] === '0' ? -11 : 11, 15, 1, 0, townChanges);
                }
                if (state.facts.includes('v44:done:neighbor:posel'))
                    model(state.choices['neighbor:posel'] === '0' ? 'kvetiny' : 'krystaly', -5, 8, .6, 0, townChanges);
                if (state.facts.includes('v44:done:episode:stul')) {
                    box(townChanges, '#785239', 3, .7, 1.2, -3, 14);
                    for (const x of [-4, -2])
                        model('lavicka', x, 15, .6, 0, townChanges);
                }
                if (state.facts.includes('v44:done:episode:dopis'))
                    model(state.choices['episode:dopis:answer2'] === '0' ? 'lucerna' : 'rozcestnik', 9, 10, .6, 0, townChanges);
                if (state.choices.trofej)
                    model(state.choices.trofej === 'koren' ? 'koreneny-oblouk' : state.choices.trofej === 'perla' ? 'krystaly' : 'runovy-kamen', -10, 9, .7, 0, townChanges);
            }
            guardResident.group.visible = regionId === 'udoli' && state.facts.includes('v44:done:neighbor:dohoda') && state.choices.dohoda === 'ochrana';
            guardResident.group.position.set(state.choices['neighbor:dohoda'] === '0' ? 2 : 11, 0, state.choices['neighbor:dohoda'] === '0' ? -7 : 16);
            dinnerGuest.group.visible = regionId === 'udoli' && state.facts.includes('v44:done:episode:stul');
            dinnerGuest.group.position.set(-2, 0, 13);
            mira.group.visible = regionId === 'udoli' && (state.facts.includes('pristresek:done') || state.facts.includes('side:taska:done'));
            const letterStage = episodeStage('dopis', state.choices);
            mira.group.position.set(letterStage >= 2 && letterStage < 4 ? -3 : 9, 0, letterStage >= 2 && letterStage < 4 ? 3 : 10);
            resident.group.visible = regionId === 'udoli' && state.choices.pristresek === 'utulek' && state.facts.includes('v44:done:neighbor:dum');
            resident.group.position.set(state.choices['neighbor:dum'] === '0' ? 10 : 13, 0, 15);
            stoneFriend.visible = regionId === 'udoli' && state.facts.includes('v44:done:episode:srdce') && state.choices.kamen === 'klid';
            spiritFriend.group.visible = regionId === 'udoli' && state.facts.includes('v44:done:episode:srdce') && state.choices.kamen !== 'klid';
            let objective = '';
            const isPaused = pausedRef.current || document.hidden || pendingPrompt !== null || matchMedia('(pointer: coarse)').matches && innerHeight > innerWidth;
            if (!isPaused && hp > 0) {
                active += raw;
                // Catch up a slow rendered frame in bounded physics steps. This keeps
                // real-time cooldowns, healing and movement together without tunnelling.
                for (let step = 0; step < simulationSteps && hp > 0 && !pendingPrompt && !pausedRef.current; step++) {
                const dt = (hitStopped ? 0 : raw) / simulationSteps;
                time += dt;
                const level = useBuddyWorldStore.getState().level, newMax = 100 + (level - 1) * 5;
                if (newMax > maxHp)
                    hp += newMax - maxHp;
                maxHp = newMax;
                let ix = controls.current.x + (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0), iz = -controls.current.z + (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0);
                const len = Math.hypot(ix, iz);
                if (len > 1) {
                    ix /= len;
                    iz /= len;
                }
                const gates = boxes.slice();
                bossRoots.visible = regionId === 'koreny' && !!values['boss:roots'] && !values['boss:rootCut'] && actors.some(a => a.id === 'dungeon-boss' && a.hp > 0);
                for (let i = 0; i < 3; i++) {
                    const m = bossRoots.children[i];
                    m.visible = values['boss:rootGap'] !== i + 1;
                    if (bossRoots.visible && m.visible)
                        gates.push({ x: (i - 1) * 8, z: -22, w: 5, d: .8 });
                }
                if (dungeon) {
                    const open1 = routeGate(values, 1, regionId === 'koreny' ? values.lens0 === 1 : regionId === 'vodarna' ? (values.valveOrder ?? 0) >= 1 : !!values.mural0), open2 = routeGate(values, 2, regionId === 'koreny' ? values.lens1 === 2 : regionId === 'vodarna' ? (values.valveOrder ?? 0) >= 2 : !!values.mural1);
                    gate1.visible = !open1;
                    gate2.visible = !open2;
                    if (!open1)
                        gates.push({ x: 0, z: -4, w: 5, d: .5 });
                    if (!open2)
                        gates.push({ x: 0, z: -16, w: 5, d: .5 });
                }
                (player.body.material as T.MeshStandardMaterial).color.copy(playerTints[state.path]);
                const speed = PATHS[state.path].speed;
                if (time < dodgeUntil)
                    tryMove(dash.x * dt * 13, dash.z * dt * 13, gates);
                else
                    tryMove(ix * dt * speed, iz * dt * speed, gates);
                if (len > .1)
                    player.group.rotation.y = Math.atan2(ix, iz);
                phase += dt * len * 9;
                player.animate(phase, len > .05, Math.max(0, (attackPose - time) / .3));
                const actions = controls.current.actions.splice(0);
                for (const cmd of actions)
                    action(cmd);
                if (keys.has('Space') && time - lastAttack > .58)
                    action('attack');
                missionTick(dt);
                sideTick();
                continuationTick(dt);
                if (buddyEchoAt && time >= buddyEchoAt) {
                    buddyEchoAt = 0;
                    castBuddy(.5);
                }
                for (let i = healingZones.length - 1; i >= 0; i--) {
                    const z = healingZones[i];
                    if (time > z.until) {
                        healingZones.splice(i, 1);
                        continue;
                    }
                    if (distance(player.group.position, z) < 1.8)
                        hp = Math.min(maxHp, hp + maxHp * .04 * dt);
                }
                if (state.facts.includes('v43:reward:event:pramen') && regionId === 'mokrad' && distance(player.group.position, { x: -15, z: 14 }) < 3)
                    hp = Math.min(maxHp, hp + 10 * dt);
                if ((values.oilUntil ?? 0) > time) {
                    (oilDisk.material as T.MeshStandardMaterial).color.set('#da8b50');
                    for (const a of actors)
                        if (a.hp > 0 && distance(a.mesh.position, oil.position) < 2)
                            a.burn = time + .5;
                }
                else
                    (oilDisk.material as T.MeshStandardMaterial).color.set('#625347');
                if (values['trial:wave'] && !values['trial:done'] && !actors.some(a => a.id.startsWith('trial:' + values['trial:wave'] + ':') && a.hp > 0)) {
                    if (values['trial:wave'] === 1) {
                        values['trial:wave'] = 2;
                        trialWave(2);
                    }
                    else {
                        values['trial:done'] = 1;
                        const proof = 'trial:' + regionId + ':' + instance;
                        if (!state.facts.includes(proof)) {
                            state.flag(proof);
                            useFrontierStore.setState({ shards: useFrontierStore.getState().shards + 2 });
                        }
                        say('Zkouška dokončena · dva střepy.');
                        configure();
                    }
                    save();
                }
                if (regionId === 'udoli' && distance(player.group.position, { x: 0, z: 6 }) < 5)
                    hp = Math.min(maxHp, hp + dt * 8);
                for (const a of actors) {
                    if (a.hp <= 0)
                        continue;
                    a.mesh.rotation.z = useAdventureStore.getState().reducedMotion ? 0 : time < a.recoil ? Math.sin((a.recoil - time) * 45) * .12 : 0;
                    if (a.id === 'training') {
                        if (values['training:mode'] === 3 && time > a.cooldown && distance(a.mesh.position, player.group.position) < 12) {
                            a.aim = { x: player.group.position.x, z: player.group.position.z };
                            projectile(a);
                            a.cooldown = time + 2;
                        }
                        continue;
                    }
                    const elite = MINIBOSSES.find(m => m.id === a.id);
                    if (elite) {
                        const ready = elite.mechanic !== 'tracks' || [0, 1, 2].every(i => !!values[elite.id + ':' + i]);
                        a.mesh.visible = ready;
                        if (!ready || distance(a.mesh.position, player.group.position) > 12) {
                            a.warning.visible = false;
                            a.tell = 0;
                            continue;
                        }
                    }
                    const pos = a.mesh.position, dist = distance(pos, player.group.position), safe = regionId === 'udoli' && player.group.position.z > 0 && Math.abs(player.group.position.x) < 10 && !a.story;
                    if (a.s.boss && dist <= 14) {
                        bossTick(a, dt, gates);
                        continue;
                    }
                    if (a.s.boss && dist > 14) {
                        a.tell = 0;
                        a.warning.visible = false;
                        if (a.line) a.line.visible = false;
                        continue;
                    }
                    if (time < a.frozen) {
                        a.tell = 0;
                        a.warning.visible = false;
                        continue;
                    }
                    if (a.burn > time && canDamage(a)) {
                        a.hp -= dt * 12;
                        if (a.hp <= 0) {
                            kill(a);
                            continue;
                        }
                    }
                    if (safe || dist > 20) {
                        a.tell = 0;
                        a.warning.visible = false;
                        if (distance(pos, a.home) > .3) {
                            const v = new T.Vector2(a.home.x - pos.x, a.home.z - pos.z).normalize();
                            pos.x += v.x * dt * a.s.speed;
                            pos.z += v.y * dt * a.s.speed;
                        }
                        continue;
                    }
                    if (dist < 12 || a.story) {
                        const desired = a.s.behaviour === 'ranged' || a.s.behaviour === 'healer' || a.s.behaviour === 'summoner' ? 6 : a.s.range * .75;
                        const delta = new T.Vector2(player.group.position.x - pos.x, player.group.position.z - pos.z).normalize();
                        if (!a.tell) {
                            a.mesh.rotation.y = Math.atan2(delta.x, delta.y);
                            if (dist > desired) {
                                let dx = delta.x, dz = delta.y;
                                if (a.s.behaviour === 'hunter' && dist < 6) {
                                    dx += delta.y * .6;
                                    dz -= delta.x * .6;
                                }
                                const slow = time < a.rooted ? 0 : time < a.slow ? .3 : 1;
                                const nx = pos.x + dx * dt * a.s.speed * slow, nz = pos.z + dz * dt * a.s.speed * slow;
                                if (!blocked({ x: nx, z: pos.z }, gates))
                                    pos.x = nx;
                                if (!blocked({ x: pos.x, z: nz }, gates))
                                    pos.z = nz;
                            }
                            else if (a.s.behaviour === 'ranged' && dist < 4) {
                                pos.x -= delta.x * dt * a.s.speed;
                                pos.z -= delta.y * dt * a.s.speed;
                            }
                        }
                        if (!a.tell && time > a.cooldown && dist < (a.s.range + 1)) {
                            a.tell = time + .8;
                            a.aim = { x: player.group.position.x, z: player.group.position.z };
                            a.warning.position.set(a.s.behaviour === 'burrow' ? a.aim.x : pos.x, .05, a.s.behaviour === 'burrow' ? a.aim.z : pos.z);
                            a.warning.visible = true;
                        }
                        if (a.tell && time >= a.tell) {
                            a.tell = 0;
                            a.warning.visible = false;
                            a.cooldown = time + (a.s.boss ? 2.1 : 2.7);
                            a.recover = time + .65;
                            if (a.s.behaviour === 'ranged')
                                projectile(a);
                            else if (a.s.behaviour === 'healer') {
                                for (const other of actors)
                                    if (other.hp > 0 && distance(pos, other.mesh.position) < 6)
                                        other.hp = Math.min(other.maxHp, other.hp + 12);
                            }
                            else if (a.s.behaviour === 'summoner') {
                                if (a.summons < 3) {
                                    a.summons++;
                                    spawn('summon:' + a.id + ':' + a.summons, 'sliz', pos.x + 1, pos.z + 1, true);
                                }
                            }
                            else if (a.s.behaviour === 'charger') {
                                if (!blocked(a.aim, gates) && withinWorld(a.aim, dungeon)) {
                                    pos.x = a.aim.x;
                                    pos.z = a.aim.z;
                                }
                                if (distance(player.group.position, a.aim) < 2)
                                    damagePlayer(a.s.damage);
                            }
                            else if (a.s.behaviour === 'burrow') {
                                if (distance(player.group.position, a.aim) < 2.1)
                                    damagePlayer(a.s.damage);
                            }
                            else if (dist < a.s.range + 1)
                                damagePlayer(a.s.damage);
                            if (a.s.boss && a.hp < a.maxHp * .5) {
                                if (distance(player.group.position, pos) < 5)
                                    damagePlayer(a.s.damage * .5);
                                if (a.summons < 2) {
                                    a.summons++;
                                    spawn('boss-helper:' + a.id + ':' + a.summons, regionId === 'koreny' ? 'pavouk' : regionId === 'vodarna' ? 'pijavice' : 'prizrak', pos.x + 4, pos.z + 2, true);
                                }
                            }
                        }
                    }
                    a.mesh.position.y = a.s.shape === 'wisp' ? .15 + Math.sin(time * 2 + actors.indexOf(a)) * .15 : 0;
                }
                for (const p of projectiles) {
                    p.age += dt;
                    const old = { x: p.mesh.position.x, z: p.mesh.position.z };
                    p.mesh.position.x += p.dx * dt;
                    p.mesh.position.z += p.dz * dt;
                    if (blocked(p.mesh.position, gates)) {
                        p.age = 4;
                        continue;
                    }
                    if (p.age < 3 && distance(player.group.position, p.mesh.position) < .85) {
                        const spec = specialization(state.path, state.choices), reflect = (state.equipped.armor === 'odraz' && (time < shieldUntil || time < dodgeUntil)) || (spec === 'bastion' && time < shieldUntil);
                        if (reflect) {
                            const enemy = actors.filter(a => a.hp > 0).sort((a, b) => distance(old, a.mesh.position) - distance(old, b.mesh.position))[0];
                            if (enemy)
                                hit(enemy, p.damage * 2, true);
                            if (!p.training)
                                challenge('odraz');
                            say('Odražená střela.');
                        }
                        else
                            damagePlayer(p.damage);
                        p.age = 4;
                    }
                }
                for (let i = projectiles.length - 1; i >= 0; i--)
                    if (projectiles[i].age > 3) {
                        scene.remove(projectiles[i].mesh);
                        projectiles[i].mesh.geometry.dispose();
                        (projectiles[i].mesh.material as T.Material).dispose();
                        projectiles.splice(i, 1);
                    }
                for (let i = effects.length - 1; i >= 0; i--)
                    if (effects[i].until < time) {
                        const e = effects.splice(i, 1)[0];
                        scene.remove(e.mesh);
                        if (e.mesh instanceof T.Mesh || e.mesh instanceof T.Line) {
                            e.mesh.geometry.dispose();
                            (e.mesh.material as T.Material).dispose();
                        }
                    }
                if (time - lastSave > 2) {
                    lastSave = time;
                    save();
                }
                }
            }
            else {
                keys.clear();
                controls.current.held = false;
                controls.current.actions.length = 0;
            }
            ally.group.visible = useBuddyWorldStore.getState().level >= 20 && state.choices.druzina === 'spolu';
            if (ally.group.visible && !isPaused && hp > 0) {
                const focus = state.choices.kael === 'cil' && target && target.hp > 0 ? target : null;
                const ap = (focus ? focus.mesh.position : player.group.position).clone().add(new T.Vector3(1.5, 0, 1.5));
                const moving = distance(ally.group.position, ap) > .5;
                ally.group.position.lerp(ap, Math.min(1, dt * 3));
                ally.group.rotation.y = player.group.rotation.y;
                ally.animate(time * 8, moving);
                if (time > allyAttack) {
                    const near = focus && distance(focus.mesh.position, ally.group.position) < 3 ? focus : actors.find(a => a.hp > 0 && distance(a.mesh.position, ally.group.position) < 3);
                    if (near) {
                        if (time < near.marked) {
                            hit(near, 30);
                            near.marked = 0;
                            if (near.id !== 'training')
                                challenge('kombo');
                            else
                                values['training:combos'] = (values['training:combos'] ?? 0) + 1;
                            say('Kael zasáhl Nyxův označený cíl.');
                        }
                        else
                            hit(near, 18);
                        allyAttack = time + 2.3;
                    }
                }
            }
            const bp = player.group.position.clone().add(new T.Vector3(-1, 0, 1));
            buddy.group.position.lerp(bp, Math.min(1, dt * 5));
            buddy.group.rotation.y = player.group.rotation.y;
            if (state.choices.gesture && time - gestureStart < 3 && !isPaused && !useAdventureStore.getState().reducedMotion) {
                if (state.choices.gesture === 'tanec') {
                    buddy.group.rotation.y = time * 5;
                    buddy.group.position.y = .18 + Math.abs(Math.sin(time * 8)) * .25;
                }
                else if (state.choices.gesture === 'pozdrav') {
                    buddy.group.rotation.z = Math.sin(time * 8) * .12;
                }
                else
                    buddy.group.scale.setScalar(.85);
            }
            else {
                buddy.group.rotation.z = 0;
                buddy.group.scale.setScalar(1);
            }
            if (!useAdventureStore.getState().reducedMotion && !(time - gestureStart < 3)) {
                buddy.tail.rotation.z = Math.sin(time * 6) * .2;
                buddy.group.position.y = Math.abs(Math.sin(time * 5)) * (distance(buddy.group.position, bp) > .2 ? .08 : .02);
            }
            if (!target || target.hp <= 0)
                target = nearestEnemy();
            targetRing.visible = !!target;
            if (target) {
                targetRing.position.set(target.mesh.position.x, .06, target.mesh.position.z);
                targetRing.scale.setScalar(target.s.boss ? 2 : 1);
            }
            const desiredCamera = player.group.position.clone().add(new T.Vector3(Math.sin(cameraAngle) * 13 * zoom, 11 * zoom, Math.cos(cameraAngle) * 13 * zoom));
            camera.position.lerp(desiredCamera, .18);
            if (time < shakeUntil && !useAdventureStore.getState().reducedMotion) {
                camera.position.x += Math.sin(time * 90) * .055;
                camera.position.y += Math.cos(time * 80) * .04;
            }
            camera.lookAt(player.group.position.x, 1, player.group.position.z);
            if (occludingWalls.length) {
                const sight = player.group.position.clone().add(new T.Vector3(0, 1, 0)).sub(camera.position);
                wallRay.far = sight.length() - .2;
                wallRay.set(camera.position, sight.normalize());
                for (const wall of occludingWalls) {
                    wall.updateMatrixWorld();
                    const obstructs = wallRay.intersectObject(wall, false).length > 0;
                    wall.material.opacity = obstructs ? .12 : 1;
                    wall.material.depthWrite = !obstructs;
                }
            }
            if (regionId === 'mokrad') {
                sprite.group.visible = state.facts.includes('v43:reward:event:pramen');
                sprite.group.position.set(-15, 0, 14);
            }
            returned.group.visible = regionId === 'udoli' && state.mission > 3;
            if (regionId === 'udoli')
                sprite.group.visible = state.facts.includes('sprite');
            const q = STORY[state.mission];
            for (let i = 0; i < 3; i++) {
                const n = nodes.find(n => !n.side && n.index === i);
                const mechanism = n?.mesh.getObjectByName('mechanism');
                if (mechanism && q)
                    mechanism.rotation.y = (values[q.id + ':' + i] ?? 0) * Math.PI / 2;
                opticalLines[i].visible = q?.mechanic === 'mirror' && q.region === regionId && !!n;
                if (opticalLines[i].visible && n && q) {
                    const correct = (values[q.id + ':' + i] ?? 0) === [2, 0, 1][i], next = nodes.find(n => !n.side && n.index === (i + 1) % 3)!;
                    opticalLines[i].geometry.dispose();
                    opticalLines[i].geometry = new T.BufferGeometry().setFromPoints([new T.Vector3(n.x, 1, n.z), new T.Vector3(correct ? next.x : n.x + 7, 1, correct ? next.z : n.z + 3)]);
                }
            }
            if (q?.region === regionId) {
                const progress = values[q.id + ':progress'] ?? 0;
                objective = q.goal;
                if (['trail', 'sequence', 'ritual', 'fresco', 'sneak', 'tow'].includes(q.mechanic))
                    objective += ` (${progress}/${q.mechanic === 'ritual' ? 4 : 3})`;
                if (q.mechanic === 'escape' && values[q.id + ':start'])
                    objective += ` · ${Math.max(0, Math.ceil(45 - time + values[q.id + ':start']))} s`;
            }
            const trackingId = state.choices.track44 ?? '';
            let tracking = '', trackPoint: {
                x: number;
                z: number;
            } | null = null;
            if (trackingId === 'training') {
                tracking = regionId === 'udoli' ? 'Tréninkový dvorek' : 'Tréninkový dvorek · vesnice';
                if (regionId === 'udoli')
                    trackPoint = { x: 11, z: 18 };
            }
            if (trackingId.startsWith('episode:')) {
                const e = EPISODES.find(e => 'episode:' + e.id === trackingId), stage = e?.stages[episodeStage(e.id, state.choices)];
                if (e && stage) {
                    tracking = stage.title + ' · ' + getRegion(stage.region).name;
                    if (stage.region === regionId)
                        trackPoint = { x: stage.at[0], z: stage.at[1] };
                }
            }
            if (trackingId.startsWith('mini:')) {
                const m = MINIBOSSES.find(m => 'mini:' + m.id === trackingId);
                if (m) {
                    tracking = m.name + ' · ' + getRegion(m.region).name;
                    if (m.region === regionId && !state.facts.includes('v44:done:mini:' + m.id))
                        trackPoint = { x: m.at[0], z: m.at[1] };
                }
            }
            if (now - lastHUD > 160) {
                lastHUD = now;
                const near = nodes.filter(n => n.mesh.visible && distance(player.group.position, n) < 2.5).sort((a, b) => distance(player.group.position, a) - distance(player.group.position, b))[0];
                setHUD({ hp, maxHp, position: { x: player.group.position.x, z: player.group.position.z }, near: near?.name ?? '', target: target ? { name: target.s.name, hp: target.hp, maxHp: target.maxHp, hint: (target.s.boss ? (target.move?.name ?? 'Sleduj výstražný tvar') + ' · ' + (target.hp < target.maxHp * .5 ? 'FÁZE 2 · ' : 'FÁZE 1 · ') : '') + (time < target.frozen ? 'ZMRAŽENÍ · schopnost 1 pro kombo. ' : time < target.rooted ? 'KOŘENY · Stopařova schopnost 1 pro kombo. ' : time < target.marked ? 'PRAVÝ CÍL · silnější další zásah. ' : '') + target.s.hint, warning: !!target.tell } : null, cooldowns: [Math.max(0, skill1CD - time), Math.max(0, skill2CD - time), Math.max(0, buddyCD - time), time < secondDodgeUntil ? 0 : Math.max(0, dodgeCooldown - time)], dead: hp <= 0, notice: time - lastNoticeTime < 7 ? notice : '', hold, objective, ready, potions, time, nodes: [...nodes.filter(n => !n.side).map(n => ({ x: n.x, z: n.z })), ...(trackPoint ? [trackPoint] : [])], tracking, failed: false, training: values['training:mode'] ? { damage: values['training:damage'] ?? 0, hits: values['training:hits'] ?? 0, combos: values['training:combos'] ?? 0, mode: values['training:mode'] } : null, feedback: time < feedbackUntil && state.choices.numbers !== 'off' ? lastFeedback : null });
            }
            const wantedGraphics = state.choices.graphics46 === 'light' ? 'light' : state.choices.graphics46 === 'detail' ? 'detail' : 'balanced';
            if (wantedGraphics !== graphicsMode) {
                graphicsMode = wantedGraphics;
                renderer.setPixelRatio(Math.min(devicePixelRatio, graphicsMode === 'detail' ? 1.75 : graphicsMode === 'light' ? 1 : 1.35));
                renderer.shadowMap.enabled = graphicsMode !== 'light' && (!dungeon || graphicsMode === 'detail');
                sun.castShadow = renderer.shadowMap.enabled;
                renderer.shadowMap.needsUpdate = true;
                renderer.domElement.dataset.graphics46 = graphicsMode;
            }
            if (renderer.shadowMap.enabled && now - lastShadowUpdate > (graphicsMode === 'detail' ? 90 : 180)) {
                lastShadowUpdate = now;
                sun.position.copy(player.group.position).add(new T.Vector3(-15, 25, 10));
                sun.target.position.copy(player.group.position);
                sun.target.updateMatrixWorld();
                renderer.shadowMap.needsUpdate = true;
            }
            renderer.render(scene, camera);
            if (now - lastHUD < 30) {
                renderer.domElement.dataset.drawCalls = String(renderer.info.render.calls);
                renderer.domElement.dataset.triangles = String(renderer.info.render.triangles);
            }
        }
        camera.position.copy(player.group.position).add(new T.Vector3(2, 11, 13));
        raf = requestAnimationFrame(loop);
        const visibility = () => {
            if (document.hidden)
                blur();
        };
        document.addEventListener('visibilitychange', visibility);
        return () => {
            if ((useFrontierStore.getState().runs[regionId] ?? 0) === instance)
                save();
            disposed = true;
            if (batchTimer)
                clearTimeout(batchTimer);
            cancelAnimationFrame(raf);
            observer.disconnect();
            window.removeEventListener('keydown', keydown);
            window.removeEventListener('keyup', keyup);
            window.removeEventListener('blur', blur);
            document.removeEventListener('visibilitychange', visibility);
            renderer.domElement.removeEventListener('pointerdown', down);
            renderer.domElement.removeEventListener('pointermove', move);
            renderer.domElement.removeEventListener('pointerup', up);
            renderer.domElement.removeEventListener('pointercancel', up);
            renderer.domElement.removeEventListener('wheel', wheel);
            scene.traverse(o => {
                if (o instanceof T.Mesh || o instanceof T.Line) {
                    geometries.add(o.geometry);
                    for (const m of Array.isArray(o.material) ? o.material : [o.material])
                        materials.add(m);
                }
            });
            geometries.forEach(g => g.dispose());
            const maps = new Set<T.Texture>();
            materials.forEach(m => { const mat = m as T.MeshStandardMaterial; if (mat.map) maps.add(mat.map); m.dispose(); });
            maps.forEach(t => t.dispose());
            art.dispose();
            sun.shadow.dispose();
            renderer.dispose();
            renderer.domElement.remove();
            controls.current = { x: 0, z: 0, held: false, actions: [], choice: -1, rest: false };
        };
    }, [regionId, mascot, instance]);
    return { photo: () => {
            const canvas = containerRef.current?.querySelector('canvas');
            if (!canvas)
                return false;
            try {
                const a = document.createElement('a');
                a.download = 'BuddyWorld-vzpominka.png';
                a.href = canvas.toDataURL('image/png');
                a.click();
                return true;
            }
            catch {
                return false;
            }
        }, containerRef, hud: { ...hud, failed: failure }, move: (x: number, z: number) => { controls.current.x = x; controls.current.z = z; }, act: (action: Action, down = true) => {
            if (action === 'interact')
                controls.current.held = down;
            if (down)
                controls.current.actions.push(action);
        }, choose: (index: number) => { controls.current.choice = index; }, rest: () => { controls.current.rest = true; } };
}
