import React, { useEffect, useRef } from 'react'
import { useSouboj } from '../combat/useSouboj'
import { BARVA_ZIVLU, NAZEV_ZIVLU } from '../combat/karty'
import { Nepritel } from '../combat/types'
import { Postava } from '../types'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { useWalletStore } from '@/core/store/useWalletStore'
import { useGameCharacter } from '../useGameCharacter'
import './Souboj.css'

interface Props {
  postava: Postava
  nepratele: Nepritel[]
  nazevMista: string
  ikonaMista: string
  onOdejit: () => void
  /** Volitelné — volá se jednou při skutečné výhře, vedle recordAction/
   *  credit/pridatXpPostave níž. GameModule.tsx ji předává jen na
   *  lokacích s questem (viz game/data/quests.ts QUEST_PODLE_LOKACE),
   *  aby tenhle soubor nemusel o questech vůbec vědět. */
  onVyhra?: () => void
}

// ==========================================
// Tahový souboj — v aréně proti jednomu soupeři, v dungeonu proti víc
// soupeřům za sebou (viz useSouboj.ts, hráčova výdrž se mezi nimi
// neobnovuje). Hráč zahraje jednu ze tří karet v ruce, useSouboj
// spočítá poškození (bonus živlu, kritický zásah) a hned i protiúder
// nepřítele — dokud jedna strana nedojde na nulu, nebo dokud
// nepřátelé nedojdou.
// Odměna (součet XP + kreditů za všechny poražené) se připíše jen
// jednou na výhru, ne na každé zobrazení výherní obrazovky.
// ==========================================

export const Souboj: React.FC<Props> = ({ postava, nepratele, nazevMista, ikonaMista, onOdejit, onVyhra }) => {
  const {
    faze,
    hracZivoty,
    hracMaxZivoty,
    nepritel,
    nepritelZivoty,
    nepritelMaxZivoty,
    poradiSoupere,
    celkemSouperu,
    ruka,
    log,
    odmenaXp,
    odmenaKredity,
    zahratKartu,
    zkusitZnovu,
  } = useSouboj(postava, nepratele)
  const recordAction = useGamificationStore((s) => s.recordAction)
  const credit = useWalletStore((s) => s.credit)
  const pridatXpPostave = useGameCharacter((s) => s.pridatXpPostave)
  // Hlídá, aby se odměna připsala jen jednou za výhru — "Zkusit znovu"
  // vrátí fázi zpátky na 'probiha', což odemkne odměnu pro příští výhru.
  const odmenaPripsana = useRef(false)

  useEffect(() => {
    if (faze === 'probiha') {
      odmenaPripsana.current = false
      return
    }
    if (faze !== 'vyhra' || odmenaPripsana.current) return
    odmenaPripsana.current = true
    recordAction('battle', odmenaXp)
    credit(odmenaKredity)
    pridatXpPostave(postava.id, odmenaXp)
    onVyhra?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faze])

  return (
    <div className="souboj">
      <div className="souboj-top-bar">
        <button className="game-back-btn" onClick={onOdejit}>
          ← Zpět na mapu
        </button>
        <span className="souboj-nadpis">
          {ikonaMista} {nazevMista}
        </span>
      </div>

      <div className="souboj-obsah">
        {celkemSouperu > 1 && faze === 'probiha' && (
          <span className="souboj-postup">
            Soupeř {poradiSoupere} / {celkemSouperu}
          </span>
        )}

        <div className="souboj-bojovnici">
          <div className="souboj-bojovnik" style={{ '--sb-barva': postava.barva } as React.CSSProperties}>
            <span className="souboj-ikona" aria-hidden="true">
              {postava.ikona}
            </span>
            <span className="souboj-jmeno">{postava.jmeno}</span>
            <div className="souboj-zivoty-track">
              <div
                className="souboj-zivoty-vypln"
                style={{ width: `${Math.max(0, (hracZivoty / hracMaxZivoty) * 100)}%` }}
              />
            </div>
            <span className="souboj-zivoty-cislo">
              {hracZivoty} / {hracMaxZivoty}
            </span>
          </div>

          <span className="souboj-versus">VS</span>

          <div className="souboj-bojovnik" style={{ '--sb-barva': '#f87171' } as React.CSSProperties}>
            <span className="souboj-ikona" aria-hidden="true">
              {nepritel.ikona}
            </span>
            <span className="souboj-jmeno">{nepritel.jmeno}</span>
            <div className="souboj-zivoty-track">
              <div
                className="souboj-zivoty-vypln"
                style={{ width: `${Math.max(0, (nepritelZivoty / nepritelMaxZivoty) * 100)}%` }}
              />
            </div>
            <span className="souboj-zivoty-cislo">
              {nepritelZivoty} / {nepritelMaxZivoty}
            </span>
          </div>
        </div>

        <div className="souboj-log" aria-live="polite">
          {log.slice(-4).map((radek, i) => (
            <p key={log.length - 4 + i}>{radek}</p>
          ))}
        </div>

        {faze === 'probiha' && (
          <div className="souboj-ruka">
            {ruka.map((karta) => {
              const bonus = karta.zivel === postava.bojZivel
              return (
                <button
                  key={karta.id}
                  className={`souboj-karta${bonus ? ' souboj-karta--bonus' : ''}`}
                  style={{ '--sk-barva': BARVA_ZIVLU[karta.zivel] } as React.CSSProperties}
                  onClick={() => zahratKartu(karta)}
                >
                  <span className="souboj-karta-ikona" aria-hidden="true">
                    {karta.ikona}
                  </span>
                  <span className="souboj-karta-nazev">{karta.nazev}</span>
                  <span className="souboj-karta-zivel">{NAZEV_ZIVLU[karta.zivel]}</span>
                  <span className="souboj-karta-poskozeni">
                    {karta.poskozeniOd}–{karta.poskozeniDo}
                    {bonus ? ' ⚡' : ''}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {faze !== 'probiha' && (
          <div className={`souboj-konec souboj-konec--${faze}`}>
            {faze === 'vyhra' ? (
              <>
                <span className="souboj-konec-ikona" aria-hidden="true">
                  🏆
                </span>
                <h2>{celkemSouperu > 1 ? 'Dungeon dokončen!' : 'Výhra!'}</h2>
                <p>
                  Získáváš {odmenaXp} XP a {odmenaKredity} kreditů.
                </p>
              </>
            ) : (
              <>
                <span className="souboj-konec-ikona" aria-hidden="true">
                  💀
                </span>
                <h2>Prohra</h2>
                <p>{nepritel.jmeno} tě tentokrát přemohl. Zkus to znovu.</p>
              </>
            )}
            <div className="souboj-konec-tlacitka">
              <button className="souboj-btn souboj-btn--znovu" onClick={zkusitZnovu}>
                Zkusit znovu
              </button>
              <button className="souboj-btn souboj-btn--mapa" onClick={onOdejit}>
                Zpět na mapu
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
