import { useZvukStore, ziskejHlasitost } from '@/core/store/useZvukStore'
import { DRUM_SOUNDS, KROKU_V_PATTERNU, type BeatPattern, type DrumSound } from './types'

// ==========================================
// Syntetizované bicí — stejná "Web Audio, žádný knihovna, žádný soubor
// navíc" zásada jako core/utils/notify.ts's zvuk dokončení nebo
// src/fighting/sound.ts's efekty v Souboji. Appka nemá (a nemá jak
// levně sehnat) skutečné, licenčně čisté vzorky bicích — syntézní
// triky (sweep sinus pro kick, filtrovaný šum pro snare/hi-hat/clap,
// tónová obálka pro tom) zní jako skutečné bicí a appce nestojí ani
// korunu ani megabajt navíc.
//
// Každý přehrávač (hrajKick/…/hrajTom) bere `ctx: BaseAudioContext`,
// ne konkrétní `AudioContext` — to je jediné, co dovoluje ty samé
// funkce použít i pro OfflineAudioContext (vyrenderujPatternNaBuffer
// níž, appčino "stažení beatu jako WAV"), protože obě rozhraní sdílí
// přesně tohle společné rodičovské rozhraní. `vystup` appka posílá
// explicitně místo spoléhat na sdílený masterGain, protože ten patří
// jedinému živému, sdílenému AudioContextu — kdyby appka zkusila
// připojit uzel offline kontextu na masterGain živého, prohlížeč by to
// zamítl s "cannot connect nodes from different contexts".
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
const ziskejVystup = (ctx: BaseAudioContext): AudioNode => masterGain ?? ctx.destination

/** Násobička hlasitosti 0–100 % na skutečný gain koeficient — nikdy
 *  přesně 0, ať appka nemusí řešit exponenciální rampu k nule (viz
 *  volající níž, co hlasitost 0 stejně vůbec nenaplánují). */
const naSilu = (hlasitost: number): number => Math.max(0.0001, hlasitost / 100)

/** Krátký šumový buffer, znovu vytvořený jen jednou a pak sdílený mezi
 *  snare/hi-hat/clap — všechny tři potřebují bílý šum, jen jinak
 *  filtrovaný. Sdílený jen pro jeden konkrétní vzorkovací kmitočet —
 *  živý a offline kontext ho typicky mají stejný (44100/48000 Hz), ale
 *  appka to nepředpokládá naslepo.
 */
let sdilenySum: AudioBuffer | null = null
const ziskejSum = (ctx: BaseAudioContext): AudioBuffer => {
  if (sdilenySum && sdilenySum.sampleRate === ctx.sampleRate) return sdilenySum
  const delkaVzorku = ctx.sampleRate * 0.3
  const buffer = ctx.createBuffer(1, delkaVzorku, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < delkaVzorku; i++) data[i] = Math.random() * 2 - 1
  sdilenySum = buffer
  return buffer
}

const hrajKick = (ctx: BaseAudioContext, cas: number, vystup: AudioNode, hlasitost: number) => {
  const sila = naSilu(hlasitost)
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(vystup)

  osc.frequency.setValueAtTime(150, cas)
  osc.frequency.exponentialRampToValueAtTime(40, cas + 0.15)
  gain.gain.setValueAtTime(sila, cas)
  gain.gain.exponentialRampToValueAtTime(0.0001 * sila, cas + 0.2)

  osc.start(cas)
  osc.stop(cas + 0.22)
}

const hrajSnare = (ctx: BaseAudioContext, cas: number, vystup: AudioNode, hlasitost: number) => {
  const sila = naSilu(hlasitost)
  // Šumová složka — hlavní "crack"
  const sum = ctx.createBufferSource()
  sum.buffer = ziskejSum(ctx)
  const sumFiltr = ctx.createBiquadFilter()
  sumFiltr.type = 'highpass'
  sumFiltr.frequency.value = 1000
  const sumGain = ctx.createGain()
  sum.connect(sumFiltr)
  sumFiltr.connect(sumGain)
  sumGain.connect(vystup)
  sumGain.gain.setValueAtTime(0.7 * sila, cas)
  sumGain.gain.exponentialRampToValueAtTime(0.01 * sila, cas + 0.15)

  // Tónová složka — "tělo" bubnu pod šumem
  const osc = ctx.createOscillator()
  osc.type = 'triangle'
  osc.frequency.value = 180
  const oscGain = ctx.createGain()
  osc.connect(oscGain)
  oscGain.connect(vystup)
  oscGain.gain.setValueAtTime(0.4 * sila, cas)
  oscGain.gain.exponentialRampToValueAtTime(0.01 * sila, cas + 0.1)

  sum.start(cas)
  sum.stop(cas + 0.15)
  osc.start(cas)
  osc.stop(cas + 0.1)
}

const hrajHihat = (ctx: BaseAudioContext, cas: number, vystup: AudioNode, hlasitost: number) => {
  const sila = naSilu(hlasitost)
  const sum = ctx.createBufferSource()
  sum.buffer = ziskejSum(ctx)
  const filtr = ctx.createBiquadFilter()
  filtr.type = 'highpass'
  filtr.frequency.value = 7000
  const gain = ctx.createGain()
  sum.connect(filtr)
  filtr.connect(gain)
  gain.connect(vystup)
  gain.gain.setValueAtTime(0.35 * sila, cas)
  gain.gain.exponentialRampToValueAtTime(0.01 * sila, cas + 0.05)

  sum.start(cas)
  sum.stop(cas + 0.06)
}

/** Clap — pár krátkých, mírně rozestřených šumových "plesknutí" místo
 *  jednoho, ať to zní jako tlesknutí dlaněmi, ne jako druhý hi-hat. */
const hrajClap = (ctx: BaseAudioContext, cas: number, vystup: AudioNode, hlasitost: number) => {
  const sila = naSilu(hlasitost)
  const zpozdeni = [0, 0.01, 0.02]
  for (const posun of zpozdeni) {
    const zacatek = cas + posun
    const sum = ctx.createBufferSource()
    sum.buffer = ziskejSum(ctx)
    const filtr = ctx.createBiquadFilter()
    filtr.type = 'bandpass'
    filtr.frequency.value = 1200
    filtr.Q.value = 1.2
    const gain = ctx.createGain()
    sum.connect(filtr)
    filtr.connect(gain)
    gain.connect(vystup)
    gain.gain.setValueAtTime(0.55 * sila, zacatek)
    gain.gain.exponentialRampToValueAtTime(0.01 * sila, zacatek + 0.08)
    sum.start(zacatek)
    sum.stop(zacatek + 0.09)
  }
}

/** Tom — podobná stavba jako kick (sweep sinus), jen výš laděný a bez
 *  tak prudkého poklesu, ať zní jako buben, ne jako druhý kick. */
const hrajTom = (ctx: BaseAudioContext, cas: number, vystup: AudioNode, hlasitost: number) => {
  const sila = naSilu(hlasitost)
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(vystup)

  osc.frequency.setValueAtTime(220, cas)
  osc.frequency.exponentialRampToValueAtTime(110, cas + 0.18)
  gain.gain.setValueAtTime(sila, cas)
  gain.gain.exponentialRampToValueAtTime(0.0001 * sila, cas + 0.28)

  osc.start(cas)
  osc.stop(cas + 0.3)
}

const PREHRAVACE: Record<DrumSound, (ctx: BaseAudioContext, cas: number, vystup: AudioNode, hlasitost: number) => void> = {
  kick: hrajKick,
  snare: hrajSnare,
  hihat: hrajHihat,
  clap: hrajClap,
  tom: hrajTom,
}

/** Zahraje jeden buben v daný čas (`AudioContext.currentTime`-relativní),
 *  ne okamžitě — plánování v čase je to, co dělá krokový sekvencer
 *  přesným, ne trhaným (viz useBeatSequencer.ts). `vystup` appka
 *  posílá explicitně jen při offline renderu (viz
 *  vyrenderujPatternNaBuffer níž) — živé přehrávání ho nechává na
 *  ziskejVystup (sdílený masterGain). */
export const naplanujBuben = (
  ctx: BaseAudioContext,
  buben: DrumSound,
  cas: number,
  hlasitost = 100,
  vystup?: AudioNode
): void => {
  PREHRAVACE[buben](ctx, cas, vystup ?? ziskejVystup(ctx), hlasitost)
}

/** Krátký "klik" metronomu pro odpočet před nahráváním — sinusový
 *  blip, zvukem záměrně odlišný od hi-hat/clap výš, ať se odpočet
 *  nepletl se zvukem hrajícího beatu. `prizvuk` (na dobu 1) zní o
 *  kmitočet výš, stejný trik, jaký skutečný metronom používá pro
 *  odlišení první doby taktu. */
export const hrajMetronomKlik = (ctx: BaseAudioContext, cas: number, prizvuk: boolean): void => {
  const vystup = ziskejVystup(ctx)
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(vystup)

  osc.type = 'sine'
  osc.frequency.value = prizvuk ? 1500 : 1000
  gain.gain.setValueAtTime(0.5, cas)
  gain.gain.exponentialRampToValueAtTime(0.001, cas + 0.05)

  osc.start(cas)
  osc.stop(cas + 0.06)
}

/** Vyrenderuje celý pattern (se svou vlastní hlasitostí na buben) do
 *  skutečného audio bufferu přes OfflineAudioContext — appčino
 *  "stažení beatu jako soubor" (viz wavEncoder.ts pro zápis do WAV) se
 *  bez tohohle neobejde, protože appka bicí syntetizuje živě, ne z
 *  hotového souboru, takže nemá co jinak stáhnout. `pocetOpakovani`
 *  appka nechává na volajícím (Beat Maker nabízí pevnou volbu, ne
 *  libovolné číslo) — 4 opakování je rozumná výchozí délka na
 *  poslech/použití mimo appku, ne jediný, moc krátký takt. */
export const vyrenderujPatternNaBuffer = async (
  pattern: BeatPattern,
  pocetOpakovani = 4
): Promise<AudioBuffer> => {
  const pocetKroku = pattern.pocetKroku ?? KROKU_V_PATTERNU
  const krokyNaDobu = pocetKroku / 4
  const sekundNaKrok = 60 / pattern.bpm / krokyNaDobu
  const delkaOpakovani = sekundNaKrok * pocetKroku
  const opakovani = Math.max(1, pocetOpakovani)
  // +0.3 s rezerva na dozvuk posledního zahraného zvuku (kick/tom mají
  // obálku delší než jeden krok) — appka bez ní ořízne poslední ránu.
  const celkovaDelka = delkaOpakovani * opakovani + 0.3
  const vzorkovaciFrekvence = 44100
  const offline = new OfflineAudioContext(2, Math.ceil(celkovaDelka * vzorkovaciFrekvence), vzorkovaciFrekvence)

  for (let opak = 0; opak < opakovani; opak++) {
    for (let krok = 0; krok < pocetKroku; krok++) {
      const cas = opak * delkaOpakovani + krok * sekundNaKrok
      for (const buben of DRUM_SOUNDS) {
        const hlasitost = pattern.hlasitosti?.[buben] ?? 100
        if (pattern.kroky[buben]?.[krok] && hlasitost > 0) {
          naplanujBuben(offline, buben, cas, hlasitost, offline.destination)
        }
      }
    }
  }

  return offline.startRendering()
}
