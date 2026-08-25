import React from 'react'
import { QUESTS } from '../data/quests'
import { LOKACE } from '../lokace'
import { useQuestStore, jeCilSplneny } from '../useQuestStore'
import './Questy.css'

interface Props {
  onOdejit: () => void
}

// ==========================================
// Quest log — přehled questů podle stavu (viz useQuestStore.ts:
// nedostupný/aktivní/splněný). Čistě čtecí obrazovka, žádná akce tu
// nežije — quest se přijímá a jeho cíle se plní jinde (list místa v
// MapaSveta.tsx, souboj v Explorace3D.tsx/Souboj.tsx), tenhle screen
// jen ukazuje, kde hráč je. Otevírá se z mapa-menu (MapaSveta.tsx),
// druhá dlaždice vedle Hrdiny.
// ==========================================

export const Questy: React.FC<Props> = ({ onOdejit }) => {
  const aktivni = useQuestStore((s) => s.aktivni)
  const dokoncene = useQuestStore((s) => s.dokoncene)
  const splneneCile = useQuestStore((s) => s.splneneCile)

  const aktivniQuesty = QUESTS.filter((q) => aktivni.includes(q.id))
  const splneneQuesty = QUESTS.filter((q) => dokoncene.includes(q.id))
  const dostupneQuesty = QUESTS.filter((q) => !aktivni.includes(q.id) && !dokoncene.includes(q.id))

  const nazevLokace = (lokaceId: string) => LOKACE.find((l) => l.id === lokaceId)?.nazev ?? lokaceId

  return (
    <div className="questy">
      <div className="qs-top-bar">
        <button className="game-back-btn" onClick={onOdejit}>
          ← Zpět na mapu
        </button>
      </div>

      <h1 className="qs-title">Questy</h1>

      {aktivniQuesty.length === 0 && dostupneQuesty.length === 0 && splneneQuesty.length === 0 && (
        <p className="qs-prazdno">Zatím žádné questy — vydej se na mapu a najdi první.</p>
      )}

      {aktivniQuesty.length > 0 && (
        <section className="qs-sekce">
          <h2 className="qs-sekce-title">Aktivní</h2>
          {aktivniQuesty.map((q) => (
            <div key={q.id} className="qs-karta">
              <h3 className="qs-karta-jmeno">{q.nazev}</h3>
              <p className="qs-karta-lokace">📍 {nazevLokace(q.lokaceId)}</p>
              <ul className="qs-karta-cile">
                {q.cile.map((c) => (
                  <li key={c.id} className={jeCilSplneny(q.id, c.id, splneneCile) ? 'je-splneny' : ''}>
                    <span aria-hidden="true">{jeCilSplneny(q.id, c.id, splneneCile) ? '✅' : '⬜'}</span> {c.popis}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      {dostupneQuesty.length > 0 && (
        <section className="qs-sekce">
          <h2 className="qs-sekce-title">Dostupné</h2>
          {dostupneQuesty.map((q) => (
            <div key={q.id} className="qs-karta qs-karta--dostupny">
              <h3 className="qs-karta-jmeno">{q.nazev}</h3>
              <p className="qs-karta-lokace">📍 {nazevLokace(q.lokaceId)} — navštiv místo a quest přijmi</p>
            </div>
          ))}
        </section>
      )}

      {splneneQuesty.length > 0 && (
        <section className="qs-sekce">
          <h2 className="qs-sekce-title">Splněné</h2>
          {splneneQuesty.map((q) => (
            <div key={q.id} className="qs-karta qs-karta--splneny">
              <h3 className="qs-karta-jmeno">✅ {q.nazev}</h3>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
