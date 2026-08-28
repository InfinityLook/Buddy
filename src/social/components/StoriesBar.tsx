import React, { useRef, useState } from 'react'
import { SocialAvatar } from './SocialAvatar'
import { SocialIcon } from './SocialIcon'
import { StoryProhlizec } from './StoryProhlizec'
import { PridatStoryDialog } from './PridatStoryDialog'
import { useStories } from '../useStories'
import type { StorySkupina } from '../types'

interface Props {
  mujId: string
  mojeJmeno: string
  mujAvatar: string | null
}

/**
 * Pruh kroužků nahoře v MujProfilPanel.tsx — vlastní story první (se
 * samostatným "+" tlačítkem vedle, ne uvnitř výběrového tlačítka, stejný
 * "sourozenec, ne vnořené tlačítko" princip jako PostavaKarta's tlačítko
 * mazání v herním hubu), pak přátelé s aktivní story, každý s barevným
 * kroužkem (nezhlédnuto) nebo šedým (zhlédnuto celé) — StorySkupina už
 * appce řekla, co ukázat, tady se to jen vykresluje.
 *
 * Nic se nevykreslí, dokud appka neví, jestli vůbec něco je (nacita) —
 * krátké bliknutí prázdného pruhu by vypadalo jako chyba, ne jako
 * "zrovna nikdo nic nesdílel".
 */
export const StoriesBar: React.FC<Props> = ({ mujId, mojeJmeno, mujAvatar }) => {
  const { skupiny, nacita, obnovit } = useStories()
  const [otevrena, setOtevrena] = useState<StorySkupina | null>(null)
  const [novySoubor, setNovySoubor] = useState<File | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  if (nacita) return null

  const mojeSkupina = skupiny.find((s) => s.autor.id === mujId) ?? null
  const pratelske = skupiny.filter((s) => s.autor.id !== mujId)

  return (
    // Fragment, ne jen <section> — StoryProhlizec/PridatStoryDialog se
    // (viz jejich vlastní komentář u createPortal) vykreslují portálem
    // rovnou do document.body, ne sem; tenhle fragment jen odděluje
    // jejich volání od karty samotné v JSX, ať to čtení komponenty
    // nesvádí k domněnce, že jsou jejím obsahem.
    <>
      <section className="social-card social-stories-pruh">
        <div className="social-stories-radek">
          <span className="social-story-tile social-story-tile--vlastni">
            <button
              className="social-story-tile-avatar-btn"
              onClick={() => mojeSkupina && setOtevrena(mojeSkupina)}
              disabled={!mojeSkupina}
            >
              <span className={`social-story-krouzek ${mojeSkupina ? '' : 'social-story-krouzek--prazdny'}`}>
                <span className="social-story-krouzek-mezera">
                  <SocialAvatar id={mujId} jmeno={mojeJmeno} avatarUrl={mujAvatar} velikost={50} />
                </span>
              </span>
            </button>
            <button
              className="social-story-plus-btn"
              onClick={() => inputRef.current?.click()}
              aria-label="Přidat story"
            >
              <SocialIcon name="plus" size={13} />
            </button>
            <span className="social-story-tile-jmeno">Váš příběh</span>
          </span>

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="social-soubor-input"
            onChange={(e) => {
              const soubor = e.target.files?.[0]
              e.target.value = ''
              if (soubor) setNovySoubor(soubor)
            }}
          />

          {pratelske.map((s) => (
            <button key={s.autor.id} className="social-story-tile" onClick={() => setOtevrena(s)}>
              <span
                className={`social-story-krouzek ${s.vsechnyZhlednute ? 'social-story-krouzek--zhlednuto' : ''}`}
              >
                <span className="social-story-krouzek-mezera">
                  <SocialAvatar
                    id={s.autor.id}
                    jmeno={s.autor.displayName}
                    avatarUrl={s.autor.avatarUrl}
                    velikost={50}
                  />
                </span>
              </span>
              <span className="social-story-tile-jmeno">{s.autor.displayName.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </section>

      {otevrena && (
        <StoryProhlizec
          skupina={otevrena}
          mujId={mujId}
          onZavrit={() => {
            setOtevrena(null)
            void obnovit()
          }}
          onZmena={obnovit}
        />
      )}

      {novySoubor && (
        <PridatStoryDialog
          soubor={novySoubor}
          onZavrit={() => setNovySoubor(null)}
          onHotovo={() => {
            setNovySoubor(null)
            void obnovit()
          }}
        />
      )}
    </>
  )
}
