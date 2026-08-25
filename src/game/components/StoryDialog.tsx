import React, { useState } from 'react'
import { DialogSekvence } from '../data/story'
import { Postava } from '../types'
import './StoryDialog.css'

interface Props {
  sekvence: DialogSekvence
  /** Aktuálně hraná postava — nahrazuje '__hrac__' sentinel v datech
   *  (viz komentář v data/story.ts). */
  postava: Postava
  onDokonceno: () => void
}

const BUDDY = { jmeno: 'Buddy', ikona: '✨' }

// ==========================================
// Přehrávač příběhových dialogů — jedna karta, jeden řádek najednou,
// klepnutím kamkoliv (nebo tlačítkem Dál) se posune na další. Sdílená
// komponenta pro dvě různá místa v herní smyčce: MapaSveta.tsx ji
// spouští po přijetí questu (rovnou nad mapou), GameModule.tsx ji
// spouští jako plnohodnotnou obrazovku po výhře v souboji, co quest
// dokončil (viz komentář u dialogPriDokonceni v data/quests.ts) —
// "Story" krok herní smyčky mezi odměnou a návratem na mapu.
//
// Vlastní neprůhledné pozadí (ne poloprůhledný overlay) schválně —
// v obou použitích funguje jako krátká "scéna" přes celou obrazovku,
// ne jako list nad něčím pod ním.
// ==========================================

export const StoryDialog: React.FC<Props> = ({ sekvence, postava, onDokonceno }) => {
  const [index, setIndex] = useState(0)
  const radek = sekvence.radky[index]
  const posledni = index === sekvence.radky.length - 1

  const mluvci =
    radek.mluvci === '__hrac__'
      ? { jmeno: postava.jmeno, ikona: postava.ikona }
      : radek.mluvci === '__buddy__'
        ? BUDDY
        : { jmeno: radek.mluvci, ikona: radek.ikona }

  const dalsi = () => {
    if (posledni) onDokonceno()
    else setIndex((i) => i + 1)
  }

  return (
    <div className="story-dialog" onClick={dalsi}>
      <div className="story-dialog-tecky" aria-hidden="true">
        {sekvence.radky.map((_, i) => (
          <span key={i} className={`story-tecka ${i <= index ? 'story-tecka--aktivni' : ''}`} />
        ))}
      </div>

      <button
        className="story-dialog-preskocit"
        onClick={(e) => {
          e.stopPropagation()
          onDokonceno()
        }}
      >
        Přeskočit ✕
      </button>

      <div className="story-dialog-karta">
        <span className="story-dialog-ikona" aria-hidden="true">
          {mluvci.ikona}
        </span>
        <div className="story-dialog-text">
          <span className="story-dialog-jmeno">{mluvci.jmeno}</span>
          <p>{radek.text}</p>
        </div>
      </div>

      <button
        className="story-dialog-dal"
        onClick={(e) => {
          e.stopPropagation()
          dalsi()
        }}
      >
        {posledni ? 'Pokračovat' : 'Dál ▸'}
      </button>
    </div>
  )
}
