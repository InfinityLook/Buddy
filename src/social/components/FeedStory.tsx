import { forwardRef, useEffect, useRef, useState } from 'react'
import { SocialAvatar } from './SocialAvatar'
import { SocialIcon } from './SocialIcon'
import { PridatDoZvyrazneniDialog } from './PridatDoZvyrazneniDialog'
import * as api from '../api'
import { EMOJI_REAKCI, type Story, type StorySkupina, type StoryZhlednuti } from '../types'

interface Props {
  skupina: StorySkupina
  story: Story
  indexVeSkupine: number
  mujId: string
  /** Stejný signál jako u FeedPrispevek.tsx's video autoplay — appka
   *  zhlédnutí zaznamená, až je tahle story doopravdy "na obrazovce",
   *  ne hned při vykreslení (feed jich může mít rozestavěných pár
   *  najednou při rychlém scrollu). */
  aktivni: boolean
  onSmazano: (storyId: string) => void
}

/**
 * Jedna story jako "stránka" feedu na Domů — Fáze 3b sjednocení
 * (viz CLAUDE.md): dřív vlastní celoobrazovkový StoryProhlizec.tsx
 * mimo feed s automatickým posunem po pár sekundách, teď jedna položka
 * mezi ostatními v tom samém svislém scroll-snapu jako FeedPrispevek.tsx —
 * appka žádný časovač/tap-vlevo-vpravo nemá, další story (nebo
 * příspěvek) přijde stejným swipe gestem jako cokoli jiného ve feedu,
 * ne druhým, oddělených mechanismem. Vizuálně proto sdílí přesně tytéž
 * třídy jako FeedPrispevek (.social-feed-info dole vlevo, .social-feed-akce
 * dole vpravo) — story a příspěvek teď vypadají jako dva druhy téže
 * věci, ne dvě různé appky slepené k sobě.
 */
export const FeedStory = forwardRef<HTMLElement, Props>(function FeedStory(
  { skupina, story, indexVeSkupine, mujId, aktivni, onSmazano },
  ref
) {
  const [url, setUrl] = useState<string | null>(null)
  const [zhlednuti, setZhlednuti] = useState<StoryZhlednuti[] | null>(null)
  const [ukazatZhlednuti, setUkazatZhlednuti] = useState(false)
  const [odpoved, setOdpoved] = useState('')
  const [odesilaOdpoved, setOdesilaOdpoved] = useState(false)
  const [odpovedHlaska, setOdpovedHlaska] = useState<string | null>(null)
  const [zvyraznit, setZvyraznit] = useState(false)
  const [zvyrazneniHlaska, setZvyrazneniHlaska] = useState<string | null>(null)
  const oznacenoRef = useRef(false)

  const jeMoje = skupina.autor.id === mujId

  useEffect(() => {
    let platne = true
    void api.ziskejUrlStory(story.mediaPath).then((u) => platne && setUrl(u))
    return () => {
      platne = false
    }
  }, [story.mediaPath])

  // Zaznamená se jen jednou (oznacenoRef), ne při každém "aktivni: true"
  // překreslení — appka na rozdíl od starého časovaného prohlížeče
  // nepotřebuje zhlédnutí obnovovat opakovaně, jedno stačí.
  useEffect(() => {
    if (!aktivni || jeMoje || oznacenoRef.current) return
    oznacenoRef.current = true
    void api.oznacitZhlednuti(story.id)
  }, [aktivni, jeMoje, story.id])

  // Kdo zhlédl — jen pro vlastní story a jen jednou se stane aktivní,
  // ne pro celý feed najednou (RLS by cizí stejně vrátila prázdno, ale
  // netahat dotaz zbytečně dřív, než je vůbec vidět).
  useEffect(() => {
    if (!jeMoje || !aktivni) return
    setZhlednuti(null)
    void api.nactiZhlednuti(story.id).then(setZhlednuti)
  }, [jeMoje, aktivni, story.id])

  const oznamOdpoved = (text: string) => {
    setOdpovedHlaska(text)
    window.setTimeout(() => setOdpovedHlaska(null), 2400)
  }

  const poslatOdpoved = async (text: string) => {
    const orezany = text.trim()
    if (!orezany || odesilaOdpoved) return
    setOdesilaOdpoved(true)
    const vysledek = await api.reagovatNaStory(story.id, skupina.autor.id, orezany)
    setOdesilaOdpoved(false)
    if (vysledek.ok) {
      setOdpoved('')
      oznamOdpoved('Odesláno.')
    } else {
      oznamOdpoved(vysledek.chyba ?? 'Nepovedlo se to.')
    }
  }

  const smazat = async () => {
    if (!window.confirm('Smazat tuhle story?')) return
    const vysledek = await api.smazatStory(story.id)
    if (vysledek.ok) onSmazano(story.id)
  }

  return (
    <article className="social-feed-post" ref={ref} data-post-id={`story:${story.id}`}>
      {/* Tečkovaný ukazatel — kolikátá z autorovy skupiny, ne
          odpočet do dalšího posunu (ten appka už nemá, viz komentář
          nahoře). Vyplní se podle pozice, ne podle uplynulého času. */}
      <div className="social-story-progres-radek">
        {skupina.stories.map((s, i) => (
          <span key={s.id} className="social-story-progres-bg">
            <span className={`social-story-progres-fill ${i <= indexVeSkupine ? 'je-hotovo' : ''}`} />
          </span>
        ))}
      </div>

      {url ? (
        <img src={url} alt="" className="social-feed-media" />
      ) : (
        <div className="social-media-nacita" />
      )}

      <div className="social-feed-zavoj" aria-hidden="true" />

      <div className="social-feed-info">
        <span className="social-feed-autor">
          <SocialAvatar
            id={skupina.autor.id}
            jmeno={skupina.autor.displayName}
            avatarUrl={skupina.autor.avatarUrl}
            velikost={34}
          />
          <span className="social-feed-autor-jmeno">{skupina.autor.displayName}</span>
        </span>
        {story.caption && <p className="social-feed-popisek">{story.caption}</p>}

        {jeMoje ? (
          <>
            <button className="social-story-zhlednuti-btn" onClick={() => setUkazatZhlednuti(true)}>
              👁 {zhlednuti?.length ?? 0} zhlédnutí
            </button>
            {zvyrazneniHlaska && <span className="social-story-odpoved-hlaska">{zvyrazneniHlaska}</span>}
          </>
        ) : (
          <div className="social-story-odpoved-blok">
            <div className="social-story-emoji-radek">
              {EMOJI_REAKCI.map((e) => (
                <button
                  key={e}
                  className="social-story-emoji-btn"
                  disabled={odesilaOdpoved}
                  onClick={() => void poslatOdpoved(e)}
                  aria-label={`Reagovat ${e}`}
                >
                  {e}
                </button>
              ))}
            </div>
            <form
              className="social-story-odpoved-formular"
              onSubmit={(e) => {
                e.preventDefault()
                void poslatOdpoved(odpoved)
              }}
            >
              <input
                className="social-input social-input--full social-story-odpoved-input"
                placeholder={`Odpověz ${skupina.autor.displayName}…`}
                value={odpoved}
                maxLength={4000}
                onChange={(e) => setOdpoved(e.target.value)}
              />
              <button
                className="social-story-akce-btn"
                type="submit"
                disabled={!odpoved.trim() || odesilaOdpoved}
                aria-label="Odeslat odpověď"
              >
                <SocialIcon name="send" size={18} />
              </button>
            </form>
            {odpovedHlaska && <span className="social-story-odpoved-hlaska">{odpovedHlaska}</span>}
          </div>
        )}
      </div>

      {jeMoje && (
        <div className="social-feed-akce">
          <button
            className="social-feed-akce-btn"
            onClick={() => setZvyraznit(true)}
            aria-label="Přidat do zvýraznění"
          >
            <span className="social-feed-akce-kruh">
              <SocialIcon name="star" size={19} />
            </span>
          </button>
          <button className="social-feed-akce-btn" onClick={smazat} aria-label="Smazat story">
            <span className="social-feed-akce-kruh">
              <SocialIcon name="trash" size={19} />
            </span>
          </button>
        </div>
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

      {zvyraznit && (
        <PridatDoZvyrazneniDialog
          mujId={mujId}
          mediaPath={story.mediaPath}
          mediaType="image"
          caption={story.caption}
          onZavrit={() => setZvyraznit(false)}
          onHotovo={(hlaska) => {
            setZvyraznit(false)
            setZvyrazneniHlaska(hlaska)
            window.setTimeout(() => setZvyrazneniHlaska(null), 2400)
          }}
        />
      )}
    </article>
  )
})
