import React, { useEffect, useRef, useState } from 'react'
import { useProfileData } from '@/pages/profil/hooks/useProfileData'
import { pripojDoLobby, vygenerujHracId, type PritomnostVLobby } from '../network'
import { jeHostem, odvodKodMistnosti, vyberDvojici } from '../onlineParovani'
import type { PostavaId } from '../combat/postavy'
import { VyberPostavy } from './VyberPostavy'
import { OnlineHost } from './OnlineHost'
import { OnlineGuest } from './OnlineGuest'
import { odemkniZvuk } from '../sound'
import '../FightingModule.css'

interface Props {
  onZpet: () => void
}

type Krok = 'vyberPostavy' | 'hledani' | 'sparovano'

// ==========================================
// Dvanácté kolo vylepšení — online matchmaking, "najdi mi náhodného
// soupeře". Vybere se vlastní postava (stejně jako u kteréhokoli
// jiného vstupu do zápasu), pak appka vstoupí do sdílené fronty
// (network.ts's pripojDoLobby) a čeká, dokud onlineParovani.ts's
// vyberDvojici nevrátí dvojici, ve které je i ONA SAMA — žádný
// centrální rozhodčí appku nepáruje, appka si to spočítá sama ze
// sdíleného presenceState() (viz network.ts's vlastní komentář k
// tomuhle celému mechanismu i jeho poctivě přiznanému omezení).
//
// POCTIVĚ PŘIZNANÝ LIMIT: appka tohle nemá jak ověřit živě v tomhle
// sandboxu (WebSocket upgrady tu proxy nepodporuje, viz CLAUDE.md's
// Souboj Fáze 0) — a navíc by to i mimo sandbox vyžadovalo dva
// SKUTEČNÉ, nezávislé účty/zařízení najednou. Appka to nezkoušela nijak
// obcházet — kód je napsaný a projde typecheckem/buildem, živé
// spárování dvou reálných telefonů zatím nikdo neviděl fungovat.
// ==========================================

export const OnlineLobby: React.FC<Props> = ({ onZpet }) => {
  const { profile } = useProfileData()
  const [krok, setKrok] = useState<Krok>('vyberPostavy')
  const [sparovani, setSparovani] = useState<{ kod: string; jsemHost: boolean; postavaSoupere: PostavaId } | null>(
    null
  )
  const mujIdRef = useRef(vygenerujHracId())
  const postavaRef = useRef<PostavaId | null>(null)
  const spravaRef = useRef<ReturnType<typeof pripojDoLobby> | null>(null)

  useEffect(() => {
    if (krok !== 'hledani' || !postavaRef.current) return
    const sprava = pripojDoLobby(mujIdRef.current, profile.name || 'Hráč', postavaRef.current, {
      zmenaPritomnosti: (pritomni: PritomnostVLobby[]) => {
        const dvojice = vyberDvojici(pritomni)
        if (!dvojice) return
        const [a, b] = dvojice
        const jaJsemA = a.hracId === mujIdRef.current
        const jaJsemB = b.hracId === mujIdRef.current
        if (!jaJsemA && !jaJsemB) return // appka zrovna čeká za dvojicí, co se právě páruje
        const souper = jaJsemA ? b : a
        setSparovani({
          kod: odvodKodMistnosti(mujIdRef.current, souper.hracId),
          jsemHost: jeHostem(mujIdRef.current, souper.hracId),
          postavaSoupere: souper.postavaId,
        })
        setKrok('sparovano')
      },
    })
    spravaRef.current = sprava
    return () => sprava.odejit()
    // profile.name se čte jen v okamžiku vstupu do fronty, ne živě po celou dobu čekání.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [krok])

  if (krok === 'vyberPostavy') {
    return (
      <div className="souboj-page">
        <header className="souboj-top-bar">
          <button className="souboj-back-btn" onClick={onZpet}>
            ← Zpět
          </button>
          <h1 className="souboj-title">Online — vyber postavu</h1>
        </header>
        <VyberPostavy
          onVybrano={(id) => {
            odemkniZvuk()
            postavaRef.current = id
            setKrok('hledani')
          }}
        />
      </div>
    )
  }

  if (krok === 'sparovano' && sparovani && postavaRef.current) {
    return sparovani.jsemHost ? (
      <OnlineHost
        kod={sparovani.kod}
        mojePostava={postavaRef.current}
        postavaSoupere={sparovani.postavaSoupere}
        onZpet={onZpet}
      />
    ) : (
      <OnlineGuest
        kod={sparovani.kod}
        mujHracId={mujIdRef.current}
        jmeno={profile.name || 'Hráč'}
        mojePostava={postavaRef.current}
        postavaSoupere={sparovani.postavaSoupere}
        onZpet={onZpet}
      />
    )
  }

  return (
    <div className="souboj-page">
      <header className="souboj-top-bar">
        <button className="souboj-back-btn" onClick={onZpet}>
          ← Zpět
        </button>
        <h1 className="souboj-title">Hledám soupeře…</h1>
      </header>
      <p className="souboj-sub">
        Appka tě spáruje s prvním dalším hráčem, co taky hledá. Nech telefon otevřený.
      </p>
      <div className="souboj-online-spinner" aria-hidden="true" />
      <button type="button" className="souboj-postava-nahodna" onClick={onZpet}>
        Zrušit hledání
      </button>
    </div>
  )
}
