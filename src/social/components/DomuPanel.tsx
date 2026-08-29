import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useProfileData } from '@/pages/profil/hooks/useProfileData'
import { StoriesBar } from './StoriesBar'
import { FeedPrispevek } from './FeedPrispevek'
import { PrispevekProhlizec } from './PrispevekProhlizec'
import * as api from '../api'
import { useOnlineFriends } from '../presence'
import type { Prispevek, SocialProfil } from '../types'
import type { SocialStav } from '../useSocial'

interface Props {
  stav: SocialStav
  onOtevritProfil: (userId: string) => void
}

// Kolik posledních příspěvků v poli ještě spustí dotažení další stránky —
// appka nečeká, až uživatel doscrolluje na úplný konec (to by znamenalo
// viditelnou prodlevu), stránku dotáhne o kousek dřív.
const NACIST_DALSI_OD_KONCE = 2

// ==========================================
// Domů — prostřední záložka spodní navigace. Story pruh nahoře
// (StoriesBar.tsx, dřív v MujProfilPanel.tsx) + pod ním celoobrazovkový
// feed příspěvků od všech, koho appka sleduje (viz nacti_feed na
// databázi), ve stylu TikToku: jeden příspěvek přes celou dostupnou
// výšku, svisle mezi nimi swipe/scroll-snap, ne mřížka ani obyčejný
// rostoucí seznam karet. Vlastní scroll (viz .social-panel--domu
// v SocialModule.css) — celá .social-page se tu schválně nescrolluje,
// jen samotný feed.
// ==========================================

export const DomuPanel: React.FC<Props> = ({ stav, onOtevritProfil }) => {
  const { profile } = useProfileData()
  const online = useOnlineFriends()

  const [prispevky, setPrispevky] = useState<Prispevek[]>([])
  const [autori, setAutori] = useState<Map<string, SocialProfil>>(new Map())
  const [nacita, setNacita] = useState(true)
  const [dotahujeDalsi, setDotahujeDalsi] = useState(false)
  const [vseNacteno, setVseNacteno] = useState(false)
  const [aktivniId, setAktivniId] = useState<string | null>(null)
  const [otevrenyDetail, setOtevrenyDetail] = useState<Prispevek | null>(null)

  const feedRef = useRef<HTMLDivElement>(null)
  const postElementy = useRef<Map<string, HTMLElement>>(new Map())

  // Přehledy o autorech se jen doplňují, nikdy nemažou — dvě stránky
  // feedu se běžně překrývají ve stejném autorovi (kdo postuje často),
  // druhé dotažení jeho profilu appce nevadí, jen ho tiše přepíše týmž.
  const doplnitAutory = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return
    const nove = await api.nactiProfily(ids)
    setAutori((a) => new Map([...a, ...nove]))
  }, [])

  useEffect(() => {
    let platne = true
    void (async () => {
      setNacita(true)
      const prvni = await api.nactiFeed()
      if (!platne) return
      setPrispevky(prvni)
      setVseNacteno(prvni.length === 0)
      setNacita(false)
      void doplnitAutory(prvni.map((p) => p.autorId))
    })()
    return () => {
      platne = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const nacistDalsiStranku = useCallback(async () => {
    if (dotahujeDalsi || vseNacteno) return
    const posledni = prispevky[prispevky.length - 1]
    if (!posledni) return

    setDotahujeDalsi(true)
    const dalsi = await api.nactiFeed(posledni.createdAt)
    if (dalsi.length === 0) {
      setVseNacteno(true)
    } else {
      setPrispevky((p) => [...p, ...dalsi])
      void doplnitAutory(dalsi.map((p) => p.autorId))
    }
    setDotahujeDalsi(false)
  }, [prispevky, dotahujeDalsi, vseNacteno, doplnitAutory])

  // Který příspěvek je zrovna "na obrazovce" (řídí video autoplay) —
  // a zároveň spouštěč dotažení další stránky, jakmile se uživatel
  // přiblíží ke konci už načteného. Jeden pozorovatel pro obojí, žádný
  // druhý jen na "blízko konce".
  useEffect(() => {
    const kontejner = feedRef.current
    if (!kontejner || prispevky.length === 0) return

    const pozorovatel = new IntersectionObserver(
      (zaznamy) => {
        for (const zaznam of zaznamy) {
          if (!zaznam.isIntersecting || zaznam.intersectionRatio < 0.6) continue
          const id = (zaznam.target as HTMLElement).dataset.postId
          if (!id) continue

          setAktivniId(id)
          const index = prispevky.findIndex((p) => p.id === id)
          if (index !== -1 && index >= prispevky.length - NACIST_DALSI_OD_KONCE) {
            void nacistDalsiStranku()
          }
        }
      },
      { root: kontejner, threshold: [0.6] }
    )

    for (const el of postElementy.current.values()) pozorovatel.observe(el)
    return () => pozorovatel.disconnect()
  }, [prispevky, nacistDalsiStranku])

  return (
    <div className="social-panel social-panel--domu">
      {stav.mujId && (
        <StoriesBar mujId={stav.mujId} mojeJmeno={profile.name} mujAvatar={profile.avatar} />
      )}

      {nacita ? (
        <div className="social-feed-prazdno">
          <p className="social-feed-nacitam">Načítám…</p>
        </div>
      ) : prispevky.length === 0 ? (
        <div className="social-feed-prazdno">
          <p className="social-empty-note social-empty-note--stred">
            Sleduj někoho, ať tu něco uvidíš. ✨
          </p>
        </div>
      ) : (
        <div className="social-feed" ref={feedRef}>
          {prispevky.map((p) => (
            <FeedPrispevek
              key={p.id}
              prispevek={p}
              autor={autori.get(p.autorId) ?? null}
              aktivni={aktivniId === p.id}
              online={online.has(p.autorId)}
              onOtevritProfil={() => onOtevritProfil(p.autorId)}
              onOtevritDetail={() => setOtevrenyDetail(p)}
              // Ref appka drží mimo React stav (postElementy.current), ne
              // useState — mění se při každém scrollu a appka ho
              // potřebuje jen pro IntersectionObserver výš, ne pro
              // překreslení.
              ref={(el) => {
                if (el) postElementy.current.set(p.id, el)
                else postElementy.current.delete(p.id)
              }}
            />
          ))}
        </div>
      )}

      {otevrenyDetail && (
        <PrispevekProhlizec
          prispevek={otevrenyDetail}
          jeMoje={otevrenyDetail.autorId === stav.mujId}
          mujId={stav.mujId}
          onZavrit={() => setOtevrenyDetail(null)}
          onSmazano={() => {
            setPrispevky((p) => p.filter((x) => x.id !== otevrenyDetail.id))
            setOtevrenyDetail(null)
          }}
        />
      )}
    </div>
  )
}
