import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SocialIcon } from './components/SocialIcon'
import { PratelePanel } from './components/PratelePanel'
import { ChatyPanel } from './components/ChatyPanel'
import { ChatView } from './components/ChatView'
import { BlokovaniPanel } from './components/BlokovaniPanel'
import { ModeracePanel } from './components/ModeracePanel'
import { TajnyChatPanel } from './components/TajnyChatPanel'
import { TajnyChatView } from './components/TajnyChatView'
import { VerejnyProfilDialog } from './components/VerejnyProfilDialog'
import { useSocial } from './useSocial'
import { useTajnyChat } from './useTajnyChat'
import { nastavOtevrenyChat } from './inbox'
import { useAmbientScene } from './scene/useAmbientScene'
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

type Zalozka = 'pratele' | 'chaty' | 'blokovani' | 'hlaseni' | 'tajne'

const ZALOZKY: { id: Zalozka; popis: string; ikona: string }[] = [
  { id: 'pratele', popis: 'Přátelé', ikona: 'users' },
  { id: 'chaty', popis: 'Chaty', ikona: 'chat' },
  { id: 'blokovani', popis: 'Blokovaní', ikona: 'block' },
  { id: 'hlaseni', popis: 'Hlášení', ikona: 'flag' },
]

export const SocialModule: React.FC = () => {
  const navigate = useNavigate()
  const stav = useSocial()
  const tajnyStav = useTajnyChat()

  const [zalozka, setZalozka] = useState<Zalozka>('pratele')
  const [otevrenyChat, setOtevrenyChat] = useState<string | null>(null)
  const [otevrenyTajnyChat, setOtevrenyTajnyChat] = useState<string | null>(null)
  // Dialog s profilem se otevírá nad čímkoli jiným (seznam, chat) —
  // proto vlastní stav tady nahoře, ne uvnitř panelu/ChatView, odkud
  // se otevřel.
  const [otevrenyProfil, setOtevrenyProfil] = useState<string | null>(null)

  const chat = useMemo(
    () => stav.chaty.find((ch) => ch.id === otevrenyChat) ?? null,
    [stav.chaty, otevrenyChat]
  )

  const tajnyChat = useMemo(
    () => tajnyStav.chaty.find((ch) => ch.id === otevrenyTajnyChat) ?? null,
    [tajnyStav.chaty, otevrenyTajnyChat]
  )

  // Záložky jsou fixní pole nahoře, ale Tajný chat se do něj přidává jen
  // komu to oprávnění vůbec dovolí — kdo ho nemá, o funkci ani neví.
  const zalozky = tajnyStav.smim
    ? [...ZALOZKY, { id: 'tajne' as const, popis: 'Tajný chat', ikona: 'lock' }]
    : ZALOZKY

  // Schránka musí vědět, do kterého chatu se uživatel dívá — zprávy
  // z otevřeného rozhovoru se do počtu nepřečtených počítat nemají.
  useEffect(() => {
    nastavOtevrenyChat(otevrenyChat)
    return () => nastavOtevrenyChat(null)
  }, [otevrenyChat])

  const cekaZadosti = stav.zadosti.filter((z) => z.smer === 'prichozi').length
  const neprectene = stav.chaty.reduce((soucet, ch) => soucet + ch.neprectene, 0)

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
            <div>
              <button className="social-back-btn" onClick={() => navigate('/hub')}>
                ← Zpět do Hubu
              </button>
              <h1 className="social-title">Social</h1>
              <p className="social-subtitle">
                Přátelé, chaty a klid od těch, se kterými si psát nechceš.
              </p>
            </div>
            <span className="social-hero-icon" aria-hidden="true">👥</span>
          </div>

          <div className="social-zalozky">
            {zalozky.map((z) => {
              const odznak =
                z.id === 'pratele'
                  ? cekaZadosti
                  : z.id === 'chaty'
                    ? neprectene
                    : z.id === 'tajne'
                      ? tajnyStav.cekajiciNaMe
                      : 0

              return (
                <button
                  key={z.id}
                  className={`social-zalozka ${zalozka === z.id ? 'is-aktivni' : ''}`}
                  onClick={() => setZalozka(z.id)}
                >
                  <SocialIcon name={z.ikona} size={15} />
                  {z.popis}
                  {odznak > 0 && <span className="social-odznak">{odznak}</span>}
                </button>
              )
            })}
          </div>

          {stav.nacita ? (
            <p className="social-empty-note social-empty-note--stred">Načítám…</p>
          ) : (
            <>
              {zalozka === 'pratele' && (
                <PratelePanel
                  stav={stav}
                  onOtevritChat={setOtevrenyChat}
                  onOtevritProfil={setOtevrenyProfil}
                />
              )}
              {zalozka === 'chaty' && <ChatyPanel stav={stav} onOtevritChat={setOtevrenyChat} />}
              {zalozka === 'blokovani' && <BlokovaniPanel stav={stav} />}
              {zalozka === 'hlaseni' && <ModeracePanel stav={stav} />}
              {zalozka === 'tajne' && tajnyStav.smim && (
                <TajnyChatPanel
                  tajnyStav={tajnyStav}
                  rekni={stav.rekni}
                  onOtevrit={setOtevrenyTajnyChat}
                />
              )}
            </>
          )}

          {stav.hlaska && <div className="social-toast">{stav.hlaska}</div>}
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
