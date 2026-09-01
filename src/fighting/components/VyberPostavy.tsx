import React, { useState } from 'react'
import { VSECHNY_POSTAVY } from '../combat/postavy'
import type { PostavaId } from '../combat/postavy'
import '../FightingModule.css'

interface Props {
  onVybrano: (postavaId: PostavaId) => void
}

// ==========================================
// Fáze 3 — výběr postavy na ovladači, LOKÁLNĚ a PŘED síťovým
// připojením (viz types.ts's PripojitPayload). Dva důvody, proč tenhle
// pořadí: (1) hráč se má vybrat, koho hraje, dřív, než čeká na TV, ne
// až po připojení jako druhý krok navíc; (2) tahle obrazovka je čistě
// místní React stav, žádné síťové volání — jde ji ověřit Playwright
// testem i v sandboxu, který živé Supabase Realtime spojení vůbec
// neumí (viz CLAUDE.md's Souboj sekce, WebSocket limit).
// ==========================================

export const VyberPostavy: React.FC<Props> = ({ onVybrano }) => {
  const [vybrana, setVybrana] = useState<PostavaId | null>(null)

  return (
    <div className="souboj-vyber-postavy">
      <p className="souboj-vyber-postavy-nadpis">Vyber si bojovníka</p>

      <div className="souboj-postavy-mrizka">
        {VSECHNY_POSTAVY.map((postava) => (
          <button
            key={postava.id}
            type="button"
            className={`souboj-postava-karta souboj-postava-karta--${postava.id} ${
              vybrana === postava.id ? 'je-vybrana' : ''
            }`}
            onClick={() => setVybrana(postava.id)}
          >
            <span className="souboj-postava-ikona" aria-hidden="true">
              {postava.ikona}
            </span>
            <span className="souboj-postava-jmeno">{postava.jmeno}</span>
            <span className="souboj-postava-podtitul">{postava.podtitul}</span>
            <span className="souboj-postava-special">✨ {postava.nazevSpecialu}</span>
          </button>
        ))}
      </div>

      <button
        type="button"
        className="souboj-postava-potvrdit"
        disabled={!vybrana}
        onClick={() => vybrana && onVybrano(vybrana)}
      >
        Pokračovat
      </button>
    </div>
  )
}
