import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useModulovyPrechod } from '@/core/navigation/useModulovyPrechod'
import { sousedniStranky, type ModulovaStranka } from '@/core/navigation/moduloveStranky'
import { useInbox } from '@/social/inbox'
import { SocialIcon } from '@/social/components/SocialIcon'
import { useBuddyVoice } from '@/buddy/useBuddyVoice'
import { BuddyOverlay } from '@/buddy/BuddyOverlay'
import './AppBottomNav.css'

// ==========================================
// Sdílená spodní navigace appky — Fáze 4 Social nav reworku (viz
// CLAUDE.md). Dřív žila jen v Hub.tsx (hub-bottom-nav); appka teď
// stejnou lištu (Home/Hledat/Buddy/Chat/Nastavení) vykresluje na
// Hub/Apps/Profil/Nastavení, ať se mezi hlavními obrazovkami appky
// nemusí pokaždé vracet přes Hub. Social má vlastní, jinou spodní
// lištu (Profil/Chaty/Domů/Vyhledávač — vnitřní záložky obrazovky, ne
// totéž co appčiny hlavní cíle) a tahle komponenta se jí schválně
// netýká.
//
// "Social" (obyčejný vstup na /social) tu bývalo — nahradilo ho
// "Hledat" (appka do Socialu pořád vede přes velkou kartu na Hubu
// a přes "Chat" tady v liště, druhý obecný vstup navíc byl
// nadbytečný), lupa se sem přestěhovala z Hubovy hlavičky, kde dřív
// bydlela jako samostatná ikona vedle zvonku.
//
// Route-aware: "Home"/"Nastavení" se zvýrazní podle aktuální cesty
// (useLocation), ne natvrdo — dřív bylo "Home" v Hub.tsx vždycky
// aktivní, protože se lišta vykreslovala jen tam; teď musí umět
// zhasnout na každé jiné stránce a naopak vést zpátky na /hub.
//
// Appka si vlastní instanci useBuddyVoice bere sama, na každé
// stránce stejně — žádná z nich už nemá velkou kouli maskota (Hub
// svou odstranil), se kterou by se muselo sdílet.
//
// `sousedniFn`/`onSipkaKlik` jsou nové, oba nepovinné — výchozí
// hodnoty (sousedniStranky() + obyčejný navigate()) drží appčino
// dosavadní chování na Hub/Apps/Profil/Nastavení beze změny.
// FlagshipShell.tsx (šipky mezi vlajkovými Roomy) posílá sousedniRoom()
// (zacykluje) a onSipkaKlik volající useModulovyPrechod() (animovaný
// slide), ať šipka i swipe na Roomech vypadají stejně.
// ==========================================

interface Props {
  sousedniFn?: (pathname: string) => { predchozi: ModulovaStranka | null; dalsi: ModulovaStranka | null }
  onSipkaKlik?: (cesta: string, smer: 'vpravo' | 'vlevo') => void
}

export const AppBottomNav: React.FC<Props> = ({ sousedniFn, onSipkaKlik }) => {
  const location = useLocation()
  const navigate = useNavigate()
  // Jen dopředné "→ Social" cesty (Hledat/Chat) dostávají animovaný
  // přechod — stejné omezení jako Hub.tsx's vlastní komentář u
  // prejit(): "Home"/"Nastavení" jsou neutrální/zpětné trasy, CSS má
  // definovaný jen jeden směr pohybu.
  const prejit = useModulovyPrechod()
  const neprectene = useInbox((s) => s.neprectene)

  const vlastniVoice = useBuddyVoice()
  const [vlastniOtevreny, setVlastniOtevreny] = useState(false)

  const spustitTalk = () => {
    vlastniVoice.vycistit()
    setVlastniOtevreny(true)
  }

  const zavritVlastni = () => {
    vlastniVoice.zastavit()
    setVlastniOtevreny(false)
  }

  const jeAktivni = (cesta: string) => location.pathname === cesta

  // Fáze 5 Social nav reworku — šipky doplňují touch swipe (viz
  // useModulovySwipe.ts) pro myš/klávesnici bez dotykové obrazovky;
  // appka je schovává přes @media (pointer: fine) v CSS, ne JS
  // detekcí zařízení, stejný vzor jako VirtualniJoystick.tsx (jen
  // obráceně — tady se skrývají NA dotykovém zařízení, joystick se
  // schovává BEZ něj). Nezobrazí se na konci seznamu (Hub nemá
  // "předchozí", Nastavení nemá "další").
  const { predchozi, dalsi } = (sousedniFn ?? sousedniStranky)(location.pathname)
  const jitNa = (cesta: string, smer: 'vpravo' | 'vlevo') => {
    if (onSipkaKlik) onSipkaKlik(cesta, smer)
    else navigate(cesta)
  }

  return (
    <>
      {predchozi && (
        <button
          className="modul-sipka modul-sipka--vlevo"
          aria-label={`Přejít na ${predchozi.popis}`}
          onClick={() => jitNa(predchozi.cesta, 'vlevo')}
        >
          <SocialIcon name="arrow-left" size={18} />
        </button>
      )}
      {dalsi && (
        <button
          className="modul-sipka modul-sipka--vpravo"
          aria-label={`Přejít na ${dalsi.popis}`}
          onClick={() => jitNa(dalsi.cesta, 'vpravo')}
        >
          <SocialIcon name="arrow-left" size={18} />
        </button>
      )}

      <nav className="app-bottom-nav">
        <button
          className={`app-nav-item ${jeAktivni('/hub') ? 'app-nav-item--active' : ''}`}
          aria-current={jeAktivni('/hub') ? 'page' : undefined}
          onClick={() => {
            if (!jeAktivni('/hub')) navigate('/hub')
          }}
        >
          <SocialIcon name="home" size={20} />
          <span>Home</span>
        </button>

        <button className="app-nav-item" onClick={() => prejit('/social?zalozka=vyhledavac')}>
          <SocialIcon name="search" size={20} />
          <span>Hledat</span>
        </button>

        <button className="app-nav-orb" aria-label="Promluvit s Buddym" onClick={spustitTalk}>
          <span className="app-nav-orb-oko" />
          <span className="app-nav-orb-oko" />
        </button>

        <button className="app-nav-item" onClick={() => prejit('/social?zalozka=chaty')}>
          <span className="app-nav-icon-wrap">
            <SocialIcon name="chat" size={20} />
            {neprectene > 0 && <span className="app-nav-dot" aria-hidden="true" />}
          </span>
          <span>Chat</span>
        </button>

        <button
          className={`app-nav-item ${jeAktivni('/nastaveni') ? 'app-nav-item--active' : ''}`}
          aria-current={jeAktivni('/nastaveni') ? 'page' : undefined}
          onClick={() => {
            if (!jeAktivni('/nastaveni')) navigate('/nastaveni')
          }}
        >
          <SocialIcon name="settings" size={20} />
          <span>Settings</span>
        </button>
      </nav>

      {vlastniOtevreny && <BuddyOverlay voice={vlastniVoice} onZavrit={zavritVlastni} />}
    </>
  )
}
