import React, { useEffect, useState } from 'react'
import { ZvyrazneniProhlizec } from './ZvyrazneniProhlizec'
import * as api from '../api'
import type { Zvyrazneni } from '../types'

interface Props {
  userId: string
  jeMoje: boolean
}

/**
 * Pruh kulatých obálek zvýraznění nad mřížkou příspěvků — stejné místo
 * na profilu, kde má Instagram Highlights (pod bio/statistikami, nad
 * záložkami s mřížkou). Appka tu nenabízí "vytvořit nové": zvýraznění
 * vzniká jen z otevřené vlastní story (viz PridatDoZvyrazneniDialog.tsx
 * ze StoryProhlizec.tsx), takže prázdný pruh appka radši úplně skryje
 * (stejné "nic se nevykreslí, dokud appka neví, jestli něco je" jako
 * u StoriesBar.tsx), ne že by tu byla dlaždice bez skutečné funkce.
 */
export const ZvyrazneniPruh: React.FC<Props> = ({ userId, jeMoje }) => {
  const [zvyrazneni, setZvyrazneni] = useState<Zvyrazneni[] | null>(null)
  const [otevrene, setOtevrene] = useState<Zvyrazneni | null>(null)

  const nacist = () => void api.nactiZvyrazneni(userId).then(setZvyrazneni)

  useEffect(() => {
    let platne = true
    void api.nactiZvyrazneni(userId).then((z) => platne && setZvyrazneni(z))
    return () => {
      platne = false
    }
  }, [userId])

  if (!zvyrazneni || zvyrazneni.length === 0) return null

  return (
    <>
      <div className="social-zvyrazneni-radek">
        {zvyrazneni.map((z) => (
          <button key={z.id} className="social-zvyrazneni-tile" onClick={() => setOtevrene(z)}>
            <span className="social-zvyrazneni-obalka">
              {z.obalkaUrl ? <img src={z.obalkaUrl} alt="" /> : <span>✨</span>}
            </span>
            <span className="social-zvyrazneni-jmeno">{z.nazev}</span>
          </button>
        ))}
      </div>

      {otevrene && (
        <ZvyrazneniProhlizec
          zvyrazneni={otevrene}
          jeMoje={jeMoje}
          onZavrit={() => setOtevrene(null)}
          onZmena={nacist}
        />
      )}
    </>
  )
}
