import React from 'react'
import { useGameCharacter } from '../useGameCharacter'
import { useWalletStore } from '@/core/store/useWalletStore'
import { useVybaveniStore } from '../useVybaveniStore'
import { VYBAVENI } from '../data/equipment'
import { Postava } from '../types'
import {
  Dovednost,
  MAX_DOVEDNOST_RANK,
  MAX_UROVEN,
  POPIS_DOVEDNOSTI,
  vychoziProgres,
  xpProDalsiUroven,
} from '../leveling'
import { vypocitejBojoveStatistiky } from '../combat/useSouboj'
import { NAZEV_ZIVLU } from '../combat/karty'
import { PREDMETY } from '../obchod/predmety'
import './Hrdina.css'

interface Props {
  postava: Postava
  onOdejit: () => void
  /** Volá se z tlačítka ve Vylepšení — otevírá tržiště přímo odsud,
   *  beze změny na mapě (viz GameModule.tsx, mapa řeší svůj vlastní
   *  vstup přes pin Tržiště). */
  onOtevritObchod: () => void
}

const DOVEDNOSTI: Dovednost[] = ['vydrz', 'sila', 'presnost']

// ==========================================
// Hrdina — jedna obrazovka pro všechno kolem konkrétní postavy:
// portrét a úroveň, efektivní bojové statistiky (postava + úroveň +
// koupená vylepšení, stejný výpočet jako doopravdy běží v souboji —
// viz vypocitejBojoveStatistiky), zkratka do tržiště a strom
// dovedností. Dřív byl strom dovedností samostatná obrazovka
// (Dovednosti.tsx) — teď je to jen jedna sekce tady, protože všechny
// čtyři věci mluví o tomtéž (jak silná je moje postava a jak ji
// posunout dál) a dřív byly rozeseté po třech různých místech
// (postavy.ts karta, Obchod.tsx, Dovednosti.tsx).
//
// Otevírá se dvěma cestami se stejným výsledkem — klepnutím na
// značku postavy v horní liště mapy (rychlá zkratka) i přes položku
// Hrdina v mapa-menu (viz MapaSveta.tsx) — obě jen volají
// onOtevritHrdinu v GameModule.tsx.
// ==========================================

export const Hrdina: React.FC<Props> = ({ postava, onOdejit, onOtevritObchod }) => {
  const progres = useGameCharacter((s) => s.progres[postava.id]) ?? vychoziProgres()
  const vylepsitDovednost = useGameCharacter((s) => s.vylepsitDovednost)
  const ownedItems = useWalletStore((s) => s.ownedItems)
  const vlastneneVybaveni = useVybaveniStore((s) => s.vlastnene)
  const nasazenaVybaveniId = useVybaveniStore((s) => s.nasazene[postava.id])
  const nasaditVybaveni = useVybaveniStore((s) => s.nasaditVybaveni)

  const naMaximu = progres.uroven >= MAX_UROVEN
  const potrebaXp = naMaximu ? 0 : xpProDalsiUroven(progres.uroven)
  const postupProcenta = naMaximu ? 100 : Math.min(100, (progres.xp / potrebaXp) * 100)

  const { maxVydrz, poskozeniBonus, kritickaBonus } = vypocitejBojoveStatistiky(
    postava,
    progres,
    ownedItems,
    nasazenaVybaveniId
  )
  const kritickaCelkem = postava.bojKriticka + kritickaBonus
  const poskozeniZivel = (1 + poskozeniBonus) * postava.bojNasobicPoskozeni - 1

  const vlastnenaVylepseni = PREDMETY.filter((p) => ownedItems.includes(p.id)).length

  return (
    <div className="hrdina" style={{ '--tp-barva': postava.barva } as React.CSSProperties}>
      <div className="hr-top-bar">
        <button className="game-back-btn" onClick={onOdejit}>
          ← Zpět na mapu
        </button>
      </div>

      <div className="hr-hlavicka">
        <img className="hr-portret" src={postava.portret} alt={`${postava.jmeno} — ${postava.popis}`} draggable={false} />
        <div className="hr-hlavicka-text">
          <span className="hr-jmeno">
            <span aria-hidden="true">{postava.ikona}</span> {postava.jmeno}
          </span>
          <span className="hr-uroven">{naMaximu ? 'Maximální úroveň' : `Úroveň ${progres.uroven}`}</span>

          <div className="hr-postup">
            <div className="hr-postup-track">
              <div className="hr-postup-vypln" style={{ width: `${postupProcenta}%` }} />
            </div>
            <span className="hr-postup-cislo">
              {naMaximu ? `Úroveň ${MAX_UROVEN} — vše otevřeno` : `${progres.xp} / ${potrebaXp} XP do další úrovně`}
            </span>
          </div>
        </div>
      </div>

      {/* ---------- statistiky ---------- */}
      <section className="hr-sekce">
        <h2 className="hr-sekce-title">Statistiky</h2>
        <p className="hr-sekce-hint">Postava + úroveň + koupená vylepšení dohromady — přesně čísla, se kterými jdeš do boje.</p>
        <div className="hr-staty">
          <div className="hr-stat">
            <span className="hr-stat-ikona" aria-hidden="true">❤️</span>
            <span className="hr-stat-hodnota">{maxVydrz}</span>
            <span className="hr-stat-nazev">Výdrž</span>
          </div>
          <div className="hr-stat">
            <span className="hr-stat-ikona" aria-hidden="true">🎯</span>
            <span className="hr-stat-hodnota">{Math.round(kritickaCelkem * 100)} %</span>
            <span className="hr-stat-nazev">Kritická šance</span>
          </div>
          <div className="hr-stat">
            <span className="hr-stat-ikona" aria-hidden="true">💥</span>
            <span className="hr-stat-hodnota">×{postava.bojKritickyNasobic}</span>
            <span className="hr-stat-nazev">Kritický násobič</span>
          </div>
          <div className="hr-stat">
            <span className="hr-stat-ikona" aria-hidden="true">⚔️</span>
            <span className="hr-stat-hodnota">+{Math.round(poskozeniZivel * 100)} %</span>
            <span className="hr-stat-nazev">Poškození ({NAZEV_ZIVLU[postava.bojZivel]})</span>
          </div>
        </div>
      </section>

      {/* ---------- signální schopnost (čistě informační — použije se
          až v souboji, viz Souboj.tsx) ---------- */}
      <section className="hr-sekce">
        <h2 className="hr-sekce-title">Schopnost</h2>
        <div className="hr-schopnost-karta">
          <span className="hr-schopnost-ikona" aria-hidden="true">
            {postava.specialniSchopnost.ikona}
          </span>
          <div className="hr-schopnost-text">
            <span className="hr-schopnost-nazev">{postava.specialniSchopnost.nazev}</span>
            <span className="hr-schopnost-popis">{postava.specialniSchopnost.popis}</span>
            <span className="hr-schopnost-hint">Jednou za souboj, mimo běžné kartičky.</span>
          </div>
        </div>
      </section>

      {/* ---------- vylepšení (zkratka do tržiště) ---------- */}
      <section className="hr-sekce">
        <h2 className="hr-sekce-title">Vylepšení</h2>
        <div className="hr-obchod-karta">
          <span className="hr-obchod-text">
            Vlastníš {vlastnenaVylepseni} / {PREDMETY.length} vylepšení z tržiště — platí pro celou tvou partu.
          </span>
          <button className="hr-obchod-tlacitko" onClick={onOtevritObchod}>
            🏪 Otevřít tržiště
          </button>
        </div>
      </section>

      {/* ---------- vybavení (Fáze 9) — vlastní se účtově (jako
          obchod), ale nasazuje se za tuhle konkrétní postavu; efekt se
          promítá i do Statistik výš (stejný vypocitejBojoveStatistiky
          jako v souboji, viz komentář nahoře souboru). ---------- */}
      <section className="hr-sekce">
        <h2 className="hr-sekce-title">Vybavení</h2>
        {vlastneneVybaveni.length === 0 ? (
          <p className="hr-sekce-hint">Zatím nemáš žádné vybavení — poraz bosse pro jejich vzácné relikvie.</p>
        ) : (
          <div className="hr-strom">
            {VYBAVENI.filter((v) => vlastneneVybaveni.includes(v.id)).map((v) => {
              const nasazeno = nasazenaVybaveniId === v.id
              const efekty = [
                v.bonusVydrz > 0 ? `+${v.bonusVydrz} výdrže` : null,
                v.bonusPoskozeni > 0 ? `+${Math.round(v.bonusPoskozeni * 100)} % poškození` : null,
                v.bonusKriticka > 0 ? `+${Math.round(v.bonusKriticka * 100)} % kritická šance` : null,
              ].filter(Boolean)
              return (
                <div key={v.id} className={`hr-uzel${nasazeno ? ' hr-uzel--nasazeno' : ''}`}>
                  <span className="hr-uzel-ikona" aria-hidden="true">
                    {v.ikona}
                  </span>
                  <div className="hr-uzel-text">
                    <span className="hr-uzel-jmeno">{v.nazev}</span>
                    <span className="hr-uzel-efekt">{efekty.join(', ')}</span>
                  </div>
                  <button
                    className="hr-vylepsit"
                    onClick={() => nasaditVybaveni(postava.id, nasazeno ? null : v.id)}
                  >
                    {nasazeno ? 'Sundat' : 'Nasadit'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ---------- strom dovedností ---------- */}
      <section className="hr-sekce">
        <h2 className="hr-sekce-title">Strom dovedností</h2>
        <div className="hr-body">
          {progres.dovednostniBody > 0
            ? `Máš ${progres.dovednostniBody} ${progres.dovednostniBody === 1 ? 'nevyužitý bod' : 'nevyužité body'} k rozdání.`
            : 'Žádné nevyužité dovednostní body — vyhraj další souboj pro postup.'}
        </div>

        <div className="hr-strom">
          {DOVEDNOSTI.map((dovednost) => {
            const popis = POPIS_DOVEDNOSTI[dovednost]
            const stupen = progres.dovednosti[dovednost]
            const naMaxStupni = stupen >= MAX_DOVEDNOST_RANK
            return (
              <div key={dovednost} className="hr-uzel">
                <span className="hr-uzel-ikona" aria-hidden="true">
                  {popis.ikona}
                </span>
                <div className="hr-uzel-text">
                  <span className="hr-uzel-jmeno">{popis.nazev}</span>
                  <span className="hr-uzel-efekt">{popis.efektNaStupen} za stupeň</span>
                  <div className="hr-uzel-tecky">
                    {Array.from({ length: MAX_DOVEDNOST_RANK }, (_, i) => (
                      <span key={i} className={`hr-tecka ${i < stupen ? 'hr-tecka--aktivni' : ''}`} />
                    ))}
                  </div>
                </div>
                <button
                  className="hr-vylepsit"
                  disabled={naMaxStupni || progres.dovednostniBody <= 0}
                  onClick={() => vylepsitDovednost(postava.id, dovednost)}
                >
                  {naMaxStupni ? 'Max' : '+ Vylepšit'}
                </button>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
