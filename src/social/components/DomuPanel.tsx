import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FeedPrispevek } from './FeedPrispevek'
import { FeedStory } from './FeedStory'
import { PrispevekProhlizec } from './PrispevekProhlizec'
import { PridatStoryDialog } from './PridatStoryDialog'
import { SocialIcon } from './SocialIcon'
import * as api from '../api'
import { useOnlineFriends } from '../presence'
import { useStories } from '../useStories'
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

// Fáze 3c Social nav rework — "Nejnovější" je beze změny nactiFeed()
// (jen sledovaní, chronologicky), "Pro tebe" je nový nactiDoporucenyFeed()
// (i objevování cizích veřejných příspěvků, algoritmické skóre). Volba
// je záměrně jen stav relace, ne persistovaná preference — appka se
// stejnou zdrženlivostí jako u zvukZapnuty výš nechává appku vždycky
// začít na "Nejnovější", ne že by si pamatovala poslední volbu napříč
// otevřeními.
type RezimFeedu = 'nejnovejsi' | 'proTebe'

// ==========================================
// Domů — prostřední záložka spodní navigace, celoobrazovkový feed ve
// stylu TikToku: jedna položka přes celou dostupnou výšku, svisle mezi
// nimi swipe/scroll-snap.
//
// Fáze 3b sjednocení (Social nav rework, viz CLAUDE.md) — Stories dřív
// žily ve vlastním vodorovném pruhu koleček nad feedem (StoriesBar.tsx)
// s odděleným celoobrazovkovým prohlížečem (StoryProhlizec.tsx, vlastní
// časovaný automatický posun). Appka teď obojí sloučila do jednoho
// nepřerušeného svislého scrollu: nezhlédnuté story se vloží jako
// FeedStory.tsx položky hned na začátek (vlastní skupina napřed, pak
// přátelé), pokračuje se rovnou příspěvky (FeedPrispevek.tsx) — jeden
// swipe zážitek, ne dvě appky slepené k sobě. Jediné, co po pruhu
// koleček zbylo, je malé tlačítko "+ Story" nad feedem (appka pořád
// potřebuje odněkud vlastní story přidat).
// ==========================================

export const DomuPanel: React.FC<Props> = ({ stav, onOtevritProfil }) => {
  const online = useOnlineFriends()
  const { skupiny: storySkupiny, nacita: nacitaStories, obnovit: obnovitStories } = useStories()

  const [prispevky, setPrispevky] = useState<Prispevek[]>([])
  const [autori, setAutori] = useState<Map<string, SocialProfil>>(new Map())
  const [nacitaPrispevky, setNacitaPrispevky] = useState(true)
  const [dotahujeDalsi, setDotahujeDalsi] = useState(false)
  const [vseNacteno, setVseNacteno] = useState(false)
  const [aktivniId, setAktivniId] = useState<string | null>(null)
  const [otevrenyDetail, setOtevrenyDetail] = useState<Prispevek | null>(null)
  // Zvuk videí — appka drží jednu preferenci pro celý feed, ne per-post
  // stav (zapneš si zvuk jednou, zůstane zapnutý i pro další video, dokud
  // ho sám nevypneš) — stejná chuť, jakou má TikTok/IG, ne že by si
  // appka pamatovala volbu jen pro rozehraný příspěvek. Výchozí ztlumeno
  // (autoplay se zvukem by byl nevyžádaný hluk hned při otevření Domů).
  const [zvukZapnuty, setZvukZapnuty] = useState(false)
  const [novaStory, setNovaStory] = useState<File | null>(null)
  const vstupStoryRef = useRef<HTMLInputElement>(null)

  const [rezim, setRezim] = useState<RezimFeedu>('nejnovejsi')
  // Kurzor pro "Pro tebe" (skóre, id) — appka ho drží mimo React stav,
  // protože se mění při každé dotažené stránce a nikdy neřídí
  // vykreslení samo o sobě, jen další volání nactiDoporucenyFeed().
  const doporucenyKurzor = useRef<{ skore: number; id: string } | null>(null)

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
    doporucenyKurzor.current = null
    void (async () => {
      setNacitaPrispevky(true)
      const prvni =
        rezim === 'proTebe'
          ? await (async () => {
              const { prispevky: p, posledniSkore, posledniId } = await api.nactiDoporucenyFeed()
              doporucenyKurzor.current =
                posledniSkore !== null && posledniId ? { skore: posledniSkore, id: posledniId } : null
              return p
            })()
          : await api.nactiFeed()
      if (!platne) return
      setPrispevky(prvni)
      setVseNacteno(prvni.length === 0)
      setNacitaPrispevky(false)
      void doplnitAutory(prvni.map((p) => p.autorId))
    })()
    return () => {
      platne = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rezim])

  const nacistDalsiStranku = useCallback(async () => {
    if (dotahujeDalsi || vseNacteno) return

    setDotahujeDalsi(true)
    if (rezim === 'proTebe') {
      const kurzor = doporucenyKurzor.current
      const { prispevky: dalsi, posledniSkore, posledniId } = await api.nactiDoporucenyFeed(
        kurzor?.skore,
        kurzor?.id
      )
      if (dalsi.length === 0) {
        setVseNacteno(true)
      } else {
        doporucenyKurzor.current =
          posledniSkore !== null && posledniId ? { skore: posledniSkore, id: posledniId } : null
        setPrispevky((p) => [...p, ...dalsi])
        void doplnitAutory(dalsi.map((p) => p.autorId))
      }
    } else {
      const posledni = prispevky[prispevky.length - 1]
      if (posledni) {
        const dalsi = await api.nactiFeed(posledni.createdAt)
        if (dalsi.length === 0) {
          setVseNacteno(true)
        } else {
          setPrispevky((p) => [...p, ...dalsi])
          void doplnitAutory(dalsi.map((p) => p.autorId))
        }
      }
    }
    setDotahujeDalsi(false)
  }, [prispevky, dotahujeDalsi, vseNacteno, doplnitAutory, rezim])

  // Story položky feedu — každá story jednotlivého autora rozbalená na
  // svou vlastní feedovou "stránku" (viz FeedStory.tsx), v pořadí, v
  // jakém je vrátil nactiStories() (vlastní skupina už tam je první,
  // appka to tu znovu netřídí). Appka to počítá znovu při každém
  // vykreslení, ne jako vlastní stav — storySkupiny se mění dost zřídka
  // na to, aby to vadilo.
  const storyPolozky = useMemo(
    () =>
      stav.mujId
        ? storySkupiny.flatMap((skupina) =>
            skupina.stories.map((story, indexVeSkupine) => ({ skupina, story, indexVeSkupine }))
          )
        : [],
    [storySkupiny, stav.mujId]
  )

  const nacita = nacitaPrispevky || nacitaStories
  const jePrazdno = !nacita && prispevky.length === 0 && storyPolozky.length === 0

  // Který příspěvek/story je zrovna "na obrazovce" (řídí video autoplay
  // i zaznamenání zhlédnutí story) — a zároveň spouštěč dotažení další
  // stránky příspěvků, jakmile se uživatel přiblíží ke konci už
  // načteného. Jeden pozorovatel pro obojí, žádný druhý jen na "blízko
  // konce" — a jeden pro story i příspěvky dohromady, appka je teď
  // vykresluje do stejného scroll-snap kontejneru.
  useEffect(() => {
    const kontejner = feedRef.current
    if (!kontejner || (prispevky.length === 0 && storyPolozky.length === 0)) return

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
  }, [prispevky, storyPolozky, nacistDalsiStranku])

  return (
    <div className="social-panel social-panel--domu">
      {stav.mujId && (
        <div className="social-domu-horni-lista">
          <div className="social-domu-rezim-prepinac">
            <button
              className={`social-domu-rezim-btn ${rezim === 'nejnovejsi' ? 'is-aktivni' : ''}`}
              onClick={() => setRezim('nejnovejsi')}
            >
              Nejnovější
            </button>
            <button
              className={`social-domu-rezim-btn ${rezim === 'proTebe' ? 'is-aktivni' : ''}`}
              onClick={() => setRezim('proTebe')}
            >
              Pro tebe
            </button>
          </div>
          <button
            className="social-domu-pridat-story-btn"
            onClick={() => vstupStoryRef.current?.click()}
          >
            <SocialIcon name="plus" size={14} /> Story
          </button>
          <input
            ref={vstupStoryRef}
            type="file"
            accept="image/*"
            className="social-soubor-input"
            onChange={(e) => {
              const soubor = e.target.files?.[0]
              e.target.value = ''
              if (soubor) setNovaStory(soubor)
            }}
          />
        </div>
      )}

      {nacita ? (
        <div className="social-feed-prazdno">
          <p className="social-feed-nacitam">Načítám…</p>
        </div>
      ) : jePrazdno ? (
        <div className="social-feed-prazdno">
          <p className="social-empty-note social-empty-note--stred">
            Sleduj někoho, ať tu něco uvidíš. ✨
          </p>
        </div>
      ) : (
        <div className="social-feed" ref={feedRef}>
          {storyPolozky.map(({ skupina, story, indexVeSkupine }) => {
            const klic = `story:${story.id}`
            return (
              <FeedStory
                key={klic}
                skupina={skupina}
                story={story}
                indexVeSkupine={indexVeSkupine}
                mujId={stav.mujId ?? ''}
                aktivni={aktivniId === klic}
                onSmazano={() => void obnovitStories()}
                ref={(el) => {
                  if (el) postElementy.current.set(klic, el)
                  else postElementy.current.delete(klic)
                }}
              />
            )
          })}

          {prispevky.map((p) => (
            <FeedPrispevek
              key={p.id}
              prispevek={p}
              autor={autori.get(p.autorId) ?? null}
              aktivni={aktivniId === p.id}
              online={online.has(p.autorId)}
              zvukZapnuty={zvukZapnuty}
              onPrepnoutZvuk={() => setZvukZapnuty((z) => !z)}
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

      {novaStory && (
        <PridatStoryDialog
          soubor={novaStory}
          onZavrit={() => setNovaStory(null)}
          onHotovo={() => {
            setNovaStory(null)
            void obnovitStories()
          }}
        />
      )}

      {otevrenyDetail && (
        <PrispevekProhlizec
          prispevek={otevrenyDetail}
          jeMoje={otevrenyDetail.autorId === stav.mujId}
          mujId={stav.mujId}
          stav={stav}
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
