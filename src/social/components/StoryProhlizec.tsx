import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { SocialAvatar } from './SocialAvatar'
import { SocialIcon } from './SocialIcon'
import * as api from '../api'
import type { StorySkupina, StoryZhlednuti } from '../types'

interface Props {
  skupina: StorySkupina
  mujId: string
  onZavrit: () => void
  /** Zavolá se po zhlédnutí i po smazání — StoriesBar.tsx si podle toho
   *  znovu načte pruh (kroužek přejde na "zhlédnuto", smazaná story
   *  zmizí), appka tu neřeší vlastní kopii stavu. */
  onZmena: () => void
}

const TRVANI_MS = 5000

/**
 * Celoobrazovkový prohlížeč — snímek po snímku, klepnutí vlevo/vpravo
 * (nebo automatický posun po TRVANI_MS) mezi stories jednoho autora,
 * ne mezi autory navzájem: opuštění pruhu jednoho člověka appka bere
 * jako zavření prohlížeče, stejně jako Instagram/TikTok.
 */
export const StoryProhlizec: React.FC<Props> = ({ skupina, mujId, onZavrit, onZmena }) => {
  const [index, setIndex] = useState(0)
  const [url, setUrl] = useState<string | null>(null)
  const [zhlednuti, setZhlednuti] = useState<StoryZhlednuti[] | null>(null)
  const [ukazatZhlednuti, setUkazatZhlednuti] = useState(false)
  const casovacRef = useRef<number | null>(null)

  const story = skupina.stories[index]
  const jeMoje = skupina.autor.id === mujId

  const dalsi = useCallback(() => {
    setIndex((i) => (i < skupina.stories.length - 1 ? i + 1 : i))
    if (index >= skupina.stories.length - 1) onZavrit()
  }, [index, skupina.stories.length, onZavrit])

  const predchozi = () => setIndex((i) => Math.max(0, i - 1))

  // Podepsaná URL a zaznamenání zhlédnutí — obojí na každou změnu
  // snímku, ne jen jednou při otevření. Vlastní story appka nezhlédnutá
  // neznačí, autor svou vlastní story "vidí" pořád.
  useEffect(() => {
    let platne = true
    setUrl(null)
    void api.ziskejUrlStory(story.mediaPath).then((u) => platne && setUrl(u))
    if (!jeMoje) void api.oznacitZhlednuti(story.id).then(() => onZmena())
    return () => {
      platne = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story.id, story.mediaPath, jeMoje])

  // Automatický posun — samostatný časovač na každý snímek, ne jeden
  // sdílený, ať klepnutí vlevo/vpravo časovač spolehlivě resetuje.
  useEffect(() => {
    casovacRef.current = window.setTimeout(dalsi, TRVANI_MS)
    return () => {
      if (casovacRef.current) window.clearTimeout(casovacRef.current)
    }
  }, [dalsi])

  // Kdo zhlédl — jen pro vlastní story, RLS by cizí stejně vrátila
  // prázdno, ale netahat dotaz zbytečně dřív, než je potřeba.
  useEffect(() => {
    if (!jeMoje) return
    setZhlednuti(null)
    void api.nactiZhlednuti(story.id).then(setZhlednuti)
  }, [jeMoje, story.id])

  const smazat = async () => {
    if (!window.confirm('Smazat tuhle story?')) return
    const vysledek = await api.smazatStory(story.id)
    if (!vysledek.ok) return
    onZmena()
    if (skupina.stories.length <= 1) onZavrit()
    else dalsi()
  }

  return createPortal(
    <div className="social-story-prohlizec" role="dialog" aria-modal="true" aria-label="Story">
      <div className="social-story-progres-radek">
        {skupina.stories.map((s, i) => (
          <span key={s.id} className="social-story-progres-bg">
            <span
              className={`social-story-progres-fill ${i < index ? 'je-hotovo' : ''} ${i === index ? 'bezi' : ''}`}
            />
          </span>
        ))}
      </div>

      <div className="social-story-prohlizec-hlavicka">
        <SocialAvatar
          id={skupina.autor.id}
          jmeno={skupina.autor.displayName}
          avatarUrl={skupina.autor.avatarUrl}
          velikost={30}
        />
        <span className="social-story-autor-jmeno">{skupina.autor.displayName}</span>
        {jeMoje && (
          <button className="social-story-akce-btn" onClick={smazat} aria-label="Smazat story">
            <SocialIcon name="trash" size={18} />
          </button>
        )}
        <button className="social-story-zavrit" onClick={onZavrit} aria-label="Zavřít">
          <SocialIcon name="x" size={22} />
        </button>
      </div>

      <div className="social-story-plocha">
        <button className="social-story-tap social-story-tap--vlevo" onClick={predchozi} aria-label="Předchozí" />
        <button className="social-story-tap social-story-tap--vpravo" onClick={dalsi} aria-label="Další" />
        {url ? (
          <img src={url} alt="" className="social-story-obrazek" />
        ) : (
          <div className="social-media-nacita" />
        )}
      </div>

      {story.caption && <p className="social-story-popisek">{story.caption}</p>}

      {jeMoje && (
        <button className="social-story-zhlednuti-btn" onClick={() => setUkazatZhlednuti(true)}>
          👁 {zhlednuti?.length ?? 0} zhlédnutí
        </button>
      )}

      {ukazatZhlednuti && (
        <div className="social-story-zhlednuti-sheet">
          <div className="social-story-zhlednuti-hlavicka">
            <span>Zhlédli</span>
            <button onClick={() => setUkazatZhlednuti(false)} aria-label="Zavřít seznam">
              <SocialIcon name="x" size={18} />
            </button>
          </div>
          {(zhlednuti ?? []).length === 0 ? (
            <p className="social-story-zhlednuti-prazdno">Zatím nikdo.</p>
          ) : (
            (zhlednuti ?? []).map((z) => (
              <div key={z.viewer.id} className="social-story-zhlednuti-radek">
                <SocialAvatar id={z.viewer.id} jmeno={z.viewer.displayName} avatarUrl={z.viewer.avatarUrl} velikost={28} />
                <span>{z.viewer.displayName}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>,
    // Portál do document.body, ne obyčejné vykreslení na místě — appka
    // ho jako první v tomhle modulu vůbec potřebuje. .social-panel má
    // `position: relative` (kvůli vlastnímu z-indexu nad pozadím scény),
    // což z něj dělá vlastní "stacking context": z-index téhle vrstvy
    // (60) by se pak porovnával jen se sourozenci uvnitř .social-panel,
    // ne s .social-bottom-nav, který leží vedle něj se stejným z-indexem
    // a v DOMu až po něm — bez portálu by pruh dole appky vykreslil
    // navigaci NAD prohlížečem, i když má nižší z-index (skutečně se to
    // tak stalo, chyceno tímhle prohlížečem, ne pohledem na kód).
    document.body
  )
}
