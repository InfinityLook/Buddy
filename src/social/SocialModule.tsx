import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { DomuPanel } from './components/DomuPanel'
import { ChatyPanel } from './components/ChatyPanel'
import { ChatView } from './components/ChatView'
import { VyhledavacPanel } from './components/VyhledavacPanel'
import { TajnyChatView } from './components/TajnyChatView'
import { VerejnyProfilDialog } from './components/VerejnyProfilDialog'
import { useSocial } from './useSocial'
import { useTajnyChat, nastavOtevrenyTajnyChat } from './useTajnyChat'
import { nastavOtevrenyChat } from './inbox'
import { useAmbientScene } from './scene/useAmbientScene'
import { najdiPodleKodu } from './api'
import { AppBottomNav } from '@/components/AppBottomNav'
import './SocialModule.css'

// ==========================================
// Social — přátelé, chaty a blokování.
//
// Vlastní bránu pro nepřihlášené tenhle modul nemá a mít nemá: do celé
// aplikace se bez účtu nedostane nikdo, hlídá to App.tsx u všech rout.
// Druhá kontrola tady by jen říkala totéž na dvou místech a při změně
// pravidel by se s tou první rozešla.
//
// Poslední slovo má stejně databáze — pravidly odmítne psát, zakládat
// chaty i posílat žádosti komukoli bez skutečného účtu.
// ==========================================

type Zalozka = 'chaty' | 'domu' | 'vyhledavac'

// Tři vnitřní záložky obrazovky — Chaty/Domů/Vyhledávač. Blokovaní a
// Hlášení, dřív vlastní čtvrtá záložka "Nastavení" (menu dvou řádků,
// NastaveniPanel.tsx), se přestěhovaly do appčina skutečného /nastaveni
// jako karta "Sociální nastavení" (SettingsModule.tsx, lazy
// SocialniNastaveniSekce.tsx). Tajný chat žije pod "+ Nový" v
// ChatyPanel.tsx.
//
// "Profil" dávno přestala být záložka Social — appka má jen jeden
// skutečný profil (pages/profil/ProfilModule.tsx), Social's vlastní
// seznam přátel a sdílení kódu se přestěhovaly do ProfilModule.tsx
// (lazy ProfilSocialniSekce.tsx).
//
// Krok 19: appka si "spodní lišta pro (téměř) celou appku" nechala
// potvrdit po jednotlivých obrazovkách — pro Social padla odpověď
// "Ano, nahradit Socialovu vlastní lištu sdílenou AppBottomNav".
// Socialova dřívější vlastní pětice tlačítek (Profil/Chaty/Hub/Domů/
// Vyhledávač) je proto pryč, nahrazená appčinou sdílenou
// <AppBottomNav /> (Profil/Chat/Home/Hledat/Nastavení) — Chat a Hledat
// na ní vedou přes URL (?zalozka=chaty / ?zalozka=vyhledavac, viz
// useEffect níž), ne přímým přepnutím stavu tady.
//
// Dvě věci se tím vědomě ztrácí, appka to tak schvaluje, ne že by si
// toho nevšimla: (1) sdílená lišta nemá tlačítko "Domů" vůbec žádné —
// jednou opuštěná domovská záložka Social se odsud zpátky nedá otevřít
// jinak než novým načtením /social (bez ?zalozka v adrese) nebo
// tlačítkem zpět v historii prohlížeče; (2) odznak na "Vyhledávač" pro
// čekající žádosti o přátelství (cekaZadosti) a přičtení
// tajnyStav.cekajiciNaMe k odznaku na "Chat" appka neměla kam
// přenést — appčina sdílená lišta počítá jen appčinu obecnou
// schránku (inbox.ts), ne tyhle dvě Socialu vlastní čísla.

export const SocialModule: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const stav = useSocial()
  const tajnyStav = useTajnyChat()

  // Výchozí záložka jde přebít parametrem v URL (?zalozka=chaty) — stejný
  // vzor jako AppModule.tsx's ?kategorie=. Inicializátor tu je, aby
  // první vykreslení hned ukázalo správnou záložku bez jednoho rámečku
  // bliknutí na "domu" — živou reaktivitu na pozdější změny parametru
  // (Krok 19: appčina sdílená AppBottomNav teď na tenhle parametr
  // vede) řeší samostatný useEffect níž.
  const [zalozka, setZalozka] = useState<Zalozka>(() => {
    const z = searchParams.get('zalozka')
    return z === 'chaty' || z === 'vyhledavac' ? z : 'domu'
  })
  const [otevrenyChat, setOtevrenyChat] = useState<string | null>(null)
  const [otevrenyTajnyChat, setOtevrenyTajnyChat] = useState<string | null>(null)
  // Dialog s profilem se otevírá nad čímkoli jiným (seznam, chat) —
  // proto vlastní stav tady nahoře, ne uvnitř panelu/ChatView, odkud
  // se otevřel.
  const [otevrenyProfil, setOtevrenyProfil] = useState<string | null>(null)

  // Sdílený odkaz na profil (?kod=..., viz shareLink.ts) — jednorázově
  // při načtení, stejný vzor jako AppModule.tsx's ?kategorie= seed.
  // Parametr se z URL zase odstraní, ať znovunačtení stránky nebo
  // návrat přes historii prohlížeče neotevře profil podruhé.
  useEffect(() => {
    const kod = searchParams.get('kod')
    if (!kod) return

    setSearchParams((p) => {
      const nove = new URLSearchParams(p)
      nove.delete('kod')
      return nove
    }, { replace: true })

    void najdiPodleKodu(kod).then((nalez) => {
      if (nalez.stav === 'nalezen') setOtevrenyProfil(nalez.profil.id)
      else if (nalez.stav === 'vlastni') stav.rekni('To je tvůj vlastní kód.')
      else stav.rekni(nalez.stav === 'chyba' ? nalez.chyba ?? 'Nepovedlo se to.' : 'Takový odkaz už neplatí.')
    })
    // stav.rekni je z useCallback s prázdným polem závislostí (useSocial.ts),
    // takže je mezi vykresleními stabilní a nepatří do závislostí tady.
  }, [searchParams, stav.rekni])

  const chat = useMemo(
    () => stav.chaty.find((ch) => ch.id === otevrenyChat) ?? null,
    [stav.chaty, otevrenyChat]
  )

  const tajnyChat = useMemo(
    () => tajnyStav.chaty.find((ch) => ch.id === otevrenyTajnyChat) ?? null,
    [tajnyStav.chaty, otevrenyTajnyChat]
  )

  // Schránka musí vědět, do kterého chatu se uživatel dívá — zprávy
  // z otevřeného rozhovoru se do počtu nepřečtených počítat nemají.
  useEffect(() => {
    nastavOtevrenyChat(otevrenyChat)
    return () => nastavOtevrenyChat(null)
  }, [otevrenyChat])

  // Totéž pro tajný chat — jinak by notifikace přišla i na zprávu
  // z rozhovoru, který má uživatel zrovna otevřený (viz useTajnyChat.ts).
  useEffect(() => {
    nastavOtevrenyTajnyChat(otevrenyTajnyChat)
    return () => nastavOtevrenyTajnyChat(null)
  }, [otevrenyTajnyChat])

  // Krok 19: appčina sdílená <AppBottomNav /> vede Chat/Hledat přes URL
  // (?zalozka=chaty / ?zalozka=vyhledavac), ne přes přímé setZalozka()
  // volání jako dřív vlastní lišta. Navigace z /social na
  // /social?zalozka=... zůstává na stejné routě — React Router tuhle
  // komponentu znovu nezamountuje, takže inicializátor useState výš
  // (čte se jen jednou při mountu) by si novou hodnotu parametru
  // nevšiml. Tenhle efekt doplňuje tu chybějící reaktivitu; chybějící
  // nebo neplatný parametr appka čte stejně jako ten inicializátor —
  // jako "domu" (pokrývá i návrat na obyčejné /social přes tlačítko
  // zpět v historii prohlížeče).
  useEffect(() => {
    const z = searchParams.get('zalozka')
    setZalozka(z === 'chaty' || z === 'vyhledavac' ? z : 'domu')
  }, [searchParams])

  // Ambientní pozadí žije mimo React a musí se postavit přesně jednou —
  // proto containerRef nesmí zmizet z DOMu, ať uživatel otevře chat,
  // nebo ne. Řešit to podmíněným vykreslením celého <div ref> by ho při
  // zavření chatu osiřelo (canvas zůstane přilepený ke starému uzlu,
  // nový prázdný div by scénu nikdy nedostal). Container je proto
  // pořád v DOMu; jen ve chatu se schová přes CSS, ať nesoutěží
  // s čtením zpráv, ale běžet klidně může dál.
  const { containerRef: ambientRef } = useAmbientScene()

  return (
    <div className="social-page">
      <div
        ref={ambientRef}
        className={`social-ambient ${chat || tajnyChat ? 'je-skryty' : ''}`}
        aria-hidden="true"
      />

      {chat ? (
        // Otevřený chat zabírá celou obrazovku — na telefonu není kam
        // dát seznam i rozhovor vedle sebe.
        <>
          <ChatView
            chat={chat}
            stav={stav}
            onZpet={() => setOtevrenyChat(null)}
            onOtevritProfil={setOtevrenyProfil}
          />
          {stav.hlaska && <div className="social-toast">{stav.hlaska}</div>}
        </>
      ) : tajnyChat ? (
        <>
          <TajnyChatView
            chat={tajnyChat}
            mujId={stav.mujId}
            rekni={stav.rekni}
            onZpet={() => setOtevrenyTajnyChat(null)}
            onZmenaNastaveni={tajnyStav.obnovit}
          />
          {stav.hlaska && <div className="social-toast">{stav.hlaska}</div>}
        </>
      ) : (
        <>
          <div className="social-top-bar">
            <button className="social-back-btn" onClick={() => navigate('/hub')}>
              ← Zpět do Hubu
            </button>
            <h1 className="social-title">Social</h1>
          </div>

          {stav.nacita ? (
            <p className="social-empty-note social-empty-note--stred">Načítám…</p>
          ) : (
            <>
              {zalozka === 'chaty' && (
                <ChatyPanel
                  stav={stav}
                  tajnyStav={tajnyStav}
                  onOtevritChat={setOtevrenyChat}
                  onOtevritTajnyChat={setOtevrenyTajnyChat}
                />
              )}
              {zalozka === 'domu' && <DomuPanel stav={stav} onOtevritProfil={setOtevrenyProfil} />}
              {zalozka === 'vyhledavac' && (
                <VyhledavacPanel stav={stav} onOtevritProfil={setOtevrenyProfil} />
              )}
            </>
          )}

          {stav.hlaska && <div className="social-toast">{stav.hlaska}</div>}

          {/* Krok 19: appčina sdílená spodní lišta — jen tady, ne
              v otevřeném chatu/tajném chatu výš, ten zůstává
              celoobrazovkovou, nerušenou obrazovkou stejně jako dřív. */}
          <AppBottomNav />
        </>
      )}

      {otevrenyProfil && (
        <VerejnyProfilDialog
          userId={otevrenyProfil}
          stav={stav}
          onOtevritChat={setOtevrenyChat}
          onZavrit={() => setOtevrenyProfil(null)}
        />
      )}
    </div>
  )
}

export default SocialModule
