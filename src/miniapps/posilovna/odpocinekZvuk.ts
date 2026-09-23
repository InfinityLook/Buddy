import { useZvukStore } from '@/core/store/useZvukStore'

// ==========================================
// Konec odpočinku mezi sériemi — vibrace + krátké pípnutí, přesná
// kopie Form Checkova stejnojmenného mechanismu (form-check/hlaseni.ts)
// pro identický signál v jiné appce. Vlastní, samostatný soubor
// místo importu odtud — appka mezi nezávislými miniaplikacemi
// vlastní utility neimportuje (jediná zavedená výjimka je Kalendář→
// Rozvrh, úzká, zdokumentovaná integrace funkcí, ne obecná
// duplikace jako tahle), takže malá, přijatá duplikace stejná jako
// u BARVY_UZLU jinde v appce.
//
// AudioContext se musí vytvořit/odemknout uvnitř skutečného gesta
// uživatele (klepnutí na "⏱ Odpočinek"), ne až o desítky vteřin
// později, kdy odpočítávání doběhne — prohlížeč by jinak kontext
// vytvořený mimo gesto nechal ve stavu 'suspended' a start() by
// tiše nic nepřehrál.
// ==========================================

let odpocinekAudioCtx: AudioContext | null = null

export const odemkniOdpocinekZvuk = (): void => {
  if (odpocinekAudioCtx) {
    void odpocinekAudioCtx.resume()
    return
  }
  try {
    const Ctor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (Ctor) odpocinekAudioCtx = new Ctor()
  } catch {
    odpocinekAudioCtx = null
  }
}

export const ohlasKonecOdpocinku = (): void => {
  // Vibrace na telefonu — když prohlížeč neumí, prostě se nic nestane.
  navigator.vibrate?.([150, 80, 150])

  const master = useZvukStore.getState().master / 100
  if (master <= 0 || !odpocinekAudioCtx) return
  try {
    const ctx = odpocinekAudioCtx
    const now = ctx.currentTime
    const gain = ctx.createGain()
    gain.connect(ctx.destination)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.3 * master, now + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5)

    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(660, now)
    osc.frequency.setValueAtTime(880, now + 0.15)
    osc.connect(gain)
    osc.start(now)
    osc.stop(now + 0.55)
  } catch {
    // Zvuk je bonus, ne podmínka — vibrace výš proběhla tak jako tak.
  }
}
