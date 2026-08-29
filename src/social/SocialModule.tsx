import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { SocialIcon } from './components/SocialIcon'
import { DomuPanel } from './components/DomuPanel'
import { ChatyPanel } from './components/ChatyPanel'
import { ChatView } from './components/ChatView'
import { VyhledavacPanel } from './components/VyhledavacPanel'
import { NastaveniPanel } from './components/NastaveniPanel'
import { TajnyChatView } from './components/TajnyChatView'
import { VerejnyProfilDialog } from './components/VerejnyProfilDialog'
import { useSocial } from './useSocial'
import { useTajnyChat, nastavOtevrenyTajnyChat } from './useTajnyChat'
import { nastavOtevrenyChat } from './inbox'
import { useAmbientScene } from './scene/useAmbientScene'
import { najdiPodleKodu } from './api'
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

type Zalozka = 'chaty' | 'domu' | 'vyhledavac' | 'nastaveni'

// Fáze 2 rozvržení: čtyři pevné položky pro úplně každého, ne pět/šest
// podle role. Hledání nových lidí (dřív karta nad seznamem přátel
// v Profilu) má vlastní záložku Vyhledávač — stejný mentální model,
// jaký zná Instagram/TikTok. Blokovaní, Hlášení a (komu to oprávnění
// dovolí) Tajný chat se přesunuly do Nastavení jako menu, přesně jako
// AdminModule.tsx — spodní lišta se tak VIP/moderátorům/adminům
// neroztahuje o další ikonu navíc, viz NastaveniPanel.tsx.
//
// "Profil" mezitím přestala být záložka Social — appka má jen jeden
// skutečný profil (pages/profil/ProfilModule.tsx) a mít jeho kopii i
// tady bylo matoucí (dvě různé "moje" obrazovky se jménem, avatarem
// a úrovní, ne vždy stejně aktuální). Tlačítko na jejím místě proto
// vede rovnou tam (viz spodní navigace níž), Social's vlastní seznam
// přátel a sdílení kódu se přestěhovaly do ProfilModule.tsx (lazy
// ProfilSocialniSekce.tsx — Social API nesmí zatížit appčin hlavní balíček).
// Uvolněné místo uprostřed lišty zabrala nová "Domů" (DomuPanel.tsx) —
// zatím jen story pruh, zbytek se doplní v pozdější fázi.
const ZALOZKY: { id: Zalozka; popis: string; ikona: string }[] = [
  { id: 'chaty', popis: 'Chaty', ikona: 'chat' },
  { id: 'domu', popis: 'Domů', ikona: 'home' },
  { id: 'vyhledavac', popis: 'Vyhledávač', ikona: 'search' },
  { id: 'nastaveni', popis: 'Nastavení', ikona: 'settings' },
]

export const SocialModule: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const stav = useSocial()
  const tajnyStav = useTajnyChat()

  const [zalozka, setZalozka] = useState<Zalozka>('domu')
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

  const cekaZadosti = stav.zadosti.filter((z) => z.smer === 'prichozi').length
  // Ztlumené chaty se do souhrnného odznaku na záložce nepočítají —
  // stejné vynechání jako u globální schránky v inbox.ts, jinak by
  // ztlumení chatu na tomhle číslo nemělo vůbec žádný efekt.
  const neprectene = stav.chaty
    .filter((ch) => !ch.mujMuted)
    .reduce((soucet, ch) => soucet + ch.neprectene, 0)

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
              {zalozka === 'chaty' && <ChatyPanel stav={stav} onOtevritChat={setOtevrenyChat} />}
              {zalozka === 'domu' && <DomuPanel stav={stav} onOtevritProfil={setOtevrenyProfil} />}
              {zalozka === 'vyhledavac' && (
                <VyhledavacPanel stav={stav} onOtevritProfil={setOtevrenyProfil} />
              )}
              {zalozka === 'nastaveni' && (
                <NastaveniPanel
                  stav={stav}
                  tajnyStav={tajnyStav}
                  onOtevritTajnyChat={setOtevrenyTajnyChat}
                />
              )}
            </>
          )}

          {stav.hlaska && <div className="social-toast">{stav.hlaska}</div>}

          {/* Spodní navigace, ne horní záložky — Instagram/TikTok vzor,
              viz komentář v SocialModule.css. Poslední prvek v .social-page's
              flex sloupci, margin-top: auto ho posune ke dnu i s krátkým
              obsahem, position: sticky ho tam udrží i při delším scrollu. */}
          <div className="social-bottom-nav">
            {/* Ne záložka jako zbytek lišty — opouští Social úplně
                a jde na appčin skutečný profil (pages/profil/ProfilModule.tsx),
                viz komentář u Zalozka výš. Zůstává na svém původním
                místě vlevo, jen mění, co se stane po klepnutí. */}
            <button className="social-nav-item" onClick={() => navigate('/profil')}>
              <span className="social-nav-icon-wrap">
                <SocialIcon name="user" size={21} />
              </span>
              Profil
            </button>

            {ZALOZKY.map((z) => {
              const odznak =
                z.id === 'vyhledavac'
                  ? cekaZadosti
                  : z.id === 'chaty'
                    ? neprectene
                    : z.id === 'nastaveni'
                      ? tajnyStav.cekajiciNaMe
                      : 0

              return (
                <button
                  key={z.id}
                  className={`social-nav-item ${zalozka === z.id ? 'is-aktivni' : ''}`}
                  onClick={() => setZalozka(z.id)}
                >
                  <span className="social-nav-icon-wrap">
                    <SocialIcon name={z.ikona} size={21} />
                    {odznak > 0 && <span className="social-nav-odznak">{odznak}</span>}
                  </span>
                  {z.popis}
                </button>
              )
            })}
          </div>
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
