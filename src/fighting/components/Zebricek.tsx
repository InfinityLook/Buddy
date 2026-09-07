import React, { useState } from 'react'
import { nahodnaArena } from '../arena/areny'
import type { ArenaId } from '../arena/areny'
import { nahodnaPostava } from '../combat/ai'
import type { PostavaId } from '../combat/postavy'
import { obtiznostProVlnu } from '../zebricek'
import { useSoubojStatistikyStore } from '../useSoubojStatistikyStore'
import { odemkniZvuk } from '../sound'
import { VyberPostavy } from './VyberPostavy'
import { ProtiPocitaci } from './ProtiPocitaci'
import { sdilejText } from '../sdileni'
import '../FightingModule.css'

interface Props {
  onZpet: () => void
}

type Krok = 'vyberPostavy' | 'hra' | 'konec'

// ==========================================
// Dvanácté kolo vylepšení — Arkádový žebříček proti botům. Jedna
// postava, jedno pokračování — hráč postupuje vlnu po vlně (vždycky
// jeden zápas na 1 kolo, ProtiPocitaci.tsx), obtížnost soupere roste
// s číslem vlny (zebricek.ts's obtiznostProVlnu) a aréna/souperova
// postava se losuje znovu KAŽDOU vlnu (nahodnaArena/nahodnaPostava,
// stejné funkce jako "Překvapte mě"/"Náhodná aréna" jinde v appce), ať
// se běh neopakuje stejným zápasem donekonečna. Jedna prohra běh
// ukončí — appka nemá žádné "životy navíc", ladder žije a umírá na
// první ztracené kolo, stejně jako u skutečné arkádové hry.
//
// `key={vlna}` na <ProtiPocitaci> níž appku donutí vytvořit ÚPLNĚ
// NOVOU instanci komponenty na každou vlnu — ProtiPocitaci svůj vlastní
// SoubojStav/intro počítá jen JEDNOU při připojení (stejná disciplína
// jako TvHost.tsx/LocalniZapas.tsx), takže bez nového klíče by appka
// po výhře jen dál kreslila stejné, už skončené kolo.
// ==========================================

export const Zebricek: React.FC<Props> = ({ onZpet }) => {
  const [krok, setKrok] = useState<Krok>('vyberPostavy')
  const [postavaHrace, setPostavaHrace] = useState<PostavaId | null>(null)
  const [vlna, setVlna] = useState(1)
  const [souper, setSouper] = useState<{ postavaBota: PostavaId; arenaId: ArenaId } | null>(null)
  const nejlepsiVlna = useSoubojStatistikyStore((s) => s.nejlepsiVlnaZebricku)
  const zaznamenejVlnuZebricku = useSoubojStatistikyStore((s) => s.zaznamenejVlnuZebricku)

  const zacniVlnu = (cisloVlny: number) => {
    setSouper({ postavaBota: nahodnaPostava(), arenaId: nahodnaArena() })
    setVlna(cisloVlny)
    setKrok('hra')
  }

  if (krok === 'vyberPostavy') {
    return (
      <div className="souboj-page">
        <header className="souboj-top-bar">
          <button className="souboj-back-btn" onClick={onZpet}>
            ← Zpět
          </button>
          <h1 className="souboj-title">Žebříček</h1>
        </header>
        <p className="souboj-sub">
          Poraz co nejvíc souperů v řadě — obtížnost roste s každou vlnou. Nejlepší dosažená vlna: {nejlepsiVlna || '—'}
        </p>
        <VyberPostavy
          onVybrano={(id) => {
            odemkniZvuk()
            setPostavaHrace(id)
            zacniVlnu(1)
          }}
        />
      </div>
    )
  }

  if (krok === 'konec') {
    const rekord = vlna > nejlepsiVlna
    return (
      <div className="souboj-page">
        <header className="souboj-top-bar">
          <button className="souboj-back-btn" onClick={onZpet}>
            ← Zpět
          </button>
          <h1 className="souboj-title">Žebříček</h1>
        </header>
        <div className="souboj-recap" aria-label="Konec běhu">
          <span className="souboj-recap-nadpis">{rekord ? '🏆 Nový rekord!' : 'Konec běhu'}</span>
          <span className="souboj-recap-radek">
            <span>Dosažená vlna</span>
            <span>{vlna}</span>
          </span>
          <span className="souboj-recap-radek">
            <span>Nejlepší dosud</span>
            <span>{Math.max(vlna, nejlepsiVlna)}</span>
          </span>
        </div>
        <button
          type="button"
          className="souboj-solo-btn"
          onClick={() =>
            void sdilejText(`Dosáhl jsem vlny ${vlna} v žebříčku Souboj! 🏆`)
          }
        >
          📤 Sdílet výsledek
        </button>
        <button type="button" className="souboj-solo-btn" onClick={() => zacniVlnu(1)}>
          Zkusit znovu
        </button>
      </div>
    )
  }

  if (!postavaHrace || !souper) return null

  return (
    <ProtiPocitaci
      key={vlna}
      postavaHrace={postavaHrace}
      postavaBota={souper.postavaBota}
      arenaId={souper.arenaId}
      obtiznost={obtiznostProVlnu(vlna)}
      jmenoBota={`Vlna ${vlna}`}
      onVysledek={(vyhral) => {
        if (vyhral) {
          zacniVlnu(vlna + 1)
        } else {
          zaznamenejVlnuZebricku(vlna)
          setKrok('konec')
        }
      }}
      onZpet={onZpet}
    />
  )
}
