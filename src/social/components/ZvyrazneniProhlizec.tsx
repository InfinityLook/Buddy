import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { SocialIcon } from './SocialIcon'
import * as api from '../api'
import type { Zvyrazneni, ZvyrazneniPolozka } from '../types'

interface Props {
  zvyrazneni: Zvyrazneni
  /** Je zvýraznění moje — jen majitel smí položku/celé zvýraznění
   *  smazat, stejné rozlišení jako StoryProhlizec.tsx's jeMoje. */
  jeMoje: boolean
  onZavrit: () => void
  /** Zavolá se po smazání položky/zvýraznění — ZvyrazneniPruh.tsx si
   *  podle toho znovu natáhne pruh (mizí kroužek/obálka se změní),
   *  stejná "appka tu neřeší vlastní kopii stavu" úvaha jako u story. */
  onZmena: () => void
}

/**
 * Celoobrazovkový prohlížeč jednoho zvýraznění — stejný vizuální jazyk
 * jako StoryProhlizec.tsx (přesně ty samé .social-story-* třídy, žádné
 * nové), jen zjednodušený: název zvýraznění v hlavičce místo autora,
 * žádné "kdo zhlédl", žádná automatická reakce/odpověď (zvýraznění
 * nepatří jednomu rozhovoru), žádný automatický posun ani časovač —
 * na rozdíl od mizící story tu nikam nespěchá, prohlíží se ručně.
 */
export const ZvyrazneniProhlizec: React.FC<Props> = ({ zvyrazneni, jeMoje, onZavrit, onZmena }) => {
  const [polozky, setPolozky] = useState<ZvyrazneniPolozka[] | null>(null)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    let platne = true
    void api.nactiZvyrazneniPolozky(zvyrazneni.id).then((p) => platne && setPolozky(p))
    return () => {
      platne = false
    }
  }, [zvyrazneni.id])

  const polozka = polozky?.[index] ?? null

  const dalsi = () => {
    if (!polozky) return
    if (index < polozky.length - 1) setIndex((i) => i + 1)
    else onZavrit()
  }

  const predchozi = () => setIndex((i) => Math.max(0, i - 1))

  const smazat = async () => {
    if (!polozka || !polozky) return
    if (!window.confirm('Smazat tuhle položku ze zvýraznění?')) return

    const v = await api.smazatPolozkuZvyrazneni(polozka.id)
    if (!v.ok) return

    if (polozky.length <= 1) {
      // Poslední položka mizí spolu s ní — prázdné zvýraznění by v pruhu
      // na profilu ukazovalo kroužek bez fotky, appka radši smaže celou
      // sbírku rovnou.
      await api.smazatZvyrazneni(zvyrazneni.id)
      onZmena()
      onZavrit()
      return
    }

    setPolozky((p) => (p ? p.filter((x) => x.id !== polozka.id) : p))
    setIndex((i) => Math.min(i, polozky.length - 2))
    onZmena()
  }

  return createPortal(
    <div className="social-story-prohlizec" role="dialog" aria-modal="true" aria-label="Zvýraznění">
      {polozky && polozky.length > 0 && (
        <div className="social-story-progres-radek">
          {polozky.map((p, i) => (
            <span key={p.id} className="social-story-progres-bg">
              <span className={`social-story-progres-fill ${i <= index ? 'je-hotovo' : ''}`} />
            </span>
          ))}
        </div>
      )}

      <div className="social-story-prohlizec-hlavicka">
        <span className="social-story-autor-jmeno">✨ {zvyrazneni.nazev}</span>
        {jeMoje && polozka && (
          <button className="social-story-akce-btn" onClick={() => void smazat()} aria-label="Smazat položku">
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
        {polozky === null ? (
          <div className="social-media-nacita" />
        ) : polozka ? (
          polozka.mediaType === 'video' ? (
            <video src={polozka.mediaUrl} className="social-story-obrazek" controls playsInline />
          ) : (
            <img src={polozka.mediaUrl} alt="" className="social-story-obrazek" />
          )
        ) : (
          <p className="social-empty-note social-empty-note--stred">Zvýraznění je prázdné.</p>
        )}
      </div>

      {polozka?.caption && <p className="social-story-popisek">{polozka.caption}</p>}
    </div>,
    // Portál do document.body ze stejného důvodu jako u StoryProhlizec.tsx
    // (viz jeho vlastní komentář) — .social-panel je vlastní stacking
    // context, bez portálu by appka mohla vykreslit spodní navigaci nad
    // touhle celoobrazovkovou vrstvou.
    document.body
  )
}
