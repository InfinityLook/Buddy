// All combat deadlines use the same pausable clock, including panel bosses.
const reasons = new Set<string>()
let stoppedAt = 0
let stoppedTotal = 0
export const herniCas = () => (reasons.size ? stoppedAt : performance.now()) - stoppedTotal
export const herniDatum = () => performance.timeOrigin + herniCas()
export const jePauza = () => reasons.size > 0
export function nastavPauzu(reason: string, paused: boolean) {
  const wasPaused = reasons.size > 0
  if (paused) reasons.add(reason)
  else reasons.delete(reason)
  if (!wasPaused && reasons.size) stoppedAt = performance.now()
  if (wasPaused && !reasons.size) stoppedTotal += performance.now() - stoppedAt
}
