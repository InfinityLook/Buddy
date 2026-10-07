import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useModulovyPrechod } from '@/core/navigation/useModulovyPrechod'
import { sousedniStranky, type ModulovaStranka } from '@/core/navigation/moduloveStranky'
import { useInbox } from '@/social/inbox'
import { SocialIcon } from '@/social/components/SocialIcon'
import { useProfileData } from '@/pages/profil/hooks/useProfileData'
import './AppBottomNav.css'

// ==========================================
// Sdílená spodní navigace appky — Fáze 4 Social nav reworku (viz
// CLAUDE.md). Dřív žila jen v Hub.tsx (hub-bottom-nav); appka teď
// stejnou lištu (Profil/Chat/Home/Hledat/Nastavení) vykresluje na
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
// "Profil" (appčino vlastní kolečko avataru, první položka před
// Chat) appka přesunula sem z Hubovy a Apps hlavičky — appka dřív
// měla dvě nezávislá avatarová tlačítka (Hub.tsx's hub-avatar-btn,
// AppHeader.tsx's app-avatar-btn), teď je jen jedno, vidět na KAŽDÉ
// ze čtyř obrazovek, ne jen na dvou z nich. FlagshipShell.tsx (šest
// vlajkových Roomů) svoje vlastní app-avatar-btn v hlavičce
// schválně ponechává — ty AppBottomNav vůbec nepoužívají, mají
// vlastní šipky mezi Roomy místo téhle lišty, takže appka tam
// duplicitu neřeší.
//
// Vyvýšené prostřední kolečko s hlasovým Buddym (fotka vlka,
// `.app-nav-orb`, rovnou otevíralo BuddyOverlay) appka z týhle lišty
// úplně odstranila — ne přesunula jinam, prostě pryč, uživatel si to
// výslovně nepřál. Appka proto v týhle liště nemá `useBuddyVoice`/
// `BuddyOverlay` vůbec žádné — hlasový Buddy teď jde otevřít JEN
// z Hubova vlastního kruhového menu (paprsek "AI", Hub.tsx's vlastní
// `otevritBuddyho`/`buddyVoice`, nedotčené), ne odkudkoli jinde.
// Appka si tím pádem na Apps/Profilu/Nastavení žádnou cestu k
// hlasovému Buddymu nenechala — jen Hub.
//
// Route-aware: "Home"/"Nastavení" se zvýrazní podle aktuální cesty
// (useLocation), ne natvrdo — dřív bylo "Home" v Hub.tsx vždycky
// aktivní, protože se lišta vykreslovala jen tam; teď musí umět
// zhasnout na každé jiné stránce a naopak vést zpátky na /hub.
//
// `sousedniFn`/`onSipkaKlik` jsou nepovinné — výchozí hodnoty
// (sousedniStranky() + obyčejný navigate()) drží appčino dosavadní
// chování na Hub/Apps/Profil/Nastavení beze změny. FlagshipShell.tsx
// (šipky mezi vlajkovými Roomy) posílá sousedniRoom() (zacyklující
// řadu) a onSipkaKlik volající useModulovyPrechod() (animovaný slide).
//
// Odpovídající vodorovný touch-swipe appka dřív měla (useModulovySwipe.ts,
// dnes smazaný) — uživatel si ho výslovně nepřál mimo carousel Roomů na
// /apps (RoomCarousel.tsx, vlastní pointer-drag mechanismus, nesouvisí
// s tímhle souborem vůbec), takže tyhle šipky teď zůstávají jediným
// gestem/tlačítkem pro sekvenční "předchozí/další" navigaci mezi
// hlavními obrazovkami i mezi Roomy — a jsou schválně vidět jen na
// zařízení s myší (viz níž), ne na dotykové obrazovce.
// ==========================================

interface Props {
  sousedniFn?: (pathname: string) => { predchozi: ModulovaStranka | null; dalsi: ModulovaStranka | null }
  onSipkaKlik?: (cesta: string, smer: 'vpravo' | 'vlevo') => void
}

export const AppBottomNav: React.FC<Props> = ({ sousedniFn, onSipkaKlik }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { profile } = useProfileData()
  // Jen dopředné "→ Social" cesty (Hledat/Chat) dostávají animovaný
  // přechod — stejné omezení jako Hub.tsx's vlastní komentář u
  // prejit(): "Home"/"Nastavení" jsou neutrální/zpětné trasy, CSS má
  // definovaný jen jeden směr pohybu.
  const prejit = useModulovyPrechod()
  const neprectene = useInbox((s) => s.neprectene)

  const jeAktivni = (cesta: string) => location.pathname === cesta

  // Šipky se zobrazují jen na zařízení s myší, přes @media (pointer: fine)
  // v CSS, ne JS detekcí zařízení — stejný vzor jako VirtualniJoystick.tsx
  // (jen obráceně — tady se skrývají NA dotykovém zařízení, joystick se
  // schovává BEZ něj). Appka na dotykové obrazovce žádnou swipe/gesto
  // náhradu za tyhle šipky nemá; Profil zůstává dosažitelný přes svoje
  // vlastní tlačítko přímo v týhle liště (viz "Profil" položka níž).
  // Nezobrazí se na konci seznamu (Hub nemá "předchozí", Nastavení
  // nemá "další").
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
        {/* Profil — appčino vlastní kolečko avataru, přesunuté sem z
            Hubovy a Apps hlavičky (appka tam dřív měla dvě na sobě
            nezávislá tlačítka na to samé místo, teď jen tohle jedno,
            vidět na všech čtyřech obrazovkách). Appka ho navigací řeší
            stejně prostě jako Home/Nastavení níž (obyčejný navigate(),
            ne animovaný prejit() — ten appka drží jen pro dopředné
            cesty do Social, viz appčin komentář u prejit výš), a
            stejnou "aktivní = zvýrazni" logikou, i když na Profilu
            samotném kliknutí logicky nic nedělá (stejné chování, jaké
            Home/Nastavení už mají na svojí vlastní stránce). Zelená
            tečka v rohu avataru neznamená "online" ve smyslu
            presence.ts — appka ji ukazuje vždycky, stejný "appka je
            otevřená právě teď" význam, co měla i na starém místě v
            hlavičce (viz appčin dřívější komentář u .hub-avatar-dot). */}
        <button
          className={`app-nav-item ${jeAktivni('/profil') ? 'app-nav-item--active' : ''}`}
          aria-current={jeAktivni('/profil') ? 'page' : undefined}
          aria-label="Profil"
          onClick={() => {
            if (!jeAktivni('/profil')) navigate('/profil')
          }}
        >
          <span className="app-nav-avatar-wrap">
            <img src={profile.avatar} alt="" className="app-nav-avatar-img" />
            <span className="app-nav-avatar-dot" aria-hidden="true" />
          </span>
          <span>Profil</span>
        </button>

        {/* Chat — appka ho schválně dala hned za Profil, ne až za Home/
            Hledat jako dřív (nové pořadí Profil/Chat/Home/Hledat/
            Nastavení appka si vyžádala sama, ať Home vyjde přesně
            doprostřed pětice teď, co prostřední vyvýšené kolečko
            s Buddym z lišty zmizelo úplně). */}
        <button className="app-nav-item" onClick={() => prejit('/social?zalozka=chaty')}>
          <span className="app-nav-icon-wrap">
            <SocialIcon name="chat" size={20} />
            {neprectene > 0 && <span className="app-nav-dot" aria-hidden="true" />}
          </span>
          <span>Chat</span>
        </button>

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
    </>
  )
}
