import React, { useEffect, useMemo, useRef, useState } from 'react'
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
import { BuddyHeader } from '@/components/buddy-ui/BuddyHeader'
import { najdiPodleKodu } from './api'
import { AppBottomNav } from '@/components/AppBottomNav'
import { SurfaceBackdrop, useSurfaceAppearance } from '@/features/appearance/SurfaceAppearance'
import './SocialModule.css'
import './Community.css'

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

  const z = searchParams.get('zalozka')
  const zalozka: Zalozka = z === 'chaty' || z === 'vyhledavac' ? z : 'domu'
  const surfaceId = zalozka === 'chaty' ? 'chat-list' : zalozka === 'vyhledavac' ? 'people-search' : 'social-home'
  const { rootAttributes } = useSurfaceAppearance(surfaceId)
  const [otevrenyChat, setOtevrenyChat] = useState<string | null>(null)
  const [otevrenyTajnyChat, setOtevrenyTajnyChat] = useState<string | null>(null)
  // Dialog s profilem se otevírá nad čímkoli jiným (seznam, chat) —
  // proto vlastní stav tady nahoře, ne uvnitř panelu/ChatView, odkud
  // se otevřel.
  const [otevrenyProfil, setOtevrenyProfil] = useState<string | null>(null)
  // #hashtag z klikatelného popisku (HashtagovyText.tsx), ne přímo
  // VyhledavacPanel.tsx's vlastní "dotaz" — appka ho sem dostane přes
  // URL (?hashtag=...), jednou přečte a hned z adresy odstraní, stejný
  // vzor jako ?kod= pár řádků níž.
  const [initHashtag, setInitHashtag] = useState<string | null>(null)

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

  useEffect(() => {
    const hashtag = searchParams.get('hashtag')
    if (!hashtag) return

    setSearchParams((p) => {
      const nove = new URLSearchParams(p)
      nove.delete('hashtag')
      return nove
    }, { replace: true })

    setInitHashtag(hashtag)
  }, [searchParams, setSearchParams])

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

  useEffect(() => {
    const chatId = searchParams.get('chat')
    if (zalozka !== 'chaty' || !chatId || stav.nacita) return

    if (stav.chaty.some(item => item.id === chatId)) {
      setOtevrenyTajnyChat(null)
      setOtevrenyChat(chatId)
    }
    setSearchParams(previous => {
      const next = new URLSearchParams(previous)
      next.delete('chat')
      return next
    }, { replace: true })
  }, [searchParams, setSearchParams, stav.chaty, stav.nacita, zalozka])

  const inConversation = !!(chat || tajnyChat)
  const title = zalozka === 'chaty' ? 'Chaty' : zalozka === 'vyhledavac' ? 'Hledat' : 'Feed'
  const pageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const page = pageRef.current
    const viewport = window.visualViewport
    if (!page || !viewport || !inConversation) return
    const fit = () => {
      if (viewport.scale !== 1) {
        page.style.removeProperty('--community-viewport-height')
        page.style.removeProperty('--community-viewport-top')
        return
      }
      page.style.setProperty('--community-viewport-height', `${viewport.height}px`)
      page.style.setProperty('--community-viewport-top', `${viewport.offsetTop}px`)
    }
    fit()
    viewport.addEventListener('resize', fit)
    viewport.addEventListener('scroll', fit)
    return () => {
      viewport.removeEventListener('resize', fit)
      viewport.removeEventListener('scroll', fit)
      page.style.removeProperty('--community-viewport-height')
      page.style.removeProperty('--community-viewport-top')
    }
  }, [inConversation])

  return (
    <div ref={pageRef} className={`social-page community-page buddy-theme-scope${inConversation ? ' community-page--conversation' : ''}`} {...rootAttributes}>
      {!inConversation && <SurfaceBackdrop surfaceId={surfaceId} />}
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
          {stav.hlaska && <div className="social-toast" role="status">{stav.hlaska}</div>}
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
          {stav.hlaska && <div className="social-toast" role="status">{stav.hlaska}</div>}
        </>
      ) : (
        <>
          <BuddyHeader title={title} icon={zalozka === 'vyhledavac' ? 'search' : undefined}
            backLabel="Zpět do Hubu" onBack={() => navigate('/hub')} />

          {stav.nacita ? (
            <p className="buddy-ui-status" role="status">Načítám…</p>
          ) : (
            <>
              {zalozka === 'domu' ? (
                <DomuPanel surfaceId="social-home" stav={stav} onOtevritProfil={setOtevrenyProfil} />
              ) : (
                <main className="community-scroll">
                  {zalozka === 'chaty' ? (
                    <ChatyPanel stav={stav} tajnyStav={tajnyStav}
                      onOtevritChat={setOtevrenyChat} onOtevritTajnyChat={setOtevrenyTajnyChat} />
                  ) : (
                    <VyhledavacPanel stav={stav} onOtevritProfil={setOtevrenyProfil} initHashtag={initHashtag} />
                  )}
                </main>
              )}
            </>
          )}

          {stav.hlaska && <div className="social-toast" role="status">{stav.hlaska}</div>}

          {/* Krok 19: appčina sdílená spodní lišta — jen tady, ne
              v otevřeném chatu/tajném chatu výš, ten zůstává
              celoobrazovkovou, nerušenou obrazovkou stejně jako dřív. */}
          <AppBottomNav placement="edge" />
        </>
      )}

      {otevrenyProfil && (
        <VerejnyProfilDialog
          userId={otevrenyProfil}
          callerId={chat ? 'chat-conversation' : zalozka === 'vyhledavac' ? 'people-search' : 'social-home'}
          stav={stav}
          onOtevritChat={setOtevrenyChat}
          onZavrit={() => setOtevrenyProfil(null)}
        />
      )}
    </div>
  )
}

export default SocialModule
