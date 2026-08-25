import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LOKACE, POPIS_TYPU } from '../lokace'
import { NEPRATELE_PODLE_LOKACE } from '../combat/nepratele'
import { QUESTS } from '../data/quests'
import { useQuestStore, stavQuestu, jeCilSplneny } from '../useQuestStore'
import { Postava } from '../types'
import { useGameCharacter } from '../useGameCharacter'
import { vychoziProgres } from '../leveling'
import './MapaSveta.css'

/** Přesné rozměry public/backgrounds/mapa-sveta.jpg v px — musí sedět
 *  s .mapa-svet v MapaSveta.css (stejný vzor jako @/* alias, co musí
 *  sedět na dvou místech zároveň). Souřadnice pinů v lokace.ts jsou
 *  procenta téhle konkrétní bitmapy, ne libovolného poměru stran. */
const SVET_SIRKA_PX = 1536
const SVET_VYSKA_PX = 1024

interface Props {
  postava: Postava
  /** Volá se po potvrzení vstupu do boje na místě, které ho nabízí (aréna, dungeon). */
  onVstoupitDoBoje: (lokaceId: string) => void
  /** Volá se po potvrzení vstupu na tržiště. */
  onVstoupitDoObchodu: (lokaceId: string) => void
  /** Volá se po potvrzení vstupu do 3D průzkumu (viz Explorace3D.tsx). */
  onVstoupitDoSveta: (lokaceId: string) => void
  /** Volá se klepnutím na značku postavy v horní liště nebo na dlaždici
   *  Hrdina v menu mapy — obojí vede na stejnou obrazovku (viz Hrdina.tsx). */
  onOtevritHrdinu: () => void
  /** Volá se na dlaždici Questy v menu mapy (viz Questy.tsx). */
  onOtevritQuesty: () => void
}

// ==========================================
// Mapa světa — jedna ilustrovaná bitmapa (Buddy Realm) s piny na
// pojmenovaných místech, ne procedurálně kreslená SVG krajina jako
// dřív. Cesty, řeky i terén už jsou namalované přímo v obrázku, takže
// odpadá celá dřívější vrstva gradientů/filtrů/animovaných cest, která
// na slabších telefonech znatelně sekala (viz FPS poznámka v
// CLAUDE.md u předchozí verze mapy) — jeden statický <img> stojí
// prohlížeč zlomek toho, co dřív stálo přemalovávat rozostřenou,
// animovanou SVG vrstvu 60× za sekundu.
//
// Piny, list po klepnutí a boj/tržiště fungují beze změny — mění se
// jen to, na čem piny leží.
// ==========================================

export const MapaSveta: React.FC<Props> = ({
  postava,
  onVstoupitDoBoje,
  onVstoupitDoObchodu,
  onVstoupitDoSveta,
  onOtevritHrdinu,
  onOtevritQuesty,
}) => {
  const navigate = useNavigate()
  const progres = useGameCharacter((s) => s.progres[postava.id]) ?? vychoziProgres()
  const [otevrena, setOtevrena] = useState<string | null>(null)
  const [menuOtevrene, setMenuOtevrene] = useState(false)
  const platnoRef = useRef<HTMLDivElement>(null)

  const prijmoutQuest = useQuestStore((s) => s.prijmoutQuest)
  const aktivniQuesty = useQuestStore((s) => s.aktivni)
  const dokonceneQuesty = useQuestStore((s) => s.dokoncene)
  const splneneCile = useQuestStore((s) => s.splneneCile)

  const detail = LOKACE.find((l) => l.id === otevrena) ?? null
  // 'explorace' lokace mají nepřítele taky (viz combat/nepratele.ts —
  // souboj samotný na konci 3D průzkumu ho pořád potřebuje), ale
  // souboj se z listu místa nespouští přímo — nejdřív musí hráč projít
  // 3D svět a najít ho tam (viz jeExplorace níž).
  const nepratele = detail ? NEPRATELE_PODLE_LOKACE[detail.id] : undefined
  const jeTrziste = detail?.typ === 'trziste'
  const jeExplorace = detail?.typ === 'explorace'
  const quest = detail ? QUESTS.find((q) => q.lokaceId === detail.id) : undefined
  const questStav = quest ? stavQuestu(quest.id, aktivniQuesty, dokonceneQuesty) : undefined

  // Mapa je větší než displej na obě strany — při vstupu ji vycentruje
  // na hlavní město (Solace), střed světa i příběhu, místo levého
  // horního rohu obrázku.
  useEffect(() => {
    const el = platnoRef.current
    const hlavniMesto = LOKACE.find((l) => l.typ === 'hlavni-mesto')
    if (!el || !hlavniMesto) return
    el.scrollLeft = Math.max(0, (hlavniMesto.x / 100) * SVET_SIRKA_PX - el.clientWidth / 2)
    el.scrollTop = Math.max(0, (hlavniMesto.y / 100) * SVET_VYSKA_PX - el.clientHeight / 2)
  }, [])

  return (
    <div className="mapa-sveta">
      <div className="mapa-top-bar">
        <button className="game-back-btn" onClick={() => navigate('/hub')}>
          ← Zpět do Hubu
        </button>
        <button
          className="mapa-postava-znacka"
          style={{ '--mp-barva': postava.barva } as React.CSSProperties}
          onClick={onOtevritHrdinu}
        >
          <span aria-hidden="true">{postava.ikona}</span> {postava.jmeno}
          <span className="mapa-postava-uroven">Lv {progres.uroven}</span>
        </button>
      </div>

      {/* Plovoucí menu — zatím jediná dlaždice (Hrdina), viz komentář
          v .css. Zavře i případně otevřený list místa, ať nejsou na
          obrazovce dva overlaye najednou. */}
      <button
        className="mapa-menu-fab"
        aria-label="Menu"
        onClick={() => {
          setOtevrena(null)
          setMenuOtevrene(true)
        }}
      >
        ☰
      </button>

      {/* Dekorativní kompas — čistě orientační HUD prvek, nic neovládá. */}
      <svg className="mapa-kompas" viewBox="0 0 40 40" aria-hidden="true">
        <circle cx="20" cy="20" r="17" fill="rgba(10,8,20,0.55)" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
        <path d="M20 5 L23 20 L20 35 L17 20 Z" fill="rgba(251,191,36,0.85)" />
        <circle cx="20" cy="20" r="2.2" fill="#0c0a16" stroke="rgba(255,255,255,0.4)" strokeWidth="0.6" />
        <text x="20" y="10.5" textAnchor="middle" fontSize="5" fill="rgba(255,255,255,0.7)" fontWeight="800">
          S
        </text>
      </svg>

      <div className="mapa-platno" ref={platnoRef}>
        <div className="mapa-svet">
          <img className="mapa-obrazek" src="/backgrounds/mapa-sveta.jpg" alt="" aria-hidden="true" draggable={false} />

          {/* Vinětace — okraje mapy jemně ztmavené, ať piny a jejich
              popisky vyniknou i na světlejších částech ilustrace. */}
          <div className="mapa-vinetace" aria-hidden="true" />

          {LOKACE.map((l) => (
            <button
              key={l.id}
              className={`mapa-pin mapa-pin--${l.typ}`}
              style={{ left: `${l.x}%`, top: `${l.y}%`, '--mp-barva': l.barva } as React.CSSProperties}
              onClick={() => setOtevrena(l.id)}
            >
              <span className="mapa-pin-znacka">
                <span className="mapa-pin-ikona" aria-hidden="true">
                  {l.ikona}
                </span>
              </span>
              <span className="mapa-pin-stin" aria-hidden="true" />
              <span className="mapa-pin-nazev">{l.nazev}</span>
            </button>
          ))}
        </div>
      </div>

      {detail && (
        <>
          <div className="mapa-sheet-overlay" onClick={() => setOtevrena(null)} />
          <div className="mapa-sheet" style={{ borderColor: detail.barva }}>
            <span className="mapa-sheet-znak" style={{ '--mp-barva': detail.barva } as React.CSSProperties}>
              <span className="mapa-sheet-ikona" aria-hidden="true">
                {detail.ikona}
              </span>
            </span>
            <span className="mapa-sheet-typ" style={{ color: detail.barva }}>
              {POPIS_TYPU[detail.typ]}
            </span>
            <h2 className="mapa-sheet-nazev">{detail.nazev}</h2>
            <p className="mapa-sheet-text">
              {jeTrziste
                ? 'Trvalá vylepšení za kredity z boje — elixíry, čepele a další věci, co platí pro celou tvou partu.'
                : jeExplorace
                  ? (quest?.popis ?? 'Nové místo k prozkoumání ve 3D — vydej se dovnitř a podívej se, co tam najdeš.')
                  : nepratele
                    ? nepratele.length > 1
                      ? `${nepratele.length} nepřátel na tebe čeká za sebou — výdrž se mezi nimi neobnoví. Troufneš si?`
                      : `${nepratele[0].jmeno} tě čeká — troufneš si na souboj?`
                    : detail.typ === 'hlavni-mesto'
                      ? 'Hlavní město je vyhrazené pro dějovou linku hry — ta zatím nevznikla, přijde v některém z dalších kroků.'
                      : 'Tohle místo zatím nikam nevede — je připravené a obsah do něj teprve přibude.'}
            </p>

            {/* Quest se musí nejdřív přijmout, teprve pak jde vstoupit
                do světa — cíle se ukazují hned, ať je jasné, na čem
                quest reálně stojí. */}
            {jeExplorace && quest && questStav === 'nedostupny' && (
              <button className="mapa-sheet-boj" onClick={() => prijmoutQuest(quest.id)}>
                📜 Přijmout quest
              </button>
            )}
            {jeExplorace && quest && questStav !== 'nedostupny' && (
              <ul className="mapa-sheet-cile">
                {quest.cile.map((c) => (
                  <li key={c.id} className={jeCilSplneny(quest.id, c.id, splneneCile) ? 'je-splneny' : ''}>
                    <span aria-hidden="true">{jeCilSplneny(quest.id, c.id, splneneCile) ? '✅' : '⬜'}</span> {c.popis}
                  </li>
                ))}
              </ul>
            )}
            {jeExplorace && (!quest || questStav !== 'nedostupny') && (
              <button
                className="mapa-sheet-boj"
                onClick={() => {
                  onVstoupitDoSveta(detail.id)
                  setOtevrena(null)
                }}
              >
                🌲 Vstoupit do světa
              </button>
            )}
            {jeExplorace && quest && questStav === 'splneny' && (
              <p className="mapa-sheet-quest-hotovo">✅ Quest splněn — svět se dá i tak znovu projít.</p>
            )}
            {nepratele && !jeExplorace && (
              <button
                className="mapa-sheet-boj"
                onClick={() => {
                  onVstoupitDoBoje(detail.id)
                  setOtevrena(null)
                }}
              >
                ⚔️ Vstoupit do boje
              </button>
            )}
            {jeTrziste && (
              <button
                className="mapa-sheet-boj"
                onClick={() => {
                  onVstoupitDoObchodu(detail.id)
                  setOtevrena(null)
                }}
              >
                🏪 Vstoupit na tržiště
              </button>
            )}
            <button className="mapa-sheet-close" onClick={() => setOtevrena(null)}>
              Zavřít
            </button>
          </div>
        </>
      )}

      {menuOtevrene && (
        <>
          <div className="mapa-sheet-overlay" onClick={() => setMenuOtevrene(false)} />
          <div className="mapa-menu">
            <div className="mapa-menu-hlavicka">
              <h2 className="mapa-menu-title">Menu</h2>
              <button className="mapa-menu-zavrit" aria-label="Zavřít menu" onClick={() => setMenuOtevrene(false)}>
                ✕
              </button>
            </div>
            <div className="mapa-menu-mrizka">
              <button
                className="mapa-menu-dlazdice"
                onClick={() => {
                  setMenuOtevrene(false)
                  onOtevritHrdinu()
                }}
              >
                <span className="mapa-menu-dlazdice-ikona" aria-hidden="true">
                  🧙
                </span>
                <span className="mapa-menu-dlazdice-nazev">Hrdina</span>
              </button>
              <button
                className="mapa-menu-dlazdice"
                onClick={() => {
                  setMenuOtevrene(false)
                  onOtevritQuesty()
                }}
              >
                <span className="mapa-menu-dlazdice-ikona" aria-hidden="true">
                  📜
                </span>
                <span className="mapa-menu-dlazdice-nazev">Questy</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
