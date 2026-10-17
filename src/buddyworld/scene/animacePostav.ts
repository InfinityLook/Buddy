import * as THREE from 'three'

/** Buddy World v5.1 — bridge for future animated anime GLB characters.
 * Accepts standard glTF animation names (Idle/Walk/Run/Attack/Dodge/Hit/Death)
 * and Czech aliases. A model without clips remains usable as a static fallback.
 */
export type AkcePostavy = 'idle' | 'walk' | 'run' | 'attack' | 'dodge' | 'hit' | 'death'
const ALIASY: Record<AkcePostavy, readonly string[]> = {
  idle: ['idle', 'stand', 'klid'], walk: ['walk', 'walking', 'chuze'],
  run: ['run', 'running', 'beh'], attack: ['attack', 'slash', 'utok'],
  dodge: ['dodge', 'roll', 'uhyb'], hit: ['hit', 'damage', 'zasah'],
  death: ['death', 'die', 'smrt'],
}
export const najdiAnimaci = (klipy: readonly THREE.AnimationClip[], akce: AkcePostavy): THREE.AnimationClip | null => {
  const aliases = ALIASY[akce]
  return klipy.find(k => aliases.some(a => k.name.toLowerCase() === a))
    ?? klipy.find(k => aliases.some(a => k.name.toLowerCase().includes(a))) ?? null
}
export interface OvladacAnimaci {
  prehraj(akce: AkcePostavy, prechod?: number): boolean
  krok(dt: number): void
  zrus(): void
}
export const vytvorOvladacAnimaci = (model: THREE.Object3D, klipy: readonly THREE.AnimationClip[]): OvladacAnimaci => {
  const mixer = new THREE.AnimationMixer(model)
  const actions = new Map<AkcePostavy, THREE.AnimationAction>()
  for (const key of Object.keys(ALIASY) as AkcePostavy[]) {
    const clip = najdiAnimaci(klipy, key)
    if (clip) actions.set(key, mixer.clipAction(clip))
  }
  let current: AkcePostavy | null = null
  let disposed = false
  return {
    prehraj(akce, prechod = 0.18) {
      if (disposed) return false
      const next = actions.get(akce)
      if (!next) return false
      if (current === akce) return true
      const prev = current ? actions.get(current) : undefined
      if (prev) prev.fadeOut(Math.max(0, prechod))
      next.reset().setEffectiveWeight(1).setEffectiveTimeScale(1)
      if (akce === 'attack' || akce === 'dodge' || akce === 'hit' || akce === 'death') {
        next.setLoop(THREE.LoopOnce, 1)
        next.clampWhenFinished = true
      } else {
        next.setLoop(THREE.LoopRepeat, Infinity)
        next.clampWhenFinished = false
      }
      next.fadeIn(Math.max(0, prechod)).play()
      current = akce
      return true
    },
    krok(dt) { if (!disposed && Number.isFinite(dt) && dt > 0) mixer.update(Math.min(dt, 0.1)) },
    zrus() { if (disposed) return; disposed = true; mixer.stopAllAction(); mixer.uncacheRoot(model); actions.clear() },
  }
}
