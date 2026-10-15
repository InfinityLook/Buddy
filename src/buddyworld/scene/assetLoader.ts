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
// ==========================================

/** The computed Z-up → Y-up fix (see the file header for the math). */
export const ROTACE_Z_UP_NA_Y_UP = -Math.PI / 2

const loader = new GLTFLoader()

/** One Promise per URL — two calls for the same path never trigger a
 *  second network fetch. */
const cache = new Map<string, Promise<THREE.Group | null>>()

/** Loads one .glb file at `cesta`, caches the attempt, and resolves
 *  to its `scene` node with `ROTACE_Z_UP_NA_Y_UP` already applied.
 *  Never throws — a failed or unsupported load resolves to `null`
 *  and logs a warning, which is the one signal every caller uses to
 *  fall back to its own existing primitive mesh. */
export const nacistGlbModel = (cesta: string): Promise<THREE.Group | null> => {
  const existujici = cache.get(cesta)
  if (existujici) return existujici

  const slib = new Promise<THREE.Group | null>((resolve) => {
    loader.load(
      cesta,
      (gltf) => {
        const scena = gltf.scene
        scena.rotation.x = ROTACE_Z_UP_NA_Y_UP
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
