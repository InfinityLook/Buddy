import React, { useEffect, useRef, useState } from 'react'
import { useMusicStudio } from './useMusicStudio'
import { useBeatSequencer } from './useBeatSequencer'
import { getFileBlob, putFileBlob } from '@/core/utils/fileStorage'
import {
  BeatPattern,
  DRUM_LABELS,
  DRUM_SOUNDS,
  DrumSound,
  Recording,
  Song,
  prazdnyPattern,
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
        <NahravaniTab recordings={recordings} addRecordingMeta={addRecordingMeta} deleteRecording={deleteRecording} />
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

  // Sekvenceru appka nedává skutečný BeatPattern (ten existuje, až se
  // uloží) — id/createdAt jsou tu jen výplň, hook čte jen bpm/kroky.
  const draftJakoPattern: BeatPattern = { id: 'draft', name: nazev, createdAt: '', ...draft }
  const { hraje, aktualniKrok, spustit, zastavit } = useBeatSequencer(draftJakoPattern)

  const prepnoutKrok = (buben: DrumSound, index: number) => {
    setDraft((d) => ({
      ...d,
      kroky: { ...d.kroky, [buben]: d.kroky[buben].map((v, i) => (i === index ? !v : v)) },
    }))
  }

  const nacistPattern = (p: BeatPattern) => {
    if (hraje) zastavit()
    setDraft({ bpm: p.bpm, kroky: p.kroky })
    setNazev(p.name)
  }

  const ulozitBeat = () => {
    addPattern(nazev, draft)
    setNazev('')
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
      </div>

      <div className="ms-seq-grid">
        {DRUM_SOUNDS.map((buben) => (
          <div className="ms-seq-row" key={buben}>
            <span className="ms-seq-label">{DRUM_LABELS[buben]}</span>
            <div className="ms-seq-steps">
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
        ))}
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
              <span>{p.bpm} BPM</span>
            </div>
            <button className="ms-icon-btn" onClick={() => nacistPattern(p)} aria-label={`Nahrát ${p.name} do editoru`}>
              📥
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
  recordings: Recording[]
  addRecordingMeta: (recording: Omit<Recording, 'id' | 'createdAt'>) => string
  deleteRecording: (id: string) => void
}

const NahravaniTab: React.FC<NahravaniTabProps> = ({ recordings, addRecordingMeta, deleteRecording }) => {
  const [nahravaSe, setNahravaSe] = useState(false)
  const [casS, setCasS] = useState(0)
  const [nahled, setNahled] = useState<Nahled | null>(null)
  const [nazev, setNazev] = useState('')
  const [chyba, setChyba] = useState<string | null>(null)
  const [hrajeId, setHrajeId] = useState<string | null>(null)

  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunkyRef = useRef<Blob[]>([])
  const intervalRef = useRef<number | null>(null)
  const nahledRef = useRef<Nahled | null>(null)
  nahledRef.current = nahled
  const audioRef = useRef<HTMLAudioElement>(null)

  const spustitNahravani = async () => {
    setChyba(null)
    try {
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

      setNahravaSe(true)
      setCasS(0)
      intervalRef.current = window.setInterval(() => setCasS((s) => s + 1), 1000)
    } catch {
      setChyba('Přístup k mikrofonu se nepovedlo získat.')
    }
  }

  const zastavitNahravani = () => {
    const recorder = recorderRef.current
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
      const blob = new Blob(kusy, { type: mime })
      setNahled({ blob, mime, delka, url: URL.createObjectURL(blob) })
    }

    recorder.stop()
  }

  const ulozitNahravku = async () => {
    if (!nahled) return
    const id = addRecordingMeta({ name: nazev.trim() || 'Nahrávka', mime: nahled.mime, durationSec: nahled.delka })
    await putFileBlob(id, nahled.blob)
    URL.revokeObjectURL(nahled.url)
    setNahled(null)
    setNazev('')
  }

  const zahoditNahravku = () => {
    if (nahled) URL.revokeObjectURL(nahled.url)
    setNahled(null)
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
    try {
      await audioRef.current.play()
      setHrajeId(rec.id)
    } catch {
      URL.revokeObjectURL(url)
    }
  }

  const zastavitPrehravani = () => {
    audioRef.current?.pause()
    setHrajeId(null)
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
          <audio controls src={nahled.url} className="ms-nahled-prehravac" />
          <span className="ms-nahled-delka">{formatDelku(nahled.delka)}</span>
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
          <button
            className={`ms-rec-btn${nahravaSe ? ' je-aktivni' : ''}`}
            onClick={nahravaSe ? zastavitNahravani : spustitNahravani}
            aria-label={nahravaSe ? 'Zastavit nahrávání' : 'Začít nahrávat'}
          >
            {nahravaSe ? '⏹️' : '⏺️'}
          </button>
          <span className="ms-rec-timer">{formatDelku(casS)}</span>
          {chyba && <p className="ms-chyba">{chyba}</p>}
        </div>
      )}

      <div className="ms-seznam">
        {recordings.length === 0 && <p className="ms-prazdno">Zatím žádná uložená nahrávka.</p>}
        {recordings.map((r) => (
          <div className="ms-radek" key={r.id}>
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
            <button className="ms-icon-btn danger" onClick={() => deleteRecording(r.id)} aria-label={`Smazat ${r.name}`}>
              ✕
            </button>
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
  addSong: (name: string, beatPatternId: string | null, recordingId: string | null) => void
  deleteSong: (id: string) => void
}

const SkladbyTab: React.FC<SkladbyTabProps> = ({ patterns, recordings, songs, addSong, deleteSong }) => {
  const [nazev, setNazev] = useState('')
  const [vybranyBeat, setVybranyBeat] = useState('')
  const [vybranaNahravka, setVybranaNahravka] = useState('')
  const [hrajeSongId, setHrajeSongId] = useState<string | null>(null)

  const audioRef = useRef<HTMLAudioElement>(null)

  const hrajiciSong = songs.find((s) => s.id === hrajeSongId) ?? null
  const hrajiciPattern = patterns.find((p) => p.id === hrajiciSong?.beatPatternId) ?? null
  const { spustit, zastavit } = useBeatSequencer(hrajiciPattern)

  // Sekvencer se spustí/zastaví, až jakmile hrajiciPattern doopravdy
  // odpovídá nově zvolené skladbě (patternRef uvnitř hooku se
  // aktualizuje na začátku renderu, ne až tady) — volání spustit()
  // rovnou v prehratSkladbu by ještě vidělo starý pattern z
  // předchozího renderu.
  useEffect(() => {
    if (hrajiciSong) spustit()
    else zastavit()
  }, [hrajiciSong, spustit, zastavit])

  const pridatSkladbu = () => {
    if (!vybranyBeat && !vybranaNahravka) return
    addSong(nazev, vybranyBeat || null, vybranaNahravka || null)
    setNazev('')
    setVybranyBeat('')
    setVybranaNahravka('')
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
        audioRef.current.onended = () => URL.revokeObjectURL(url)
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
                  {beat ? `🥁 ${beat.name}` : ''}
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
