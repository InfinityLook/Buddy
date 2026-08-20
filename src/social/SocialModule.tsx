import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SocialIcon } from './components/SocialIcon'
import { PratelePanel } from './components/PratelePanel'
import { ChatyPanel } from './components/ChatyPanel'
import { ChatView } from './components/ChatView'
import { BlokovaniPanel } from './components/BlokovaniPanel'
import { useSocial } from './useSocial'
import { isSupabaseConfigured } from '@/core/supabase/client'
import './SocialModule.css'

// ==========================================
// Social — přátelé, chaty a blokování.
//
// Na rozdíl od zbytku aplikace tohle bez účtu nejde. Není to omezení
// vymyšlené v UI: databáze pravidlem odmítne psát, zakládat chaty
// i posílat žádosti komukoli, kdo nemá skutečný účet. Anonymní identita,
// kterou si aplikace zakládá sama kvůli zálohování XP, vzniká na každém
// zařízení bez jakéhokoli ověření — psát z ní ostatním by neneslo
// žádnou stopu.
// ==========================================

type Zalozka = 'pratele' | 'chaty' | 'blokovani'

const ZALOZKY: { id: Zalozka; popis: string; ikona: string }[] = [
  { id: 'pratele', popis: 'Přátelé', ikona: 'users' },
  { id: 'chaty', popis: 'Chaty', ikona: 'chat' },
  { id: 'blokovani', popis: 'Blokovaní', ikona: 'block' },
]

export const SocialModule: React.FC = () => {
  const navigate = useNavigate()
  const stav = useSocial()

  const [zalozka, setZalozka] = useState<Zalozka>('pratele')
  const [otevrenyChat, setOtevrenyChat] = useState<string | null>(null)

  const chat = useMemo(
    () => stav.chaty.find((ch) => ch.id === otevrenyChat) ?? null,
    [stav.chaty, otevrenyChat]
  )

  const cekaZadosti = stav.zadosti.filter((z) => z.smer === 'prichozi').length
  const neprectene = stav.chaty.reduce((soucet, ch) => soucet + ch.neprectene, 0)

  // Otevřený chat zabírá celou obrazovku — na telefonu není kam dát
  // seznam i rozhovor vedle sebe.
  if (chat) {
    return (
      <div className="social-page">
        <ChatView chat={chat} stav={stav} onZpet={() => setOtevrenyChat(null)} />
        {stav.hlaska && <div className="social-toast">{stav.hlaska}</div>}
      </div>
    )
  }

  return (
    <div className="social-page">
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

      {!stav.maUcet ? (
        <section className="social-brana">
          <span className="social-brana-icon" aria-hidden="true">🔐</span>
          <h2 className="social-brana-title">Social potřebuje účet</h2>

          <p className="social-brana-text">
            {isSupabaseConfigured
              ? 'Zbytek aplikace funguje i bez něj — účet je potřeba jen tady, aby bylo jasné, kdo komu píše.'
              : 'V téhle verzi nejsou účty nastavené, takže Social zatím nefunguje.'}
          </p>

          {isSupabaseConfigured && (
            <>
              <p className="social-brana-text social-brana-text--tlumene">
                Když si účet založíš, XP ani odznaky neztratíš — přenesou se
                do něj.
              </p>
              <button className="social-btn social-btn--full" onClick={() => navigate('/')}>
                Přihlásit se nebo se zaregistrovat
              </button>
            </>
          )}
        </section>
      ) : (
        <>
          <div className="social-zalozky">
            {ZALOZKY.map((z) => {
              const odznak =
                z.id === 'pratele' ? cekaZadosti : z.id === 'chaty' ? neprectene : 0

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
                <PratelePanel stav={stav} onOtevritChat={setOtevrenyChat} />
              )}
              {zalozka === 'chaty' && (
                <ChatyPanel stav={stav} onOtevritChat={setOtevrenyChat} />
              )}
              {zalozka === 'blokovani' && <BlokovaniPanel stav={stav} />}
            </>
          )}
        </>
      )}

      {stav.hlaska && <div className="social-toast">{stav.hlaska}</div>}
    </div>
  )
}

export default SocialModule
