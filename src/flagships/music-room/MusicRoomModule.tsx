import React, { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/core/store/useAppStore'
import { useMusicStudio } from '@/miniapps/music-studio/useMusicStudio'
import { useBeatSequencer } from '@/miniapps/music-studio/useBeatSequencer'
import { DRUM_LABELS, DRUM_SOUNDS } from '@/miniapps/music-studio/types'
import { getFileBlob } from '@/core/utils/fileStorage'
import { AppIcon } from '@/pages/app/components/AppIcon'
import { FlagshipShell } from '../shared/FlagshipShell'
import { NastrojeSheet } from '../shared/NastrojeSheet'
import type { FlagshipDlazdice, FlagshipVelkaKarta } from '../shared/types'
import './MusicRoomModule.css'

// ==========================================
// Music Room — pátá vlajková appka. Na rozdíl od School/Fitness/Economy/
// Growth Roomu nepřesouvá existující miniaplikaci z hlavní mřížky (ta
// appka do teď žádnou tvorbu hudby neměla vůbec) — Music Studio
// (viz src/miniapps/music-studio/) je nová appka, rovnou postavená
// s jenVeVlajkoveAppce: true, takže se v /apps nikdy neobjevila.
//
// Tělo je vlastní přehled (žádný "Můj widget" panel, stejně jako
// Fitness/Economy/Growth Room) — reálné počty beatů/nahrávek/skladeb,
// skutečný přehratelný náhled posledního uloženého beatu a poslední
// uložené nahrávky. "Vzorky nástrojů" z odsouhlaseného návrhu se
// nestavěly — appka nemá ověřenou cestu, jak si obstarat reálné,
// licenčně čisté zvukové soubory nástrojů v týhle relaci, takže druhá
// velká karta zůstala stejná "Apps" zkratka jako u Growth Roomu,
// ne fiktivní stažený balíček. Bicí zvuky samotné (viz audioEngine.ts)
// jsou opravdu reálně syntetizované Web Audiem, ne fingované.
// ==========================================

const MAX_NAHLED_NAHRAVEK = 2

export const MusicRoomModule: React.FC = () => {
  const navigate = useNavigate()
  const setActiveAppId = useAppStore((s) => s.setActiveAppId)
  const { patterns, recordings, songs } = useMusicStudio()
  const [notifOpen, setNotifOpen] = useState(false)
  const [appsOtevrene, setAppsOtevrene] = useState(false)

  const posledniBeat = patterns[0] ?? null
  const { hraje, aktualniKrok, spustit, zastavit } = useBeatSequencer(posledniBeat)

  const [hrajeNahravkaId, setHrajeNahravkaId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  const otevritMusicStudio = () => {
    setActiveAppId('music-studio', '/music')
    navigate('/apps')
  }

  const prehratNahravku = async (id: string) => {
    const blob = await getFileBlob(id)
    if (!blob || !audioRef.current) return
    const url = URL.createObjectURL(blob)
    audioRef.current.src = url
    audioRef.current.onended = () => {
      setHrajeNahravkaId(null)
      URL.revokeObjectURL(url)
    }
    try {
      await audioRef.current.play()
      setHrajeNahravkaId(id)
    } catch {
      URL.revokeObjectURL(url)
    }
  }

  const zastavitNahravku = () => {
    audioRef.current?.pause()
    setHrajeNahravkaId(null)
  }

  const nastroje: FlagshipDlazdice[] = [
    {
      id: 'music-studio',
      nazev: 'Music Studio',
      popis: 'Beat Maker, nahrávání a skladby',
      ikona: 'music',
      barva: 'orange',
      onClick: otevritMusicStudio,
    },
  ]

  const velkeKarty: FlagshipVelkaKarta[] = [
    {
      id: 'soubory',
      nazev: 'Soubory',
      popis: 'Ukládej a spravuj své zvukové nápady',
      ikona: 'file-manager',
      barva: 'cyan',
      onClick: () => {
        setActiveAppId('file-manager', '/music')
        navigate('/apps')
      },
    },
    {
      id: 'apps',
      nazev: 'Apps',
      popis: 'Music Studio a další tvůrčí nástroje',
      ikona: 'grid',
      barva: 'purple',
      onClick: () => setAppsOtevrene(true),
    },
  ]

  return (
    <>
      <FlagshipShell
        nazev="Music Room"
        popisHlavicky="Tvoř beaty, nahrávky a skladby"
        ikonaHlavicky="music"
        velkeKarty={velkeKarty}
        notifOpen={notifOpen}
        onOpenNotifications={() => setNotifOpen(true)}
        onCloseNotifications={() => setNotifOpen(false)}
      >
        <audio ref={audioRef} hidden />

        <div className="mur-panel">
          <div className="mur-panel-hlavicka">
            <h2>Moje tvorba</h2>
          </div>
          <div className="mur-staty-mrizka">
            <div className="mur-stat-dlazdice">
              <span className="mur-stat-cislo">{patterns.length}</span>
              <span className="mur-stat-popis">{patterns.length === 1 ? 'beat' : 'beaty'}</span>
            </div>
            <div className="mur-stat-dlazdice">
              <span className="mur-stat-cislo">{recordings.length}</span>
              <span className="mur-stat-popis">{recordings.length === 1 ? 'nahrávka' : 'nahrávky'}</span>
            </div>
            <div className="mur-stat-dlazdice">
              <span className="mur-stat-cislo">{songs.length}</span>
              <span className="mur-stat-popis">{songs.length === 1 ? 'skladba' : 'skladby'}</span>
            </div>
          </div>
        </div>

        <div className="mur-panel">
          <div className="mur-panel-hlavicka">
            <h2>Beat Maker</h2>
            <button className="mur-zobrazit-vse" onClick={otevritMusicStudio}>
              Otevřít ›
            </button>
          </div>

          {!posledniBeat ? (
            <p className="mur-prazdno">Zatím žádný uložený beat. Vytvoř první v Beat Makeru.</p>
          ) : (
            <>
              <div className="mur-beat-radek">
                <button
                  className="mur-play-btn"
                  onClick={hraje ? zastavit : spustit}
                  aria-label={hraje ? 'Zastavit' : `Přehrát ${posledniBeat.name}`}
                >
                  {hraje ? '⏹️' : '▶️'}
                </button>
                <div className="mur-beat-text">
                  <strong>{posledniBeat.name}</strong>
                  <span>{posledniBeat.bpm} BPM</span>
                </div>
              </div>

              <div className="mur-mini-grid">
                {DRUM_SOUNDS.map((buben) => (
                  <div className="mur-mini-radek" key={buben}>
                    <span className="mur-mini-label">{DRUM_LABELS[buben][0]}</span>
                    <div className="mur-mini-kroky">
                      {posledniBeat.kroky[buben].map((zapnuto, i) => (
                        <span
                          key={i}
                          className={`mur-mini-krok${zapnuto ? ` on-${buben}` : ''}${aktualniKrok === i ? ' playhead' : ''}`}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="mur-panel">
          <div className="mur-panel-hlavicka">
            <h2>Nahrávání</h2>
            <button className="mur-zobrazit-vse" onClick={otevritMusicStudio}>
              Otevřít ›
            </button>
          </div>

          {recordings.length === 0 ? (
            <p className="mur-prazdno">Zatím žádná uložená nahrávka. Nahraj svůj hlas nebo nástroj.</p>
          ) : (
            <div className="mur-seznam">
              {recordings.slice(0, MAX_NAHLED_NAHRAVEK).map((r) => (
                <div className="mur-radek" key={r.id}>
                  <button
                    className="mur-icon-btn"
                    onClick={() => (hrajeNahravkaId === r.id ? zastavitNahravku() : prehratNahravku(r.id))}
                    aria-label={hrajeNahravkaId === r.id ? `Zastavit ${r.name}` : `Přehrát ${r.name}`}
                  >
                    {hrajeNahravkaId === r.id ? '⏹️' : '▶️'}
                  </button>
                  <span className="mur-radek-nazev">{r.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mur-panel">
          <div className="mur-panel-hlavicka">
            <h2>Rychlé akce</h2>
          </div>

          <div className="mur-akce-mrizka">
            <button className="mur-akce-dlazdice" onClick={otevritMusicStudio}>
              <span className="mur-text--orange">
                <AppIcon name="plus" size={22} />
              </span>
              <span className="mur-akce-nazev">Nový beat</span>
            </button>
            <button className="mur-akce-dlazdice" onClick={otevritMusicStudio}>
              <span className="mur-text--magenta">⏺️</span>
              <span className="mur-akce-nazev">Nahrát zvuk</span>
            </button>
            <button className="mur-akce-dlazdice" onClick={otevritMusicStudio}>
              <span className="mur-text--cyan">
                <AppIcon name="music" size={22} />
              </span>
              <span className="mur-akce-nazev">Nová skladba</span>
            </button>
          </div>
        </div>
      </FlagshipShell>

      {appsOtevrene && <NastrojeSheet nadpis="Apps" nastroje={nastroje} onZavrit={() => setAppsOtevrene(false)} />}
    </>
  )
}

export default MusicRoomModule
