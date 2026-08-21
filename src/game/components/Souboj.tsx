import React, { useEffect, useRef } from 'react'
import { useSouboj } from '../combat/useSouboj'
import { BARVA_ZIVLU, NAZEV_ZIVLU } from '../combat/karty'
import { Nepritel } from '../combat/types'
import { Postava } from '../types'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { useWalletStore } from '@/core/store/useWalletStore'
import './Souboj.css'

interface Props {
  postava: Postava
  nepritel: Nepritel
  onOdejit: () => void
}

// ==========================================
// Tahový souboj v aréně. Hráč zahraje jednu ze tří karet v ruce,
// useSouboj spočítá poškození (bonus živlu, kritický zásah) a hned
// i protiúder nepřítele — dokud jedna strana nedojde na nulu.
// Odměna (XP + kredity) se připíše jen jednou na výhru, ne na každé
// zobrazení výherní obrazovky.
// ==========================================

export const Souboj: React.FC<Props> = ({ postava, nepritel, onOdejit }) => {
  const { faze, hracZivoty, hracMaxZivoty, nepritelZivoty, nepritelMaxZivoty, ruka, log, zahratKartu, zkusitZnovu } =
    useSouboj(postava, nepritel)
  const recordAction = useGamificationStore((s) => s.recordAction)
  const credit = useWalletStore((s) => s.credit)
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
    recordAction('battle', nepritel.odmenaXp)
    credit(nepritel.odmenaKredity)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faze])

  return (
    <div className="souboj">
      <div className="souboj-top-bar">
        <button className="game-back-btn" onClick={onOdejit}>
          ← Zpět na mapu
        </button>
        <span className="souboj-nadpis">🗡️ Aréna</span>
      </div>

      <div className="souboj-obsah">
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
                <h2>Výhra!</h2>
                <p>
                  Získáváš {nepritel.odmenaXp} XP a {nepritel.odmenaKredity} kreditů.
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
