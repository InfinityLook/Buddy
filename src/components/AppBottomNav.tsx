import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useModulovyPrechod } from '@/core/navigation/useModulovyPrechod'
import { useInbox } from '@/social/inbox'
import { SocialIcon } from '@/social/components/SocialIcon'
import { useBuddyVoice } from '@/buddy/useBuddyVoice'
import { BuddyOverlay } from '@/buddy/BuddyOverlay'
import './AppBottomNav.css'

interface Props {
  /** Hub.tsx sem posílá svoje vlastní otevření hlasového Buddyho — jeho
   *  velká koule nad lištou potřebuje tutéž instanci useBuddyVoice, na
   *  kterou reaguje vizuálně (hub-orb--posloucha/--premysli/--mluvi), a
   *  ta žije v Hub.tsx samotném (viz jeho vlastní komentář). Kdekoli
   *  jinde (Apps/Profil/Nastavení, Fáze 4 Social nav reworku) prop
   *  nepřijde a komponenta si vystačí s vlastní instancí — appka na
   *  žádné z těch stránek nemá žádnou velkou kouli, se kterou by se
   *  ta v liště musela synchronizovat. */
  onTalk?: () => void
}

// ==========================================
// Sdílená spodní navigace appky — Fáze 4 Social nav reworku (viz
// CLAUDE.md). Dřív žila jen v Hub.tsx (hub-bottom-nav); appka teď
// stejnou lištu (Home/Social/Buddy/Chat/Nastavení) vykresluje i na
// Apps/Profil/Nastavení, ať se mezi hlavními obrazovkami appky nemusí
// pokaždé vracet přes Hub. Social má vlastní, jinou spodní lištu
// (Profil/Chaty/Domů/Vyhledávač — vnitřní záložky obrazovky, ne totéž
// co appčiny hlavní cíle) a tahle komponenta se jí schválně netýká.
//
// Route-aware: "Home"/"Nastavení" se zvýrazní podle aktuální cesty
// (useLocation), ne natvrdo — dřív bylo "Home" v Hub.tsx vždycky
// aktivní, protože se lišta vykreslovala jen tam; teď musí umět
// zhasnout na každé jiné stránce a naopak vést zpátky na /hub.
// ==========================================

export const AppBottomNav: React.FC<Props> = ({ onTalk }) => {
  const location = useLocation()
  const navigate = useNavigate()
  // Jen dopředné "→ Social" cesty (Social/Chat) dostávají animovaný
  // přechod — stejné omezení jako Hub.tsx's vlastní komentář u
  // prejit(): "Home"/"Nastavení" jsou neutrální/zpětné trasy, CSS má
  // definovaný jen jeden směr pohybu.
  const prejit = useModulovyPrechod()
  const neprectene = useInbox((s) => s.neprectene)

  const vlastniVoice = useBuddyVoice()
  const [vlastniOtevreny, setVlastniOtevreny] = useState(false)

  const spustitTalk =
    onTalk ??
    (() => {
      vlastniVoice.vycistit()
      setVlastniOtevreny(true)
    })

  const zavritVlastni = () => {
    vlastniVoice.zastavit()
    setVlastniOtevreny(false)
  }

  const jeAktivni = (cesta: string) => location.pathname === cesta

  return (
    <>
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

        <button className="app-nav-item" onClick={() => prejit('/social')}>
          <SocialIcon name="users" size={20} />
          <span>Social</span>
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

      {!onTalk && vlastniOtevreny && <BuddyOverlay voice={vlastniVoice} onZavrit={zavritVlastni} />}
    </>
  )
}
