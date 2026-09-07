import React from 'react'
import { useZvukStore } from '@/core/store/useZvukStore'
import type { ZvukKategorie } from '@/core/store/useZvukStore'

// ==========================================
// Nastavení — Zvuk. Čtyři nezávislé posuvníky hlasitosti — appka
// tenhle modul nahradila dřívějším "Zvuky Buddyho BRZY" placeholderem
// (byl to jediný obsah staré karty "Zvuk" a nikdy nic nedělal).
//
// Master vždycky NÁSOBÍ zbylé tři (core/store/useZvukStore.ts's
// ziskejHlasitost) — appka to na týhle obrazovce nijak nepředstírá:
// stáhne-li si uživatel Master na 0 %, Buddy/Hra/Music slidery zůstanou
// vizuálně na svém, ale reálně nic neslyší, dokud Master zase nezvedne.
// Změna je OKAMŽITĚ slyšitelná i uprostřed hraní/přehrávání — appka na
// to nemá žádnou vlastní logiku tady, subscribe žije přímo ve
// fighting/sound.ts/music-studio/audioEngine.ts (viz jejich vlastní
// komentář), tahle komponenta jen zapisuje do store.
// ==========================================

const POSUVNIKY: { kategorie: 'master' | ZvukKategorie; ikona: string; nazev: string; popis: string }[] = [
  { kategorie: 'master', ikona: '🔊', nazev: 'Master', popis: 'Celková hlasitost appky — násobí všechny ostatní' },
  { kategorie: 'buddy', ikona: '🤖', nazev: 'Buddy', popis: 'Hlas asistenta, když ti odpovídá' },
  { kategorie: 'hra', ikona: '⚔️', nazev: 'Hra', popis: 'Zvukové efekty v Souboji' },
  { kategorie: 'music', ikona: '🎵', nazev: 'Music', popis: 'Beaty a nahrávky v Music Studiu' },
]

export const ZvukSekce: React.FC = () => {
  const hodnoty = useZvukStore((s) => ({ master: s.master, buddy: s.buddy, hra: s.hra, music: s.music }))
  const setHlasitost = useZvukStore((s) => s.setHlasitost)

  return (
    <section className="settings-card">
      {POSUVNIKY.map((p) => (
        <div key={p.kategorie} className="settings-zvuk-radek">
          <div className="settings-zvuk-hlava">
            <span className="settings-zvuk-ikona" aria-hidden="true">{p.ikona}</span>
            <div>
              <span className="settings-toggle-title">{p.nazev}</span>
              <span className="settings-toggle-sub">{p.popis}</span>
            </div>
            <span className="settings-zvuk-procent">{hodnoty[p.kategorie]}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={hodnoty[p.kategorie]}
            onChange={(e) => setHlasitost(p.kategorie, Number(e.target.value))}
            className="settings-zvuk-slider"
            aria-label={p.nazev}
          />
        </div>
      ))}
    </section>
  )
}

export default ZvukSekce
