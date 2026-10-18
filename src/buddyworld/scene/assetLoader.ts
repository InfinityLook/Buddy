import { assetUrl } from '../assetUrl'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

// ==========================================
// Buddy World — GLTFLoader wrapper for the real .glb models that
// arrived in BuddyWorld_Complete_Project_Pack.zip (public/buddyworld/…,
// paths documented in data/assets.ts). No react-three-fiber or any
// other render framework was added — just `three/examples/jsm/loaders/
// GLTFLoader.js` on top of the existing plain-Three.js stack, per
// integration/THREEJS_IMPORT.md's own instruction not to add a new
// render framework without first checking the existing one.
//
// THE Z-UP → Y-UP ROTATION was not guessed from the pack's own hedge
// ("-90° around X, maybe +90°, verify on a real render"). It was
// derived by parsing the raw binary of all ten .glb files (the JSON
// chunk's accessor min/max for every POSITION attribute). Every one
// of them shows a bounding box whose vertical extent runs along Z
// (e.g. the tree spans Z 0..4.6, a building Z 0..5.9, an enemy
// Z 0..1.97) while X/Y stay symmetric around 0 — a textbook sign of
// a model exported Z-up with no conversion to the Y-up convention
// glTF 2.0 itself requires. `asset.generator` in every file's own
// JSON chunk names `trimesh` (a Python mesh library) as the exporter,
// which does not auto-convert axes on its own.
//
// The fix itself was computed, not guessed: rotating by θ around X
// maps (x, y, z) to (x, y·cosθ − z·sinθ, y·sinθ + z·cosθ). At
// θ = −90° (cosθ = 0, sinθ = −1) that becomes (x, z, −y) — the old
// Z (height) becomes the new Y (Three.js's own "up"), and because
// almost every model's old Z minimum already sits at 0, the new Y
// minimum lands at 0 too, with no extra vertical offset needed. The
// opposite sign (+90°) would instead hang every model upside down
// below the ground (new Y = −old Z, a negative range).
//
// This rotation is proven by arithmetic against the real exported
// data, not by eye — this sandbox has no GPU/browser to literally
// render and look at the result. Whether the models genuinely stand
// upright on a real device is still an open check, named honestly in
// CLAUDE.md's own write-up for this pass.
//
// NOT EVERY .glb THIS LOADER SEES NEEDS THAT FIX. The models that
// arrived in BuddyWorld_ArtPack_Vesnice_Les_v1 (public/buddyworld/
// artpack-v1/models/) are a different generator entirely —
// asset.generator reads "Buddy World original procedural scenery
// v1; source/generate.mjs", not trimesh — and parsing their own raw
// POSITION accessor min/max the identical way (e.g. chata.glb's
// vertical extent runs 0..3.865 on Y, with X/Z both symmetric around
// 0; dub.glb runs 0..4.84 on Y the same way) confirms they're
// already Y-up, exactly as this pack's own PRO_CLAUDE.md states
// ("Modely mají +Y nahoru"). Applying ROTACE_Z_UP_NA_Y_UP to one of
// these would un-fix a model that was never broken — it would map
// (x, y, z) to (x, z, −y), sending a cottage's own 0..3.865 height
// onto the Z axis and its ground-to-roof Y range onto −Z, i.e.
// entirely below the XZ ground plane. `horniOsa` is the one new
// parameter that lets a caller say so explicitly; every existing
// call site below keeps passing nothing and keeps getting the exact
// same default (`'z-trimesh'`) it always has.
// ==========================================

/** The computed Z-up → Y-up fix (see the file header for the math). */
export const ROTACE_Z_UP_NA_Y_UP = -Math.PI / 2

/** `'z-trimesh'` (default): the old trimesh/Python-exported models,
 *  genuinely Z-up, need the −90°-around-X fix above. `'y-up'`: a
 *  model whose own export already puts height on Y (confirmed by
 *  parsing its real POSITION accessor, not assumed from a filename)
 *  — no rotation at all. */
export type HorniOsa = 'z-trimesh' | 'y-up'

const loader = new GLTFLoader()

/** One Promise per URL — two calls for the same path never trigger a
 *  second network fetch. */
const cache = new Map<string, Promise<THREE.Group | null>>()
const animace = new Map<string, THREE.AnimationClip[]>()

/** Clips associated with a loaded GLB; empty for current static placeholder models. */
export const animaceGlbModelu = (cesta: string): readonly THREE.AnimationClip[] => animace.get(cesta) ?? []

/** Loads one .glb file at `cesta`, caches the attempt, and resolves
 *  to its `scene` node with the up-axis fix for `horniOsa` already
 *  applied (default `'z-trimesh'`, i.e. `ROTACE_Z_UP_NA_Y_UP` — every
 *  call site written before the artpack-v1 pass keeps that behaviour
 *  unchanged). Never throws — a failed or unsupported load resolves
 *  to `null` and logs a warning, which is the one signal every
 *  caller uses to fall back to its own existing primitive mesh. */
export const nacistGlbModel = (cesta: string, horniOsa: HorniOsa = 'z-trimesh'): Promise<THREE.Group | null> => {
  const existujici = cache.get(cesta)
  if (existujici) return existujici

  const slib = new Promise<THREE.Group | null>((resolve) => {
    loader.load(
      assetUrl(cesta),
      (gltf) => {
        animace.set(cesta, gltf.animations)
        const scena = gltf.scene
        if (horniOsa === 'z-trimesh') scena.rotation.x = ROTACE_Z_UP_NA_Y_UP
        scena.traverse((obj) => {
          const mesh = obj as THREE.Mesh
          if (mesh.isMesh) {
            mesh.castShadow = false
            mesh.receiveShadow = false
          }
        })
        resolve(scena)
      },
      undefined,
      (chyba) => {
        console.warn(`Buddy World: nepodařilo se nahrát model ${cesta}, appka použije primitivní náhradu.`, chyba)
        resolve(null)
      }
    )
  })

  cache.set(cesta, slib)
  return slib
}

/** Builds one independent scene-graph copy from an already-loaded,
 *  cached `scene` node. Cloning here happens exactly once per placed
 *  landmark, never per frame — the exact distinction
 *  integration/THREEJS_IMPORT.md's own "don't clone expensive
 *  materials every frame" warning is about. `Object3D.clone()` with
 *  no skeleton/animation (the pack's own README states these models
 *  are static) just copies the node tree and shares the underlying
 *  material/geometry with the original, which is safe here because
 *  nothing at runtime ever mutates a placed copy's material. */
export const klonGlbModelu = (zdroj: THREE.Group): THREE.Group => zdroj.clone() as THREE.Group
