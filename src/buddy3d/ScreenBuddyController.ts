import type { BuddyActor } from './BuddyActor'

interface Options { autoRoam?: boolean; reducedMotion?: boolean; onTap?: () => void; bottomInset?: number }
export class ScreenBuddyController {
  private x = 0
  private y = 0
  private target = 0
  private raf = 0
  private last = 0
  private nextRoam = performance.now() + 6000
  private paused = false
  private disposed = false
  private pointer: { id: number; x: number; y: number; bx: number; by: number; dragged: boolean } | null = null
  private lastTap = 0
  private panel: HTMLElement | null = null
  private parked: { x: number; y: number } | null = null
  constructor(private readonly host: HTMLElement, private readonly hit: HTMLElement, private readonly actor: BuddyActor, private readonly options: Options = {}) {
    this.viewportCss(); const bounds = this.bounds(); this.x = bounds.maxX; this.target = this.x; this.y = bounds.maxY; this.paint()
    hit.addEventListener('pointerdown', this.down); hit.addEventListener('pointermove', this.move); hit.addEventListener('pointerup', this.up); hit.addEventListener('pointercancel', this.cancel); hit.addEventListener('keydown', this.key)
    window.addEventListener('resize', this.resize); window.visualViewport?.addEventListener('resize', this.resize); window.visualViewport?.addEventListener('scroll', this.resize)
    document.addEventListener('visibilitychange', this.visibility); this.start()
  }
  private bounds() {
    const v = window.visualViewport, left = v?.offsetLeft ?? 0, top = v?.offsetTop ?? 0
    const minX = left + 6, minY = top + 6
    return { minX, minY, maxX: Math.max(minX, left + (v?.width ?? window.innerWidth) - this.host.offsetWidth - 6), maxY: Math.max(minY, top + (v?.height ?? window.innerHeight) - this.host.offsetHeight - (this.options.bottomInset ?? 70)) }
  }
  private paint() { this.host.style.transform = `translate3d(${this.x.toFixed(2)}px,${this.y.toFixed(2)}px,0)` }
  private viewportCss() { const v = window.visualViewport, root = this.host.parentElement; if (root) { root.style.setProperty('--b3-vv-height', `${v?.height ?? innerHeight}px`); root.style.setProperty('--b3-vv-bottom', `${(v?.offsetTop ?? 0) + (v?.height ?? innerHeight)}px`); root.dataset.b3Compact = String((v?.height ?? innerHeight) < 550) } }
  private resize = () => {
    this.viewportCss(); const b = this.bounds()
    if (this.panel && !this.pointer?.dragged) { const r = this.panel.getBoundingClientRect(); if (r.left - this.host.offsetWidth - 16 >= b.minX) { this.x = r.left - this.host.offsetWidth - 16; this.y = Math.min(b.maxY, r.bottom - this.host.offsetHeight) } else { this.x = Math.min(b.maxX, r.right - this.host.offsetWidth); this.y = r.top - this.host.offsetHeight - 22 } this.target = this.x }
    this.x = Math.max(b.minX, Math.min(b.maxX, this.x)); this.y = Math.max(b.minY, Math.min(b.maxY, this.y)); this.target = Math.max(b.minX, Math.min(b.maxX, this.target)); this.paint()
  }
  private start() { if (!this.disposed && !this.raf && !document.hidden) { this.last = 0; this.raf = requestAnimationFrame(this.frame) } }
  private visibility = () => { cancelAnimationFrame(this.raf); this.raf = 0; if (!document.hidden) { this.last = 0; this.start() } }
  private frame = (now: number) => {
    if (this.disposed || document.hidden) return
    this.raf = requestAnimationFrame(this.frame)
    const dt = this.last ? Math.min(.05, (now - this.last) / 1000) : 0; this.last = now
    if (this.paused || this.pointer || this.options.reducedMotion) return
    const dx = this.target - this.x
    if (Math.abs(dx) > .5) { const step = Math.sign(dx) * Math.min(Math.abs(dx), dt * 82); this.x += step; this.actor.setWalking(true, Math.sign(dx)); this.paint() }
    else { this.actor.setWalking(false); if (this.options.autoRoam !== false && now > this.nextRoam) { const b = this.bounds(); this.target = b.minX + Math.random() * (b.maxX - b.minX); this.nextRoam = now + 7000 + Math.random() * 4000 } }
  }
  private down = (event: PointerEvent) => {
    if (event.button !== 0 || this.pointer) return
    event.preventDefault(); this.target = this.x; this.actor.setWalking(false)
    this.pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, bx: this.x, by: this.y, dragged: false }
    this.hit.setPointerCapture(event.pointerId)
  }
  private move = (event: PointerEvent) => {
    const p = this.pointer; if (!p || p.id !== event.pointerId) return
    const dx = event.clientX - p.x, dy = event.clientY - p.y
    if (Math.hypot(dx, dy) > 6) p.dragged = true
    if (!p.dragged) return
    this.x = p.bx + dx; this.y = p.by + dy; this.resize(); this.target = this.x
  }
  private up = (event: PointerEvent) => {
    const p = this.pointer; if (!p || p.id !== event.pointerId) return
    this.pointer = null; if (this.hit.hasPointerCapture(event.pointerId)) this.hit.releasePointerCapture(event.pointerId)
    this.nextRoam = performance.now() + 7000
    if (!p.dragged) { const now = performance.now(); this.actor.play(now - this.lastTap < 330 ? 'Jump' : 'Pet'); this.lastTap = now; this.options.onTap?.() }
  }
  private cancel = () => { this.pointer = null; this.target = this.x; this.actor.setWalking(false) }
  private key = (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); this.actor.play('Pet'); this.options.onTap?.(); return }
    if (event.key.toLowerCase() === 'j') { this.actor.play('Jump'); return }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); this.walkBy(event.key === 'ArrowLeft' ? -85 : 85) }
  }
  walkBy(pixels: number) { const b = this.bounds(); this.target = Math.max(b.minX, Math.min(b.maxX, this.x + pixels)); this.nextRoam = performance.now() + 9000 }
  setPanel(panel: HTMLElement | null) { if (panel && !this.panel) this.parked = { x: this.x, y: this.y }; this.panel = panel; if (!panel && this.parked) { this.x = this.parked.x; this.y = this.parked.y; this.target = this.x; this.parked = null } this.resize() }
  setPaused(value: boolean) { this.paused = value; if (value) { this.target = this.x; this.actor.setWalking(false) } }
  setReducedMotion(value: boolean) { this.options.reducedMotion = value; if (value) { this.target = this.x; this.actor.setWalking(false) } }
  dispose() {
    if (this.disposed) return; this.disposed = true; cancelAnimationFrame(this.raf)
    this.hit.removeEventListener('pointerdown', this.down); this.hit.removeEventListener('pointermove', this.move); this.hit.removeEventListener('pointerup', this.up); this.hit.removeEventListener('pointercancel', this.cancel); this.hit.removeEventListener('keydown', this.key)
    window.removeEventListener('resize', this.resize); window.visualViewport?.removeEventListener('resize', this.resize); window.visualViewport?.removeEventListener('scroll', this.resize); document.removeEventListener('visibilitychange', this.visibility)
  }
}
