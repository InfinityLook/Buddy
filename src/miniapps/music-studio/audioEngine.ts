import { useZvukStore, ziskejHlasitost } from '@/core/store/useZvukStore'
import type { DrumSound } from './types'

// ==========================================
// Syntetizované bicí — stejná "Web Audio, žádný knihovna, žádný soubor
// navíc" zásada jako core/utils/notify.ts's zvuk dokončení nebo
// src/fighting/sound.ts's efekty v Souboji. Appka nemá (a nemá jak
// levně sehnat) skutečné, licenčně čisté vzorky bicích — tři klasické
// syntézní triky (sweep sinus pro kick, filtrovaný šum pro snare/hi-hat)
// zní jako skutečné bicí a appce nestojí ani korunu ani megabajt navíc.
// ==========================================

// Jeden sdílený AudioContext pro celé Music Studio — stejný důvod jako
// Souboj's sound.ts: prohlížeč dovolí vytvořit/odemknout kontext jen
// uvnitř skutečného gesta uživatele, další zvuky pak už jedou na tom
// samém.
let sdilenyKontext: AudioContext | null = null
// Nastavení — Zvuk. Stejný "jeden sdílený masterGain mezi vším a
// ctx.destination" trik jako fighting/sound.ts — appka se na store
// přihlásí jednou, ať tažení posuvníku "Music" ztiší i právě hrající
// beat okamžitě, ne až na další přehrání.
let masterGain: GainNode | null = null

const aplikujHlasitost = () => {
  if (masterGain) masterGain.gain.value = ziskejHlasitost('music')
}

useZvukStore.subscribe(aplikujHlasitost)

export const ziskejKontext = (): AudioContext => {
  if (!sdilenyKontext) {
    sdilenyKontext = new AudioContext()
    masterGain = sdilenyKontext.createGain()
    masterGain.connect(sdilenyKontext.destination)
    aplikujHlasitost()
  }
  if (sdilenyKontext.state === 'suspended') void sdilenyKontext.resume()
  return sdilenyKontext
}

/** Cíl, kam appka připojuje KAŽDÝ jednotlivý zvukový uzel místo přímo
 *  `ctx.destination` — viz hrajKick/hrajSnare/hrajHihat níž. Nikdy
 *  null, jakmile appka jednou zavolala ziskejKontext() (ta ho založí
 *  spolu s kontextem), ale appka to nechce vynucovat non-null assercí
 *  přímo v každém volajícím — fallback na ctx.destination je stejně
 *  bezpečný, jen bez hlasitostní násobičky. */
const ziskejVystup = (ctx: AudioContext): AudioNode => masterGain ?? ctx.destination

/** Krátký šumový buffer, znovu vytvořený jen jednou a pak sdílený mezi
 *  snare/hi-hat — obě potřebují bílý šum, jen jinak filtrovaný. */
let sdilenySum: AudioBuffer | null = null
const ziskejSum = (ctx: AudioContext): AudioBuffer => {
  if (sdilenySum && sdilenySum.sampleRate === ctx.sampleRate) return sdilenySum
  const delkaVzorku = ctx.sampleRate * 0.3
  const buffer = ctx.createBuffer(1, delkaVzorku, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < delkaVzorku; i++) data[i] = Math.random() * 2 - 1
  sdilenySum = buffer
  return buffer
}

const hrajKick = (ctx: AudioContext, cas: number) => {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ziskejVystup(ctx))

  osc.frequency.setValueAtTime(150, cas)
  osc.frequency.exponentialRampToValueAtTime(40, cas + 0.15)
  gain.gain.setValueAtTime(1, cas)
  gain.gain.exponentialRampToValueAtTime(0.001, cas + 0.2)

  osc.start(cas)
  osc.stop(cas + 0.22)
}

const hrajSnare = (ctx: AudioContext, cas: number) => {
  // Šumová složka — hlavní "crack"
  const sum = ctx.createBufferSource()
  sum.buffer = ziskejSum(ctx)
  const sumFiltr = ctx.createBiquadFilter()
  sumFiltr.type = 'highpass'
  sumFiltr.frequency.value = 1000
  const sumGain = ctx.createGain()
  sum.connect(sumFiltr)
  sumFiltr.connect(sumGain)
  sumGain.connect(ziskejVystup(ctx))
  sumGain.gain.setValueAtTime(0.7, cas)
  sumGain.gain.exponentialRampToValueAtTime(0.01, cas + 0.15)

  // Tónová složka — "tělo" bubnu pod šumem
  const osc = ctx.createOscillator()
  osc.type = 'triangle'
  osc.frequency.value = 180
  const oscGain = ctx.createGain()
  osc.connect(oscGain)
  oscGain.connect(ziskejVystup(ctx))
  oscGain.gain.setValueAtTime(0.4, cas)
  oscGain.gain.exponentialRampToValueAtTime(0.01, cas + 0.1)

  sum.start(cas)
  sum.stop(cas + 0.15)
  osc.start(cas)
  osc.stop(cas + 0.1)
}

const hrajHihat = (ctx: AudioContext, cas: number) => {
  const sum = ctx.createBufferSource()
  sum.buffer = ziskejSum(ctx)
  const filtr = ctx.createBiquadFilter()
  filtr.type = 'highpass'
  filtr.frequency.value = 7000
  const gain = ctx.createGain()
  sum.connect(filtr)
  filtr.connect(gain)
  gain.connect(ziskejVystup(ctx))
  gain.gain.setValueAtTime(0.35, cas)
  gain.gain.exponentialRampToValueAtTime(0.01, cas + 0.05)

  sum.start(cas)
  sum.stop(cas + 0.06)
}

const PREHRAVACE: Record<DrumSound, (ctx: AudioContext, cas: number) => void> = {
  kick: hrajKick,
  snare: hrajSnare,
  hihat: hrajHihat,
}

/** Zahraje jeden buben v daný čas (`AudioContext.currentTime`-relativní),
 *  ne okamžitě — plánování v čase je to, co dělá krokový sekvencer
 *  přesným, ne trhaným (viz useBeatSequencer.ts). */
export const naplanujBuben = (ctx: AudioContext, buben: DrumSound, cas: number): void => {
  PREHRAVACE[buben](ctx, cas)
}
