import React, { useEffect, useRef, useState } from 'react'
import { SocialIcon } from './SocialIcon'
import * as api from '../api'
import {
  naimportujVerejnyKlic,
  odsifrujZpravu,
  odvodSdilenyKlic,
  zajistiKlicovyPar,
  zasifrujZpravu,
} from '../tajnyChatCrypto'
import { CASOVACE_TAJNEHO_CHATU } from '../types'
import type { TajnaZprava, TajnyChat } from '../types'

interface Props {
  chat: TajnyChat
  mujId: string | null
  rekni: (text: string) => void
  onZpet: () => void
  /** Po změně časovače je potřeba přenačíst tajnyStav v SocialModule.tsx —
   *  odsud chat přichází jako prop, tenhle komponent si ho sám neumí opravit. */
  onZmenaNastaveni: () => void
}

interface ZobrazenaZprava {
  id: string
  odesilatelId: string
  text: string
  createdAt: string
}

const cas = (iso: string) =>
  new Date(iso).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })

const popisCasovace = (sekund: number): string =>
  CASOVACE_TAJNEHO_CHATU.find((c) => c.sekund === sekund)?.popis ?? `${sekund} s`

type KlicStav = 'nacita' | 'pripraveno' | 'chyba'

// ==========================================
// Rozhovor v tajném chatu.
//
// Vědomě chudší než ChatView.tsx — žádné mazání/nahlašování zpráv, žádná
// přítomnost/psaní, žádné opuštění chatu. Nic z toho pro tenhle rozsah
// nebylo požadované a zprávy tu samy mizí, takže "smazat ručně" řeší jen
// o málo dřív totéž, co udělá čas sám.
//
// Šifrování je celé tady, ne v api.ts (ten jen přenáší cifru/iv, nikdy
// je nerozumí) — na začátku otevření se z api.nactiVerejnyKlic dotáhne
// klíč druhé strany a odvodí se sdílený AES klíč (tajnyChatCrypto.ts),
// kterým se šifruje/dešifruje po zbytek otevřeného rozhovoru.
// ==========================================

export const TajnyChatView: React.FC<Props> = ({ chat, mujId, rekni, onZpet, onZmenaNastaveni }) => {
  const [zpravy, setZpravy] = useState<ZobrazenaZprava[]>([])
  const [klicStav, setKlicStav] = useState<KlicStav>('nacita')
  const [text, setText] = useState('')
  const [posila, setPosila] = useState(false)
  const konecRef = useRef<HTMLDivElement>(null)
  const sdilenyKlicRef = useRef<CryptoKey | null>(null)

  const desifrujNaZobrazeni = async (z: TajnaZprava, klic: CryptoKey): Promise<ZobrazenaZprava> => ({
    id: z.id,
    odesilatelId: z.odesilatelId,
    // null = špatný/chybějící klíč (např. druhá strana mezitím vyměnila
    // zařízení) nebo poškozená data — zobrazí se to jako chyba, appka
    // kvůli tomu nespadne.
    text: (await odsifrujZpravu(klic, z.cifra, z.iv)) ?? '⚠️ Zprávu nejde dešifrovat.',
    createdAt: z.createdAt,
  })

  useEffect(() => {
    let platne = true
    setKlicStav('nacita')
    setZpravy([])
    sdilenyKlicRef.current = null

    void (async () => {
      const { soukromy } = await zajistiKlicovyPar()
      const druhaBase64 = await api.nactiVerejnyKlic(chat.druhy.id)
      if (!platne) return

      if (!druhaBase64) {
        // Druhá strana ještě nikdy neotevřela Tajný chat na svém zařízení
        // (nebo přišla o klíč) — bez jejího veřejného klíče nejde odvodit
        // sdílený klíč vůbec, psát ani číst se nedá.
        setKlicStav('chyba')
        return
      }

      const druhyVerejny = await naimportujVerejnyKlic(druhaBase64)
      const sdileny = await odvodSdilenyKlic(soukromy, druhyVerejny)
      if (!platne) return

      sdilenyKlicRef.current = sdileny
      setKlicStav('pripraveno')

      // Líný úklid při každém otevření — viz komentář u
      // vycistiExpirovaneTajneZpravy v api.ts, chyba se schválně ignoruje.
      void api.vycistiExpirovaneTajneZpravy()

      const surove = await api.nactiTajneZpravy(chat.id)
      if (!platne) return
      const zobrazitelne = await Promise.all(surove.map((z) => desifrujNaZobrazeni(z, sdileny)))
      if (platne) setZpravy(zobrazitelne)
    })()

    const zrusit = api.sledovatTajnyChat(chat.id, (nova) => {
      const klic = sdilenyKlicRef.current
      // Bez klíče (spojení se ještě navazuje) zprávu prostě přeskočíme —
      // dotáhne se při dalším otevření chatu přes nactiTajneZpravy výš.
      if (!klic) return

      void desifrujNaZobrazeni(nova, klic).then((zobrazena) => {
        setZpravy((stare) => (stare.some((z) => z.id === zobrazena.id) ? stare : [...stare, zobrazena]))
      })
    })

    return () => {
      platne = false
      zrusit()
    }
    // Jen id chatu a id protějšku mění klíč — desifrujNaZobrazeni je čistá
    // funkce definovaná pokaždé znovu, jejím zařazením do polí závislostí
    // by se efekt spouštěl na každém vykreslení.
  }, [chat.id, chat.druhy.id])

  useEffect(() => {
    konecRef.current?.scrollIntoView({ block: 'end' })
  }, [zpravy])

  const odeslat = async (e: React.FormEvent) => {
    e.preventDefault()
    const klic = sdilenyKlicRef.current
    const odesilany = text.trim()
    if (posila || !odesilany || !klic) return

    setPosila(true)
    const { cifra, iv } = await zasifrujZpravu(klic, odesilany)
    const v = await api.posliTajnouZpravu(chat.id, cifra, iv)
    setPosila(false)

    if (v.ok && v.zprava) {
      const odeslana = v.zprava
      setText('')
      // Vlastní odeslanou zprávu není potřeba dešifrovat zpátky — text
      // v otevřené podobě už máme, jen ho spárujeme s vráceným id/časem.
      setZpravy((s) =>
        s.some((z) => z.id === odeslana.id)
          ? s
          : [...s, { id: odeslana.id, odesilatelId: odeslana.odesilatelId, text: odesilany, createdAt: odeslana.createdAt }]
      )
    } else {
      // Sem spadne i "Oprávnění na tajný chat mezitím vypršelo." — třeba
      // VIP mezitím vypršelo, nebo "Se zablokovaným účtem nejde psát."
      // Databázová hláška je dost srozumitelná sama o sobě.
      rekni(v.chyba ?? 'Zpráva neodešla.')
    }
  }

  const zmenitCasovac = async (sekund: number) => {
    const v = await api.nastavExpiraciTajnehoChatu(chat.id, sekund)
    if (v.ok) onZmenaNastaveni()
    else rekni(v.chyba ?? 'Nepovedlo se to.')
  }

  return (
    <div className="social-chat-view">
      <header className="social-chat-header">
        <button className="social-icon-btn" onClick={onZpet} aria-label="Zpět na tajné chaty">
          <SocialIcon name="arrow-left" size={18} />
        </button>

        <span className="social-chat-title">
          <span className="social-chat-nazev-radek">
            <SocialIcon name="lock" size={14} />
            {chat.druhy.displayName}
          </span>
        </span>
      </header>

      <div className="social-hint social-hint--tajny">
        <span>Zprávy tady mizí {popisCasovace(chat.expiraceSekund)} po odeslání.</span>
        <select
          className="social-tajny-casovac"
          value={chat.expiraceSekund}
          onChange={(e) => void zmenitCasovac(Number(e.target.value))}
          aria-label="Časovač mizení zpráv"
        >
          {CASOVACE_TAJNEHO_CHATU.map((c) => (
            <option key={c.sekund} value={c.sekund}>
              {c.popis}
            </option>
          ))}
        </select>
      </div>

      <div className="social-zpravy">
        {klicStav === 'nacita' && (
          <p className="social-empty-note social-empty-note--stred">
            Navazuji zabezpečené spojení…
          </p>
        )}

        {klicStav === 'chyba' && (
          <p className="social-empty-note social-empty-note--stred">
            {chat.druhy.displayName} ještě neotevřel/a Tajný chat na svém zařízení — spojení
            nejde navázat. Zkus to znovu, až si Tajný chat otevře.
          </p>
        )}

        {klicStav === 'pripraveno' && zpravy.length === 0 && (
          <p className="social-empty-note social-empty-note--stred">
            Zatím tu nikdo nic nenapsal. Začni.
          </p>
        )}

        {zpravy.map((z) => {
          const moje = z.odesilatelId === mujId

          return (
            <div key={z.id} className={`social-bublina-obal ${moje ? 'je-moje' : ''}`}>
              <div className={`social-bublina ${moje ? 'je-moje' : ''}`}>
                <span className="social-bublina-text">{z.text}</span>
                <span className="social-bublina-cas">{cas(z.createdAt)}</span>
              </div>
            </div>
          )
        })}

        <div ref={konecRef} />
      </div>

      <form className="social-psani" onSubmit={odeslat}>
        <input
          className="social-input social-input--zprava"
          placeholder="Napiš zprávu…"
          value={text}
          maxLength={4000}
          onChange={(e) => setText(e.target.value)}
          disabled={posila || klicStav !== 'pripraveno'}
        />
        <button
          className="social-send-btn"
          type="submit"
          disabled={posila || !text.trim() || klicStav !== 'pripraveno'}
        >
          <SocialIcon name="send" size={18} />
        </button>
      </form>
    </div>
  )
}
