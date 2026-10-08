import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DomuPanel } from './components/DomuPanel'
import { VerejnyProfilDialog } from './components/VerejnyProfilDialog'
import { useSocial } from './useSocial'
import { useAmbientScene } from './scene/useAmbientScene'
import { AppBottomNav } from '@/components/AppBottomNav'
import './SocialModule.css'

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
// ne sdílená"), ne nic nového. Ambientní pozadí appka přebírá beze
// změny, appka chce stejnou atmosféru, jakou Domů má uvnitř Socialu
// samotného — vlastní, nezávislá instance scény, appka ji stejně jako
// jinde u useAmbientScene musí jednou postavit a jednou uklidit.
//
// "Napsat" z otevřeného cizího profilu appka tady schválně nerozjíždí
// na ChatView přímo (to by znamenalo zatáhnout sem kus SocialModule's
// vlastní logiky pro otevřený chat) — pošle uživatele na Social's
// Chaty (?zalozka=chaty), kde nově založený/nalezený chat appka už
// najde v seznamu, jen ho rovnou neotevře.
// ==========================================

export const FeedModule: React.FC = () => {
  const navigate = useNavigate()
  const stav = useSocial()
  const [otevrenyProfil, setOtevrenyProfil] = useState<string | null>(null)
  const { containerRef: ambientRef } = useAmbientScene()

  return (
    <div className="social-page">
      <div ref={ambientRef} className="social-ambient" aria-hidden="true" />

      <div className="social-top-bar">
        <button className="social-back-btn" onClick={() => navigate('/hub')}>
          ← Zpět do Hubu
        </button>
        <h1 className="social-title">Feed</h1>
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
