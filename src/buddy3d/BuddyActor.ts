import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { BUDDY_THEMES, type Buddy3DThemeId, type BuddyAnimation, type BuddyVoiceState } from './types'

const LOOPING = new Set<BuddyAnimation>(['Idle', 'Walk', 'Listen', 'Think', 'Talk', 'Sleep'])
const VOICE_CLIP: Record<BuddyVoiceState, BuddyAnimation> = { necinny: 'Idle', posloucha: 'Listen', premysli: 'Think', mluvi: 'Talk', chyba: 'Confused' }
interface Options {
  baseUrl?: string
  reducedMotion?: boolean
  maxFps?: number
  onReady?: () => void
  onError?: (error: Error) => void
}
/** One transparent WebGL canvas. The GLB contains the actual animation clips. */
export class BuddyActor {
  readonly scene = new THREE.Scene()
  readonly camera: THREE.OrthographicCamera
  readonly renderer: THREE.WebGLRenderer
  private model: THREE.Group | null = null
  private mixer: THREE.AnimationMixer | null = null
  private actions = new Map<BuddyAnimation, THREE.AnimationAction>()
  private action: THREE.AnimationAction | null = null
  private clip: BuddyAnimation | null = null
  private voiceState: BuddyVoiceState = 'necinny'
  private walk = false
  private facing = 0
  private disposed = false
  private raf = 0
  private last = 0
  private elapsed = 0
  private revision = 0
  private abort: AbortController | null = null
  private readonly observer: ResizeObserver
  private readonly rim: THREE.DirectionalLight
  private readonly shadow: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>
  constructor(readonly canvas: HTMLCanvasElement, private readonly options: Options = {}) {
    this.camera = new THREE.OrthographicCamera(-1.15, 1.15, 1.8, -1.4, .1, 40)
    this.camera.position.set(2.4, 1.8, 6)
    this.camera.lookAt(0, 1.4, 0)
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power', preserveDrawingBuffer: false })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x8495ac, 2.1))
    const key = new THREE.DirectionalLight(0xfff4e6, 3.0); key.position.set(3, 5, 5); this.scene.add(key)
    const fill = new THREE.DirectionalLight(0xd0e8ff, 1.5); fill.position.set(-4, 2, 4); this.scene.add(fill)
    this.rim = new THREE.DirectionalLight(0xffbd61, 2.0); this.rim.position.set(-3, 3, -3); this.scene.add(this.rim)
    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(.48, 40), new THREE.MeshBasicMaterial({ color: 0x14253d, opacity: .17, transparent: true, depthWrite: false }))
    this.shadow.rotation.x = -Math.PI / 2; this.shadow.position.y = .014; this.scene.add(this.shadow)
    this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(canvas)
    document.addEventListener('visibilitychange', this.visibility)
    canvas.addEventListener('webglcontextlost', this.contextLost)
    this.resize(); this.start()
  }
  private resize() {
    if (this.disposed) return
    const w = Math.max(1, this.canvas.clientWidth), h = Math.max(1, this.canvas.clientHeight)
    this.renderer.setSize(w, h, false)
    const half = 1.6 * w / h
    this.camera.left = -half; this.camera.right = half; this.camera.updateProjectionMatrix()
    this.render()
  }
  private render() { if (!this.disposed) this.renderer.render(this.scene, this.camera) }
  private frame = (now: number) => {
    if (this.disposed || document.hidden) return
    this.raf = requestAnimationFrame(this.frame)
    const dt = this.last ? Math.min(.08, (now - this.last) / 1000) : 0; this.last = now; this.elapsed += dt
    if (this.elapsed < 1 / (this.options.maxFps ?? 30)) return
    const delta = this.elapsed; this.elapsed = 0
    if (!this.options.reducedMotion) this.mixer?.update(delta)
    if (this.model) this.model.rotation.y += (this.facing - this.model.rotation.y) * Math.min(1, delta * 7)
    const height = this.model?.getObjectByName('Motion')?.position.y ?? 0
    const scale = 1 - Math.min(.4, height * .45); this.shadow.scale.setScalar(scale); this.shadow.material.opacity = .17 * scale
    this.render()
  }
  private start() { if (!this.raf && !this.disposed && !document.hidden) { this.last = 0; this.raf = requestAnimationFrame(this.frame) } }
  private visibility = () => { cancelAnimationFrame(this.raf); this.raf = 0; if (!document.hidden) this.start() }
  private contextLost = (event: Event) => { event.preventDefault(); cancelAnimationFrame(this.raf); this.raf = 0; this.options.onError?.(new Error('3D zobrazení bylo přerušeno. Chat můžeš používat dál.')) }
  private disposeModel(model: THREE.Object3D) {
    model.traverse(child => { if (child instanceof THREE.Mesh) { child.geometry.dispose(); const materials = Array.isArray(child.material) ? child.material : [child.material]; for (const material of materials) material.dispose() } })
  }
  async setTheme(theme: Buddy3DThemeId) {
    const revision = ++this.revision
    this.abort?.abort(); this.abort = new AbortController()
    try {
      const base = (this.options.baseUrl ?? '/').replace(/\/?$/, '/')
      const response = await fetch(`${base}buddy-3d/models/buddy-${theme}.glb`, { signal: this.abort.signal })
      if (!response.ok) throw new Error(`Model Buddyho se nepodařilo načíst (${response.status}).`)
      const data = await response.arrayBuffer()
      const gltf = await new GLTFLoader().parseAsync(data, '')
      if (this.disposed || revision !== this.revision) { this.disposeModel(gltf.scene); return }
      if (this.model) { this.mixer?.stopAllAction(); this.mixer?.uncacheRoot(this.model); this.scene.remove(this.model); this.disposeModel(this.model) }
      this.model = gltf.scene; this.scene.add(this.model)
      this.mixer = new THREE.AnimationMixer(this.model)
      this.actions.clear(); this.action = null; this.clip = null
      for (const clip of gltf.animations) this.actions.set(clip.name as BuddyAnimation, this.mixer.clipAction(clip))
      this.mixer.addEventListener('finished', this.finished)
      this.rim.color.set(BUDDY_THEMES[theme].accent)
      this.play(this.voiceState === 'necinny' ? (this.options.reducedMotion ? 'Idle' : 'Spawn') : VOICE_CLIP[this.voiceState])
      this.options.onReady?.(); this.render()
    } catch (error) {
      if (this.disposed || revision !== this.revision || (error instanceof DOMException && error.name === 'AbortError')) return
      this.options.onError?.(error instanceof Error ? error : new Error('3D Buddyho nelze načíst.'))
    }
  }
  private finished = (event: { action: THREE.AnimationAction }) => { if (event.action === this.action && this.clip !== 'Despawn') this.play(this.walk && this.voiceState === 'necinny' ? 'Walk' : VOICE_CLIP[this.voiceState]) }
  play(name: BuddyAnimation) {
    if (this.disposed) return
    const next = this.actions.get(name); if (!next) return
    if (this.clip === name && LOOPING.has(name)) return
    const previous = this.action; const same = previous === next
    if (same) previous.stop()
    next.reset().setEffectiveWeight(1).setEffectiveTimeScale(1)
    next.setLoop(LOOPING.has(name) ? THREE.LoopRepeat : THREE.LoopOnce, LOOPING.has(name) ? Infinity : 1)
    next.clampWhenFinished = !LOOPING.has(name); next.play()
    if (previous && !same) { previous.fadeOut(.16); next.fadeIn(.16) }
    this.action = next; this.clip = name
    if (this.options.reducedMotion) { this.mixer?.update(0); this.render() }
  }
  setVoiceState(state: BuddyVoiceState) { const changed = state !== this.voiceState; this.voiceState = state; if (changed) this.play(state === 'necinny' && this.walk ? 'Walk' : VOICE_CLIP[state]) }
  setWalking(walking: boolean, direction = 1) {
    const changed = walking !== this.walk; this.walk = walking
    this.facing = walking ? (direction < 0 ? -1.25 : 1.25) : 0
    if (changed && this.voiceState === 'necinny') this.play(walking ? 'Walk' : 'Idle')
  }
  setReducedMotion(value: boolean) { this.options.reducedMotion = value; if (value) { this.walk = false; this.facing = 0; this.play('Idle') } }
  dispose() {
    if (this.disposed) return
    this.disposed = true; this.revision++; this.abort?.abort(); cancelAnimationFrame(this.raf)
    this.observer.disconnect(); document.removeEventListener('visibilitychange', this.visibility); this.canvas.removeEventListener('webglcontextlost', this.contextLost)
    this.mixer?.removeEventListener('finished', this.finished); this.mixer?.stopAllAction()
    if (this.model) { this.mixer?.uncacheRoot(this.model); this.disposeModel(this.model) }
    this.actions.clear(); this.shadow.geometry.dispose(); this.shadow.material.dispose(); this.renderer.dispose(); this.renderer.forceContextLoss()
    this.scene.clear(); this.model = null; this.mixer = null
  }
}
