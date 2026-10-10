import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DomuPanel } from './components/DomuPanel'
import { VerejnyProfilDialog } from './components/VerejnyProfilDialog'
import { SocialIcon } from './components/SocialIcon'
import { useSocial } from './useSocial'
import { AppBottomNav } from '@/components/AppBottomNav'
import './SocialModule.css'
import './FeedModule.css'

// Pevná sada hvězd/jisker pro .feed-nebe níž — appka schválně nepočítá
// náhodné pozice v JS (ani Math.random, ani appčin vlastní nahodne()
// seed) pro čistě dekorativní vrstvu bez jakéhokoli testovatelného
// chování — stejná "pevná sada, ne libovolný vstup" zdrženlivost jako
// u Souboj's šesti jisker (fighting/Jiskry.tsx) nebo appčiny vlastní
// barevné palety jinde. Každá položka nese svou pozici a zpoždění
// animace přímo jako inline style — appka tím ušetří 13 dalších CSS
// pravidel jen pro --nth-child posuny.
const HVEZDY: { top: string; left: string; zpozdeniS: number }[] = [
  { top: '8%', left: '12%', zpozdeniS: 0 },
  { top: '14%', left: '72%', zpozdeniS: 0.6 },
  { top: '6%', left: '46%', zpozdeniS: 1.3 },
  { top: '22%', left: '88%', zpozdeniS: 0.3 },
  { top: '18%', left: '28%', zpozdeniS: 1.9 },
  { top: '30%', left: '8%', zpozdeniS: 1.1 },
  { top: '26%', left: '60%', zpozdeniS: 2.4 },
  { top: '34%', left: '94%', zpozdeniS: 0.8 },
  { top: '11%', left: '4%', zpozdeniS: 2.1 },
  { top: '38%', left: '38%', zpozdeniS: 1.6 },
]

const JISKRY: { left: string; zpozdeniS: number }[] = [
  { left: '15%', zpozdeniS: 0 },
  { left: '42%', zpozdeniS: 1.4 },
  { left: '68%', zpozdeniS: 2.8 },
  { left: '85%', zpozdeniS: 0.9 },
  { left: '28%', zpozdeniS: 3.6 },
]

// ==========================================
// Feed — "jen zeď" (jen DomuPanel.tsx, ne celý SocialModule), appčina
// sdílená AppBottomNav od Kroku 19 dál.
//
// Krok 18: appčino kruhové menu na Hubu mělo paprsek "Social", co
// otevíral celý SocialModule (vlastní pětice spodních záložek Profil/
// Chaty/Hub/Domů/Vyhledávač). Appka to přejmenovala na "Feed" a
// přesměrovala sem — Chat a Hledat už appka má přímo v AppBottomNav.tsx
// (dostupné z Hubu/Apps/Profilu/Nastavení), takže jediné, co paprsek
// doopravdy ještě nabízel navíc, byla záložka Domů samotná.
//
// Tenhle modul je proto DomuPanel.tsx (stejná komponenta, co Social's
// vlastní záložka Domů vykresluje) obalený jen tenkou hlavičkou se
// šipkou zpátky na Hub, žádné Chaty/Vyhledávač/Profil tady.
//
// Krok 19: appka si "spodní lišta pro (téměř) celou appku" nechala
// potvrdit po jednotlivých obrazovkách — a pro tuhle padla odpověď
// "Ano, přidat", přímo naproti Kroku 18's "jen zeď" (appka to tak
// zachovává, protiřečí si to jen navenek, ne v tom, co uživatel
// doopravdy odpověděl). AppBottomNav appce teď dává to, co Feed
// samo nikdy nemělo — tlačítko Profil/Chat/Home/Hledat/Nastavení
// přímo odsud, bez návratu na Hub.
//
// `useSocial()` appka volá jako druhou, na SocialModule nezávislou
// instanci stejného hooku — zavedený appčin vzor (viz appčin
// komentář u ProfilSocialniSekce.tsx's "druhá nezávislá instance,
// ne sdílená"), ne nic nového.
//
// "Napsat" z otevřeného cizího profilu appka tady schválně nerozjíždí
// na ChatView přímo (to by znamenalo zatáhnout sem kus SocialModule's
// vlastní logiky pro otevřený chat) — pošle uživatele na Social's
// Chaty (?zalozka=chaty), kde nově založený/nalezený chat appka už
// najde v seznamu, jen ho rovnou neotevře.
//
// Pozadí (FeedModule.css's .feed-bg/.feed-bg-overlay) je appčin
// vlastní obrázek hub-soumrak.png — ten samý, co má Hub.tsx. Appka
// přitom NESAHÁ na .social-page's vlastní pozadí (to je sdílené se
// SocialModule.tsx's Profil/Chaty/Vyhledávač/Nastavení záložkami) —
// tahle vrstva je navíc, vlastní appčiny .feed-* třídy, odstraněné
// z toku (position:fixed), takže appčinu vlastní flex sloupec níž
// neruší.
//
// .feed-nebe (hvězdy + jiskry) NAHRAZUJE appčinu dřívější sdílenou
// useAmbientScene() instanci (tři pomalu plovoucí 3D kolečka, Three.js/
// WebGL) — appka to vyměnila za čistě CSS vrstvu na přímou žádost
// ("ty kolečka běhají furt po pozadí, změníme to na jiný efekt?").
// Appka záměrně NESAHÁ na useAmbientScene.ts samotné (sdílí ho zbytek
// SocialModule.tsx — Profil/Chaty/Vyhledávač/Nastavení záložky), jen
// ho tady, jedině tady, přestala volat — stejné pravidlo 10 ("nejdřív
// ověř dopad na ostatní moduly"), appka proto zvolila cestu, co žádný
// dopad nemá. Dvojitý přínos: appka u Feedu navíc vůbec nenačte/
// nespustí WebGL plátno, jen hrst <span>ů animovaných čistým CSS —
// levnější, ne jen jinak vypadající.
// ==========================================

export const FeedModule: React.FC = () => {
  const navigate = useNavigate()
  const stav = useSocial()
  const [otevrenyProfil, setOtevrenyProfil] = useState<string | null>(null)

  return (
    <div className="social-page">
      <div className="feed-bg" aria-hidden="true" />
      <div className="feed-bg-overlay" aria-hidden="true" />
      <div className="feed-nebe" aria-hidden="true">
        {HVEZDY.map((h, i) => (
          <span
            key={`hvezda-${i}`}
            className="feed-hvezda"
            style={{ top: h.top, left: h.left, animationDelay: `${h.zpozdeniS}s` }}
          />
        ))}
        {JISKRY.map((j, i) => (
          <span
            key={`jiskra-${i}`}
            className="feed-jiskra"
            style={{ left: j.left, animationDelay: `${j.zpozdeniS}s` }}
          />
        ))}
      </div>

      <div className="social-top-bar">
        <button className="social-back-btn" onClick={() => navigate('/hub')}>
          ← Zpět do Hubu
        </button>
        <div className="feed-title-row">
          <span className="feed-title-icon" aria-hidden="true">
            <SocialIcon name="chat" size={20} />
          </span>
          <h1 className="social-title">Feed</h1>
        </div>
      </div>

      {stav.nacita ? (
        <p className="social-empty-note social-empty-note--stred">Načítám…</p>
      ) : (
        <DomuPanel stav={stav} onOtevritProfil={setOtevrenyProfil} />
      )}

      {stav.hlaska && <div className="social-toast">{stav.hlaska}</div>}

      {otevrenyProfil && (
        <VerejnyProfilDialog
          userId={otevrenyProfil}
          stav={stav}
          onOtevritChat={() => navigate('/social?zalozka=chaty')}
          onZavrit={() => setOtevrenyProfil(null)}
        />
      )}

      <AppBottomNav />
    </div>
  )
}

export default FeedModule
