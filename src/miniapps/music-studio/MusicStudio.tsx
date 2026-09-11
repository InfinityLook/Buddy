import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useMusicStudio } from './useMusicStudio'
import { useBeatSequencer } from './useBeatSequencer'
import { getFileBlob, putFileBlob } from '@/core/utils/fileStorage'
import { stahnoutBlob } from '@/core/utils/download'
import { hrajMetronomKlik, vyrenderujPatternNaBuffer, ziskejKontext } from './audioEngine'
import { bufferNaWavBlob } from './wavEncoder'
import { spocitejVrcholyVlny } from './waveform'
import {
  BeatPattern,
  DRUM_LABELS,
  DRUM_SOUNDS,
  DrumSound,
  POCTY_KROKU_NA_VYBER,
  PocetKroku,
  Recording,
  Song,
  prazdnyPattern,
  priponaPodleMime,
  zmenPocetKroku,
} from './types'
import './MusicStudio.css'

// Stejná feature-detekce a stejný MIME-výběr jako ChatView.tsx's
// hlasovky a NahratReelDialog.tsx — appka radši mikrofonní tlačítko
// schová, než aby nabídla něco, co stejně selže.
const PODPORUJE_NAHRAVANI =
  typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia

const vyberMimeType = (): string | undefined =>
  ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((t) => MediaRecorder.isTypeSupported(t))

const formatDelku = (s: number): string => {
  const cele = Math.max(0, Math.round(s))
  const min = Math.floor(cele / 60)
  const sek = cele % 60
  return `${min}:${sek.toString().padStart(2, '0')}`
}

// Výchozí tempo odpočtu, když appka nemá žádný beat, podle kterého by
// se řídila — appka nechce nutit uživatele vybrat beat jen kvůli
// odpočtu.
const DOMYSLENE_BPM_ODPOCTU = 100
const POCET_KLIKU_ODPOCTU = 4

/** Přehraje odpočet (4 kliknutí metronomu, poslední přízvučné) a vrátí
 *  se, až doopravdy doznělo — appka teprve pak spustí mikrofon/beat,
 *  ať odpočet a nahrávání nikdy neběží přes sebe. */
const provedOdpocet = (bpm: number): Promise<void> => {
  const ctx = ziskejKontext()
  const sekundNaDobu = 60 / bpm
  const zacatek = ctx.currentTime + 0.05
  for (let i = 0; i < POCET_KLIKU_ODPOCTU; i++) {
    hrajMetronomKlik(ctx, zacatek + i * sekundNaDobu, i === POCET_KLIKU_ODPOCTU - 1)
  }
  const celkovaDelkaS = zacatek - ctx.currentTime + POCET_KLIKU_ODPOCTU * sekundNaDobu
  return new Promise((resolve) => setTimeout(resolve, celkovaDelkaS * 1000))
}

/** Ořízne dekódovaný zvuk na úsek od–do a vrátí ho jako nový,
 *  vyrenderovaný AudioBuffer — appka appka ho pak zapíše do WAV
 *  (bufferNaWavBlob), protože oříznutý úsek komprimovaného webm/mp4
 *  souboru zpátky do stejného formátu appka nemá čím zapsat. */
const oriznoutBlob = async (blob: Blob, od: number, doo: number): Promise<AudioBuffer> => {
  const arrayBuffer = await blob.arrayBuffer()
  const dekoderCtx = new AudioContext()
  const buffer = await dekoderCtx.decodeAudioData(arrayBuffer)
  await dekoderCtx.close()
  const delkaOrezu = Math.max(0.05, doo - od)
  const offline = new OfflineAudioContext(
    buffer.numberOfChannels,
    Math.ceil(delkaOrezu * buffer.sampleRate),
    buffer.sampleRate
  )
  const zdroj = offline.createBufferSource()
  zdroj.buffer = buffer
  zdroj.connect(offline.destination)
  zdroj.start(0, od, delkaOrezu)
  return offline.startRendering()
}

/** Dekóduje Blob jen kvůli vlnové vizualizaci — appka selhání tiše
 *  ignoruje (vrátí null), vlnovka je bonus, ne podmínka přehrání/uložení. */
const zkusVypocitatVlnu = async (blob: Blob, pocetSloupcu = 60): Promise<number[] | null> => {
  try {
    const arrayBuffer = await blob.arrayBuffer()
    const ctx = new AudioContext()
    const buffer = await ctx.decodeAudioData(arrayBuffer)
    await ctx.close()
    return spocitejVrcholyVlny(buffer, pocetSloupcu)
  } catch {
    return null
  }
}

/** Malý sloupcový graf vlny — stejná "žádná knihovna pro pár sloupců"
 *  zásada jako appčin 14denní graf aktivity jinde v appce, jen appka
 *  tady kreslí amplitudu, ne počet za den. `pozice` (0–1) appka pošle
 *  jen u právě hrající nahrávky, ať appka ví, kolik z vlny je "za
 *  přehrávačem". */
const Vlna: React.FC<{ vrcholy: number[]; pozice?: number }> = ({ vrcholy, pozice }) => (
  <div className="ms-vlna" aria-hidden="true">
    {vrcholy.map((v, i) => {
      const zahrano = pozice !== undefined && i / vrcholy.length <= pozice
      return (
        <span
          key={i}
          className={`ms-vlna-sloupec${zahrano ? ' je-zahrano' : ''}`}
          style={{ height: `${Math.max(6, v * 100)}%` }}
        />
      )
    })}
  </div>
)

type Zalozka = 'beat' | 'nahravani' | 'skladby'

export const MusicStudio: React.FC = () => {
  const {
    patterns,
    recordings,
    songs,
    addPattern,
    deletePattern,
    addRecordingMeta,
    deleteRecording,
    addSong,
    deleteSong,
  } = useMusicStudio()
  const [zalozka, setZalozka] = useState<Zalozka>('beat')

  return (
    <div className="ms-app">
      <div className="ms-header">
        <h2>Music Studio</h2>
      </div>

      <div className="ms-tabs">
        <button className={zalozka === 'beat' ? 'active' : ''} onClick={() => setZalozka('beat')}>
          Beat Maker
        </button>
        <button className={zalozka === 'nahravani' ? 'active' : ''} onClick={() => setZalozka('nahravani')}>
          Nahrávání
        </button>
        <button className={zalozka === 'skladby' ? 'active' : ''} onClick={() => setZalozka('skladby')}>
          Skladby
        </button>
      </div>

      {zalozka === 'beat' && (
        <BeatMakerTab patterns={patterns} addPattern={addPattern} deletePattern={deletePattern} />
      )}
      {zalozka === 'nahravani' && (
        <NahravaniTab
          patterns={patterns}
          recordings={recordings}
          addRecordingMeta={addRecordingMeta}
          deleteRecording={deleteRecording}
        />
      )}
      {zalozka === 'skladby' && (
        <SkladbyTab patterns={patterns} recordings={recordings} songs={songs} addSong={addSong} deleteSong={deleteSong} />
      )}
    </div>
  )
}

// ==========================================
// BEAT MAKER
// ==========================================
interface BeatMakerTabProps {
  patterns: BeatPattern[]
  addPattern: (name: string, pattern: Omit<BeatPattern, 'id' | 'name' | 'createdAt'>) => void
  deletePattern: (id: string) => void
}

const BeatMakerTab: React.FC<BeatMakerTabProps> = ({ patterns, addPattern, deletePattern }) => {
  const [draft, setDraft] = useState(() => prazdnyPattern())
  const [nazev, setNazev] = useState('')
  // Mute/sólo jsou jen dočasná pomůcka při skládání beatu — appka je
  // neukládá spolu s patternem, jen `hlasitosti` (viz types.ts) je
  // skutečná, uložená hodnota mixu.
  const [ztlumene, setZtlumene] = useState<Set<DrumSound>>(new Set())
  const [solo, setSolo] = useState<DrumSound | null>(null)
  const [stahujeSeId, setStahujeSeId] = useState<string | null>(null)

  // Sekvenceru appka dává efektivní hlasitost (po mute/sólu), ne
  // rovnou draft.hlasitosti — jinak by mute/sólo v editoru vůbec nic
  // neztišily.
  const efektivniPattern: BeatPattern = useMemo(() => {
    const hlasitosti = Object.fromEntries(
      DRUM_SOUNDS.map((b) => {
        if (solo && solo !== b) return [b, 0]
        if (ztlumene.has(b)) return [b, 0]
        return [b, draft.hlasitosti[b] ?? 100]
      })
    ) as Record<DrumSound, number>
    return { id: 'draft', name: nazev, createdAt: '', ...draft, hlasitosti }
  }, [draft, nazev, solo, ztlumene])

  const { hraje, aktualniKrok, spustit, zastavit } = useBeatSequencer(efektivniPattern)

  const prepnoutKrok = (buben: DrumSound, index: number) => {
    setDraft((d) => ({
      ...d,
      kroky: { ...d.kroky, [buben]: d.kroky[buben].map((v, i) => (i === index ? !v : v)) },
    }))
  }

  const nastavHlasitost = (buben: DrumSound, hodnota: number) => {
    setDraft((d) => ({ ...d, hlasitosti: { ...d.hlasitosti, [buben]: hodnota } }))
  }

  const prepnoutMute = (buben: DrumSound) => {
    setZtlumene((s) => {
      const novy = new Set(s)
      if (novy.has(buben)) novy.delete(buben)
      else novy.add(buben)
      return novy
    })
  }

  const prepnoutSolo = (buben: DrumSound) => {
    setSolo((s) => (s === buben ? null : buben))
  }

  const zmenDelku = (novyPocet: PocetKroku) => {
    if (novyPocet === draft.pocetKroku) return
    if (hraje) zastavit()
    setDraft((d) => ({ ...d, pocetKroku: novyPocet, kroky: zmenPocetKroku(d.kroky, novyPocet) }))
  }

  const nacistPattern = (p: BeatPattern) => {
    if (hraje) zastavit()
    setZtlumene(new Set())
    setSolo(null)
    setDraft({ bpm: p.bpm, pocetKroku: p.pocetKroku, kroky: p.kroky, hlasitosti: { ...p.hlasitosti } })
    setNazev(p.name)
  }

  const ulozitBeat = () => {
    addPattern(nazev, draft)
    setNazev('')
  }

  const stahnoutPattern = async (p: BeatPattern) => {
    setStahujeSeId(p.id)
    try {
      const buffer = await vyrenderujPatternNaBuffer(p, 4)
      stahnoutBlob(`${p.name}.wav`, bufferNaWavBlob(buffer))
    } finally {
      setStahujeSeId(null)
    }
  }

  return (
    <div className="ms-tab">
      <div className="ms-seq-controls">
        <button className="ms-play-btn" onClick={hraje ? zastavit : spustit} aria-label={hraje ? 'Zastavit' : 'Přehrát'}>
          {hraje ? '⏹️' : '▶️'}
        </button>
        <label className="ms-bpm">
          BPM
          <input
            type="number"
            min={40}
            max={240}
            value={draft.bpm}
            onChange={(e) =>
              setDraft((d) => ({ ...d, bpm: Math.min(240, Math.max(40, Number(e.target.value) || 96)) }))
            }
          />
        </label>
        <div className="ms-delka-prepinac" role="group" aria-label="Délka patternu">
          {POCTY_KROKU_NA_VYBER.map((pocet) => (
            <button
              key={pocet}
              type="button"
              className={draft.pocetKroku === pocet ? 'active' : ''}
              onClick={() => zmenDelku(pocet)}
            >
              {pocet}
            </button>
          ))}
        </div>
      </div>

      <div className="ms-seq-grid">
        {DRUM_SOUNDS.map((buben) => {
          const jeZtlumeny = ztlumene.has(buben)
          const jeSolo = solo === buben
          return (
            <div className="ms-seq-radek-cely" key={buben}>
              <div className="ms-seq-row">
                <span className="ms-seq-label">{DRUM_LABELS[buben]}</span>
                <div
                  className="ms-seq-steps"
                  style={{ gridTemplateColumns: `repeat(${draft.pocetKroku}, 1fr)` }}
                >
                  {draft.kroky[buben].map((zapnuto, i) => (
                    <button
                      key={i}
                      type="button"
                      className={`ms-seq-cell${zapnuto ? ` on-${buben}` : ''}${aktualniKrok === i ? ' playhead' : ''}`}
                      onClick={() => prepnoutKrok(buben, i)}
                      aria-label={`${DRUM_LABELS[buben]}, krok ${i + 1}, ${zapnuto ? 'zapnuto' : 'vypnuto'}`}
                    />
                  ))}
                </div>
              </div>
              <div className="ms-mixer-radek">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={draft.hlasitosti[buben] ?? 100}
                  onChange={(e) => nastavHlasitost(buben, Number(e.target.value))}
                  aria-label={`Hlasitost ${DRUM_LABELS[buben]}`}
                  disabled={jeZtlumeny}
                />
                <button
                  type="button"
                  className={`ms-mixer-btn${jeZtlumeny ? ' je-aktivni' : ''}`}
                  onClick={() => prepnoutMute(buben)}
                  aria-pressed={jeZtlumeny}
                  aria-label={`Ztlumit ${DRUM_LABELS[buben]}`}
                >
                  M
                </button>
                <button
                  type="button"
                  className={`ms-mixer-btn ms-mixer-btn--solo${jeSolo ? ' je-aktivni' : ''}`}
                  onClick={() => prepnoutSolo(buben)}
                  aria-pressed={jeSolo}
                  aria-label={`Sólo ${DRUM_LABELS[buben]}`}
                >
                  S
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="ms-ulozit-radek">
        <input
          type="text"
          placeholder="Název beatu"
          value={nazev}
          onChange={(e) => setNazev(e.target.value)}
          maxLength={40}
        />
        <button className="ms-ulozit-btn" onClick={ulozitBeat}>
          Uložit beat
        </button>
      </div>

      <div className="ms-seznam">
        {patterns.length === 0 && <p className="ms-prazdno">Zatím žádný uložený beat.</p>}
        {patterns.map((p) => (
          <div className="ms-radek" key={p.id}>
            <div className="ms-radek-text">
              <strong>{p.name}</strong>
              <span>
                {p.bpm} BPM · {p.pocetKroku ?? 8} kroků
              </span>
            </div>
            <button className="ms-icon-btn" onClick={() => nacistPattern(p)} aria-label={`Nahrát ${p.name} do editoru`}>
              📥
            </button>
            <button
              className="ms-icon-btn"
              onClick={() => stahnoutPattern(p)}
              disabled={stahujeSeId === p.id}
              aria-label={`Stáhnout ${p.name} jako soubor`}
            >
              {stahujeSeId === p.id ? '⏳' : '⬇️'}
            </button>
            <button className="ms-icon-btn danger" onClick={() => deletePattern(p.id)} aria-label={`Smazat ${p.name}`}>
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ==========================================
// NAHRÁVÁNÍ
// ==========================================
interface Nahled {
  blob: Blob
  mime: string
  delka: number
  url: string
}

interface NahravaniTabProps {
  patterns: BeatPattern[]
  recordings: Recording[]
  addRecordingMeta: (recording: Omit<Recording, 'id' | 'createdAt'>) => string
  deleteRecording: (id: string) => void
}

const NahravaniTab: React.FC<NahravaniTabProps> = ({ patterns, recordings, addRecordingMeta, deleteRecording }) => {
  const [nahravaSe, setNahravaSe] = useState(false)
  const [odpocitava, setOdpocitava] = useState(false)
  const [casS, setCasS] = useState(0)
  const [nahled, setNahled] = useState<Nahled | null>(null)
  const [vlnaNahledu, setVlnaNahledu] = useState<number[] | null>(null)
  const [orezOd, setOrezOd] = useState(0)
  const [orezDo, setOrezDo] = useState(0)
  const [nazev, setNazev] = useState('')
  const [chyba, setChyba] = useState<string | null>(null)
  const [hrajeId, setHrajeId] = useState<string | null>(null)
  const [pozicePrehravani, setPozicePrehravani] = useState(0)
  const [vlnaPrehravane, setVlnaPrehravane] = useState<{ id: string; vrcholy: number[] } | null>(null)

  const [vybranyBeatId, setVybranyBeatId] = useState('')
  const [pouzitOdpocet, setPouzitOdpocet] = useState(false)
  const beatKNahravani = patterns.find((p) => p.id === vybranyBeatId) ?? null
  const { spustit: spustitBeat, zastavit: zastavitBeat } = useBeatSequencer(beatKNahravani)

  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunkyRef = useRef<Blob[]>([])
  const intervalRef = useRef<number | null>(null)
  const nahledRef = useRef<Nahled | null>(null)
  nahledRef.current = nahled
  const audioRef = useRef<HTMLAudioElement>(null)

  const zpracujStop = (delka: number, mime: string, blob: Blob) => {
    setNahled({ blob, mime, delka, url: URL.createObjectURL(blob) })
    setOrezOd(0)
    setOrezDo(delka)
    setVlnaNahledu(null)
    void zkusVypocitatVlnu(blob).then(setVlnaNahledu)
  }

  const spustitNahravani = async () => {
    setChyba(null)
    try {
      if (pouzitOdpocet) {
        setOdpocitava(true)
        await provedOdpocet(beatKNahravani?.bpm ?? DOMYSLENE_BPM_ODPOCTU)
        setOdpocitava(false)
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const typ = vyberMimeType()
      const recorder = new MediaRecorder(stream, typ ? { mimeType: typ } : undefined)
      chunkyRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunkyRef.current.push(e.data)
      }
      recorderRef.current = recorder
      recorder.start()

      // Appka jede jen jako "poslech na cvičení", ne skutečný mix —
      // beat hraje z reproduktoru/sluchátek souběžně s mikrofonem, ale
      // do nahrávky samotné se nedostane (prohlížeč nedovolí mixovat
      // systémový zvuk zpátky do vstupu mikrofonu). Kdo chce beat
      // ve výsledné nahrávce doopravdy slyšet, potřebuje nahrávat
      // s beatem puštěným z jiného zdroje, ne skrz tohle appčino
      // tlačítko.
      if (beatKNahravani) spustitBeat()

      setNahravaSe(true)
      setCasS(0)
      intervalRef.current = window.setInterval(() => setCasS((s) => s + 1), 1000)
    } catch {
      setOdpocitava(false)
      setChyba('Přístup k mikrofonu se nepovedlo získat.')
    }
  }

  const zastavitNahravani = () => {
    const recorder = recorderRef.current
    zastavitBeat()
    if (!recorder) return
    if (intervalRef.current !== null) window.clearInterval(intervalRef.current)
    intervalRef.current = null

    // Uzavřeno přes proměnnou, ne přes state — onstop se spustí až po
    // dalším renderu a čte by jinak zastaralý casS.
    const delka = casS

    recorder.onstop = () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      recorderRef.current = null
      setNahravaSe(false)

      const kusy = chunkyRef.current
      chunkyRef.current = []
      if (kusy.length === 0) return

      const mime = recorder.mimeType || 'audio/webm'
      zpracujStop(delka, mime, new Blob(kusy, { type: mime }))
    }

    recorder.stop()
  }

  const ulozitNahravku = async () => {
    if (!nahled) return
    const opravduOrezano = orezOd > 0.05 || orezDo < nahled.delka - 0.05
    let blobKUlozeni = nahled.blob
    let mimeKUlozeni = nahled.mime
    let delkaKUlozeni = nahled.delka

    if (opravduOrezano) {
      try {
        const oriznuty = await oriznoutBlob(nahled.blob, orezOd, orezDo)
        blobKUlozeni = bufferNaWavBlob(oriznuty)
        mimeKUlozeni = 'audio/wav'
        delkaKUlozeni = Math.max(0.05, orezDo - orezOd)
      } catch {
        // Ořez se nepovedl (nedekódovatelný formát v tomhle
        // prohlížeči) — appka radši uloží nahrávku celou, ne že by ji
        // kvůli tomu zahodila.
      }
    }

    const id = addRecordingMeta({ name: nazev.trim() || 'Nahrávka', mime: mimeKUlozeni, durationSec: delkaKUlozeni })
    await putFileBlob(id, blobKUlozeni)
    URL.revokeObjectURL(nahled.url)
    setNahled(null)
    setVlnaNahledu(null)
    setNazev('')
  }

  const zahoditNahravku = () => {
    if (nahled) URL.revokeObjectURL(nahled.url)
    setNahled(null)
    setVlnaNahledu(null)
    setNazev('')
  }

  const prehratNahravku = async (rec: Recording) => {
    const blob = await getFileBlob(rec.id)
    if (!blob || !audioRef.current) return
    const url = URL.createObjectURL(blob)
    audioRef.current.src = url
    audioRef.current.onended = () => {
      setHrajeId(null)
      URL.revokeObjectURL(url)
    }
    audioRef.current.ontimeupdate = () => {
      const a = audioRef.current
      if (a && a.duration) setPozicePrehravani(a.currentTime / a.duration)
    }
    try {
      await audioRef.current.play()
      setHrajeId(rec.id)
      setPozicePrehravani(0)
      setVlnaPrehravane(null)
      void zkusVypocitatVlnu(blob).then((v) => setVlnaPrehravane(v ? { id: rec.id, vrcholy: v } : null))
    } catch {
      URL.revokeObjectURL(url)
    }
  }

  const zastavitPrehravani = () => {
    audioRef.current?.pause()
    setHrajeId(null)
  }

  const stahnoutNahravku = async (r: Recording) => {
    const blob = await getFileBlob(r.id)
    if (!blob) return
    stahnoutBlob(`${r.name}.${priponaPodleMime(r.mime)}`, blob)
  }

  // Odchod ze záložky (i uprostřed nahrávání) nesmí nechat mikrofon
  // svítit na pozadí — stejná disciplína jako ChatView.tsx's hlasovky
  // nebo usePoseEngine.ts's kamera.
  useEffect(
    () => () => {
      if (intervalRef.current !== null) window.clearInterval(intervalRef.current)
      streamRef.current?.getTracks().forEach((t) => t.stop())
      if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop()
      if (nahledRef.current) URL.revokeObjectURL(nahledRef.current.url)
    },
    []
  )

  return (
    <div className="ms-tab">
      <audio ref={audioRef} hidden />

      {!PODPORUJE_NAHRAVANI ? (
        <p className="ms-prazdno">Tenhle prohlížeč neumí nahrávat zvuk z mikrofonu.</p>
      ) : nahled ? (
        <div className="ms-nahled">
          {vlnaNahledu && <Vlna vrcholy={vlnaNahledu} />}
          <audio controls src={nahled.url} className="ms-nahled-prehravac" />
          <span className="ms-nahled-delka">{formatDelku(nahled.delka)}</span>

          <div className="ms-orez-radek">
            <label>
              Od {formatDelku(orezOd)}
              <input
                type="range"
                min={0}
                max={Math.max(0.1, nahled.delka)}
                step={0.1}
                value={orezOd}
                onChange={(e) => setOrezOd(Math.min(Number(e.target.value), orezDo - 0.1))}
              />
            </label>
            <label>
              Do {formatDelku(orezDo)}
              <input
                type="range"
                min={0}
                max={Math.max(0.1, nahled.delka)}
                step={0.1}
                value={orezDo}
                onChange={(e) => setOrezDo(Math.max(Number(e.target.value), orezOd + 0.1))}
              />
            </label>
          </div>

          <input
            type="text"
            placeholder="Název nahrávky"
            value={nazev}
            onChange={(e) => setNazev(e.target.value)}
            maxLength={40}
          />
          <div className="ms-nahled-akce">
            <button className="ms-ulozit-btn" onClick={ulozitNahravku}>
              Uložit
            </button>
            <button className="ms-zahodit-btn" onClick={zahoditNahravku}>
              Zahodit
            </button>
          </div>
        </div>
      ) : (
        <div className="ms-rec-hero">
          {patterns.length > 0 && (
            <div className="ms-rec-nastaveni">
              <label>
                Hrát beat při nahrávání
                <select value={vybranyBeatId} onChange={(e) => setVybranyBeatId(e.target.value)} disabled={nahravaSe || odpocitava}>
                  <option value="">Bez beatu</option>
                  {patterns.map((p) => (
                    <option key={p.id} value={p.id}>
                      🥁 {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="ms-checkbox-radek">
                <input
                  type="checkbox"
                  checked={pouzitOdpocet}
                  onChange={(e) => setPouzitOdpocet(e.target.checked)}
                  disabled={nahravaSe || odpocitava}
                />
                Odpočet před nahráváním (4 kliknutí)
              </label>
            </div>
          )}
          {patterns.length === 0 && (
            <label className="ms-checkbox-radek">
              <input
                type="checkbox"
                checked={pouzitOdpocet}
                onChange={(e) => setPouzitOdpocet(e.target.checked)}
                disabled={nahravaSe || odpocitava}
              />
              Odpočet před nahráváním (4 kliknutí)
            </label>
          )}

          <button
            className={`ms-rec-btn${nahravaSe ? ' je-aktivni' : ''}`}
            onClick={nahravaSe ? zastavitNahravani : spustitNahravani}
            disabled={odpocitava}
            aria-label={nahravaSe ? 'Zastavit nahrávání' : 'Začít nahrávat'}
          >
            {nahravaSe ? '⏹️' : '⏺️'}
          </button>
          {odpocitava && <span className="ms-odpocet-znacka">Odpočet…</span>}
          <span className="ms-rec-timer">{formatDelku(casS)}</span>
          {chyba && <p className="ms-chyba">{chyba}</p>}
        </div>
      )}

      <div className="ms-seznam">
        {recordings.length === 0 && <p className="ms-prazdno">Zatím žádná uložená nahrávka.</p>}
        {recordings.map((r) => (
          <div className="ms-radek-wrap" key={r.id}>
            <div className="ms-radek">
              <div className="ms-radek-text">
                <strong>{r.name}</strong>
                <span>{formatDelku(r.durationSec)}</span>
              </div>
              <button
                className="ms-icon-btn"
                onClick={() => (hrajeId === r.id ? zastavitPrehravani() : prehratNahravku(r))}
                aria-label={hrajeId === r.id ? `Zastavit ${r.name}` : `Přehrát ${r.name}`}
              >
                {hrajeId === r.id ? '⏹️' : '▶️'}
              </button>
              <button className="ms-icon-btn" onClick={() => stahnoutNahravku(r)} aria-label={`Stáhnout ${r.name}`}>
                ⬇️
              </button>
              <button className="ms-icon-btn danger" onClick={() => deleteRecording(r.id)} aria-label={`Smazat ${r.name}`}>
                ✕
              </button>
            </div>
            {hrajeId === r.id && vlnaPrehravane?.id === r.id && (
              <Vlna vrcholy={vlnaPrehravane.vrcholy} pozice={pozicePrehravani} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ==========================================
// SKLADBY
// ==========================================
interface SkladbyTabProps {
  patterns: BeatPattern[]
  recordings: Recording[]
  songs: Song[]
  addSong: (
    name: string,
    beatPatternId: string | null,
    recordingId: string | null,
    pocetOpakovaniBeatu: number,
    hlasitostBeatu: number,
    hlasitostNahravky: number
  ) => void
  deleteSong: (id: string) => void
}

const SkladbyTab: React.FC<SkladbyTabProps> = ({ patterns, recordings, songs, addSong, deleteSong }) => {
  const [nazev, setNazev] = useState('')
  const [vybranyBeat, setVybranyBeat] = useState('')
  const [vybranaNahravka, setVybranaNahravka] = useState('')
  const [pocetOpakovaniBeatu, setPocetOpakovaniBeatu] = useState(0)
  const [hlasitostBeatu, setHlasitostBeatu] = useState(100)
  const [hlasitostNahravky, setHlasitostNahravky] = useState(100)
  const [hrajeSongId, setHrajeSongId] = useState<string | null>(null)

  const audioRef = useRef<HTMLAudioElement>(null)
  const opakovaniRef = useRef(0)
  const zastavitBeatRef = useRef<() => void>(() => {})

  const hrajiciSong = songs.find((s) => s.id === hrajeSongId) ?? null
  const hrajiciPattern = patterns.find((p) => p.id === hrajiciSong?.beatPatternId) ?? null

  // Vyvážení skladby appka aplikuje na kopii patternu, ne na uložený
  // originál — hlasitostBeatu je násobička NAD hlasitosti jednotlivých
  // bubnů, co má pattern sám o sobě (viz Beat Maker's mixér výš).
  const efektivniPattern: BeatPattern | null = useMemo(() => {
    if (!hrajiciPattern || !hrajiciSong) return hrajiciPattern
    const nasobic = hrajiciSong.hlasitostBeatu / 100
    const hlasitosti = Object.fromEntries(
      DRUM_SOUNDS.map((b) => [b, Math.round((hrajiciPattern.hlasitosti?.[b] ?? 100) * nasobic)])
    ) as Record<DrumSound, number>
    return { ...hrajiciPattern, hlasitosti }
  }, [hrajiciPattern, hrajiciSong])

  const onOpakovaniBeatu = () => {
    opakovaniRef.current += 1
    const limit = hrajiciSong?.pocetOpakovaniBeatu ?? 0
    if (limit > 0 && opakovaniRef.current >= limit) {
      zastavitBeatRef.current()
      // Skladba jen z beatu (bez nahrávky) nemá jiný způsob, jak
      // poznat konec — appka proto po dosažení limitu rovnou vrátí
      // tlačítko na "Přehrát", ať appka nezůstane vypadat, že pořád
      // něco hraje.
      if (!hrajiciSong?.recordingId) setHrajeSongId(null)
    }
  }

  const { spustit, zastavit } = useBeatSequencer(efektivniPattern, onOpakovaniBeatu)
  zastavitBeatRef.current = zastavit

  // Sekvencer se spustí/zastaví, až jakmile hrajiciPattern doopravdy
  // odpovídá nově zvolené skladbě (patternRef uvnitř hooku se
  // aktualizuje na začátku renderu, ne až tady) — volání spustit()
  // rovnou v prehratSkladbu by ještě vidělo starý pattern z
  // předchozího renderu.
  useEffect(() => {
    opakovaniRef.current = 0
    if (hrajiciSong) spustit()
    else zastavit()
  }, [hrajiciSong, spustit, zastavit])

  const pridatSkladbu = () => {
    if (!vybranyBeat && !vybranaNahravka) return
    addSong(nazev, vybranyBeat || null, vybranaNahravka || null, pocetOpakovaniBeatu, hlasitostBeatu, hlasitostNahravky)
    setNazev('')
    setVybranyBeat('')
    setVybranaNahravka('')
    setPocetOpakovaniBeatu(0)
    setHlasitostBeatu(100)
    setHlasitostNahravky(100)
  }

  const prehratSkladbu = async (song: Song) => {
    audioRef.current?.pause()
    setHrajeSongId(song.id)

    if (song.recordingId) {
      const rec = recordings.find((r) => r.id === song.recordingId)
      const blob = rec ? await getFileBlob(rec.id) : null
      if (blob && audioRef.current) {
        const url = URL.createObjectURL(blob)
        audioRef.current.src = url
        audioRef.current.volume = (song.hlasitostNahravky ?? 100) / 100
        audioRef.current.onended = () => {
          URL.revokeObjectURL(url)
          setHrajeSongId(null)
        }
        void audioRef.current.play()
      }
    }
  }

  const zastavitSkladbu = () => {
    setHrajeSongId(null)
    audioRef.current?.pause()
    if (audioRef.current) audioRef.current.currentTime = 0
  }

  useEffect(() => () => zastavit(), [zastavit])

  return (
    <div className="ms-tab">
      <audio ref={audioRef} hidden />

      <div className="ms-nova-skladba">
        <input type="text" placeholder="Název skladby" value={nazev} onChange={(e) => setNazev(e.target.value)} maxLength={40} />
        <select value={vybranyBeat} onChange={(e) => setVybranyBeat(e.target.value)}>
          <option value="">Bez beatu</option>
          {patterns.map((p) => (
            <option key={p.id} value={p.id}>
              🥁 {p.name}
            </option>
          ))}
        </select>
        <select value={vybranaNahravka} onChange={(e) => setVybranaNahravka(e.target.value)}>
          <option value="">Bez nahrávky</option>
          {recordings.map((r) => (
            <option key={r.id} value={r.id}>
              🎤 {r.name}
            </option>
          ))}
        </select>

        {vybranyBeat && (
          <div className="ms-vyvazeni">
            <label>
              Opakování beatu ({pocetOpakovaniBeatu === 0 ? 'dokud hraje nahrávka' : `${pocetOpakovaniBeatu}×`})
              <input
                type="number"
                min={0}
                max={99}
                value={pocetOpakovaniBeatu}
                onChange={(e) => setPocetOpakovaniBeatu(Math.max(0, Math.round(Number(e.target.value) || 0)))}
              />
            </label>
            <label>
              Hlasitost beatu {hlasitostBeatu}%
              <input type="range" min={0} max={100} value={hlasitostBeatu} onChange={(e) => setHlasitostBeatu(Number(e.target.value))} />
            </label>
          </div>
        )}
        {vybranaNahravka && (
          <div className="ms-vyvazeni">
            <label>
              Hlasitost nahrávky {hlasitostNahravky}%
              <input
                type="range"
                min={0}
                max={100}
                value={hlasitostNahravky}
                onChange={(e) => setHlasitostNahravky(Number(e.target.value))}
              />
            </label>
          </div>
        )}

        <button className="ms-ulozit-btn" disabled={!vybranyBeat && !vybranaNahravka} onClick={pridatSkladbu}>
          Uložit skladbu
        </button>
      </div>

      <div className="ms-seznam">
        {songs.length === 0 && <p className="ms-prazdno">Zatím žádná skladba. Spoj beat a nahrávku výš.</p>}
        {songs.map((s) => {
          const beat = patterns.find((p) => p.id === s.beatPatternId)
          const nahravka = recordings.find((r) => r.id === s.recordingId)
          return (
            <div className="ms-radek" key={s.id}>
              <div className="ms-radek-text">
                <strong>{s.name}</strong>
                <span>
                  {beat ? `🥁 ${beat.name}${s.pocetOpakovaniBeatu ? ` ×${s.pocetOpakovaniBeatu}` : ''}` : ''}
                  {beat && nahravka ? ' · ' : ''}
                  {nahravka ? `🎤 ${nahravka.name}` : ''}
                  {!beat && !nahravka ? '—' : ''}
                </span>
              </div>
              <button
                className="ms-icon-btn"
                onClick={() => (hrajeSongId === s.id ? zastavitSkladbu() : prehratSkladbu(s))}
                aria-label={hrajeSongId === s.id ? `Zastavit ${s.name}` : `Přehrát ${s.name}`}
              >
                {hrajeSongId === s.id ? '⏹️' : '▶️'}
              </button>
              <button className="ms-icon-btn danger" onClick={() => deleteSong(s.id)} aria-label={`Smazat ${s.name}`}>
                ✕
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
