import React, { useEffect, useRef, useState } from 'react'
import { SocialIcon } from './SocialIcon'
import { NahlasitDialog } from './NahlasitDialog'
import { SpravaSkupinyDialog } from './SpravaSkupinyDialog'
import * as api from '../api'
import type { Chat, Zprava } from '../types'
import type { SocialStav } from '../useSocial'
import { requestNotificationPermission } from '@/core/utils/notify'

interface Props {
  chat: Chat
  stav: SocialStav
  onZpet: () => void
}

const cas = (iso: string) =>
  new Date(iso).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })

export const ChatView: React.FC<Props> = ({ chat, stav, onZpet }) => {
  const [zpravy, setZpravy] = useState<Zprava[]>([])
  const [text, setText] = useState('')
  const [posila, setPosila] = useState(false)
  // Ikona odeslání se na chvíli překlopí na fajfku — drobné potvrzení
  // přímo u tlačítka, než zpráva stihne dorazit přes realtime.
  const [odeslano, setOdeslano] = useState(false)
  const [nahlasit, setNahlasit] = useState<{ userId: string; zpravaId?: string } | null>(null)
  const [spravaOtevrena, setSpravaOtevrena] = useState(false)
  const [online, setOnline] = useState<Set<string>>(new Set())
  const [pisouId, setPisouId] = useState<string | null>(null)
  // Jestli má cenu nabízet "Načíst starší" — plná stránka napovídá, že
  // před ní může být ještě víc, kratší stránka znamená konec historie.
  const [maStarsi, setMaStarsi] = useState(false)
  const [nacitaStarsi, setNacitaStarsi] = useState(false)
  const konecRef = useRef<HTMLDivElement>(null)
  const oznamPsaniRef = useRef<(() => void) | null>(null)
  const posledniOznamRef = useRef(0)
  const pisePricasRef = useRef<number | null>(null)
  // Načtení starších zpráv je prepend, ne nová zpráva na konci — bez
  // téhle pojistky by efekt níž po každém "Načíst starší" odskočil
  // pohled zpátky dolů, přesně tam, odkud se uživatel snažil odejít.
  const preskocitScrollRef = useRef(false)

  // Načtení a živý odběr. Odběr se ruší při odchodu — bez toho by po
  // každém otevření chatu zůstal viset další otevřený kanál.
  useEffect(() => {
    let platne = true

    void api.nactiZpravy(chat.id).then((z) => {
      if (!platne) return
      setZpravy(z)
      setMaStarsi(z.length >= api.ZPRAV_NA_STRANKU)
    })
    void api.oznacitPrecteno(chat.id)

    const zrusit = api.sledovatChat(chat.id, (nova) => {
      setZpravy((stare) => {
        // Realtime posílá i změny (smazání), ne jen nové zprávy
        const i = stare.findIndex((z) => z.id === nova.id)
        if (i === -1) return [...stare, nova]

        const kopie = [...stare]
        kopie[i] = nova
        return kopie
      })
      void api.oznacitPrecteno(chat.id)
    })

    return () => {
      platne = false
      zrusit()
      void stav.obnovit()
    }
    // stav.obnovit se mění s identitou účtu, ne s každým vykreslením
  }, [chat.id, stav.obnovit])

  // Kdo je v chatu právě teď a kdo píše — jeden kanál na oboje, viz
  // sledovatPritomnost v api.ts. Bez platného mujId (relace se ještě
  // nenačetla) nemá smysl kanál vůbec zakládat.
  useEffect(() => {
    if (!stav.mujId) return

    const { zrusit, oznamPsani } = api.sledovatPritomnost(
      chat.id,
      stav.mujId,
      (onlineIds) => setOnline(new Set(onlineIds)),
      (kdoId) => {
        setPisouId(kdoId)
        if (pisePricasRef.current) window.clearTimeout(pisePricasRef.current)
        // Zpráva "píše…" sama zmizí, když pár vteřin nepřijde další —
        // žádná zvláštní "přestal jsem psát" událost není potřeba.
        pisePricasRef.current = window.setTimeout(() => setPisouId(null), 3000)
      }
    )
    oznamPsaniRef.current = oznamPsani

    return () => {
      oznamPsaniRef.current = null
      if (pisePricasRef.current) window.clearTimeout(pisePricasRef.current)
      setPisouId(null)
      zrusit()
    }
  }, [chat.id, stav.mujId])

  useEffect(() => {
    if (preskocitScrollRef.current) {
      preskocitScrollRef.current = false
      return
    }
    konecRef.current?.scrollIntoView({ block: 'end' })
  }, [zpravy])

  const nacistStarsi = async () => {
    if (zpravy.length === 0 || nacitaStarsi) return
    setNacitaStarsi(true)

    const starsi = await api.nactiZpravy(chat.id, zpravy[0].createdAt)
    setMaStarsi(starsi.length >= api.ZPRAV_NA_STRANKU)
    if (starsi.length > 0) {
      preskocitScrollRef.current = true
      setZpravy((s) => [...starsi, ...s])
    }
    setNacitaStarsi(false)
  }

  const napovedPsani = (hodnota: string) => {
    setText(hodnota)
    if (!hodnota.trim() || !oznamPsaniRef.current) return

    // Netřeba posílat na každý úder klávesy — jedna zpráva za 2 s stačí,
    // druhá strana si "píše…" drží 3 s od poslední přijaté (viz výš).
    const ted = Date.now()
    if (ted - posledniOznamRef.current < 2000) return
    posledniOznamRef.current = ted
    oznamPsaniRef.current()
  }

  const odeslat = async (e: React.FormEvent) => {
    e.preventDefault()
    if (posila || !text.trim()) return

    // Synchronně, ještě před prvním await — odeslání zprávy je nejjasnější
    // gesto "chci vědět, až mi někdo odepíše", a mimo tenhle gestový
    // řetězec by prohlížeč dialog o svolení odmítl zobrazit (viz Pomodoro/
    // Planer, core/utils/notify.ts).
    requestNotificationPermission()

    setPosila(true)
    const vysledek = await api.poslatZpravu(chat.id, text)
    setPosila(false)

    if (vysledek.ok && vysledek.zprava) {
      setText('')
      setOdeslano(true)
      window.setTimeout(() => setOdeslano(false), 900)
      // Přidáme rovnou vrácenou zprávu, ne přes nactiZpravy(chat.id) bez
      // `pred` — to by po opravě stránkování vrátilo jen nejnovější
      // stránku a zahodilo starší historii, kterou uživatel případně
      // už dřív načetl přes "Načíst starší". Realtime tutéž zprávu
      // stejně doručí znovu (stejné id), sledovatChat ji jen přepíše
      // na místě, žádná duplicita.
      setZpravy((s) => [...s, vysledek.zprava as Zprava])
    } else {
      stav.rekni(vysledek.chyba ?? 'Zpráva neodešla.')
    }
  }

  return (
    <div className="social-chat-view">
      <header className="social-chat-header">
        <button className="social-icon-btn" onClick={onZpet} aria-label="Zpět na chaty">
          <SocialIcon name="arrow-left" size={18} />
        </button>

        <span className="social-chat-title">
          <span className="social-chat-nazev-radek">
            {!chat.jeSkupina && !!chat.ucastnici[0] && online.has(chat.ucastnici[0].id) && (
              <span className="social-online-tecka" aria-label="Je v chatu online" title="Online" />
            )}
            {chat.nazev}
          </span>
          {chat.jeSkupina && (
            <span className="social-chat-pocet">
              {chat.ucastnici.length + 1} lidí
              {online.size > 0 && ` · ${online.size} tu teď`}
            </span>
          )}
        </span>

        {chat.jeSkupina && (
          <button
            className="social-icon-btn"
            aria-label="Spravovat skupinu"
            onClick={() => setSpravaOtevrena(true)}
          >
            <SocialIcon name="settings" size={17} />
          </button>
        )}

        <button
          className="social-icon-btn social-icon-btn--ne"
          aria-label="Opustit chat"
          onClick={async () => {
            // Nevratná akce (vlastní historii chatu tím ztratíš) hned vedle
            // dalších tlačítek v hlavičce — bez potvrzení jedno klepnutí
            // od omylu, stejně jako odebrání člena ze skupiny (viz
            // SpravaSkupinyDialog.tsx).
            const zprava = chat.jeSkupina
              ? `Opustit skupinu „${chat.nazev}“? Přijdeš o její historii.`
              : `Opustit chat s ${chat.nazev}? Přijdeš o jeho historii.`
            if (!window.confirm(zprava)) return

            const ok = await stav.provest(() => api.opustitChat(chat.id), 'Chat opuštěn.')
            if (ok) onZpet()
          }}
        >
          <SocialIcon name="leave" size={17} />
        </button>
      </header>

      <div className="social-zpravy">
        {zpravy.length === 0 && (
          <p className="social-empty-note social-empty-note--stred">
            Zatím tu nikdo nic nenapsal. Začni.
          </p>
        )}

        {maStarsi && (
          <button className="social-btn social-btn--tlumene social-nacist-starsi" onClick={nacistStarsi} disabled={nacitaStarsi}>
            {nacitaStarsi ? 'Načítám…' : 'Načíst starší zprávy'}
          </button>
        )}

        {zpravy.map((z) => {
          const moje = z.odesilatelId === stav.mujId
          const smazana = z.smazanoAt !== null
          const odesilatel = chat.ucastnici.find((u) => u.id === z.odesilatelId)

          return (
            <div key={z.id} className={`social-bublina-obal ${moje ? 'je-moje' : ''}`}>
              {/* Ve skupině je potřeba vědět, kdo píše */}
              {chat.jeSkupina && !moje && (
                <span className="social-bublina-jmeno">
                  {odesilatel?.displayName ?? 'Neznámý'}
                </span>
              )}

              <div className={`social-bublina ${moje ? 'je-moje' : ''} ${smazana ? 'je-smazana' : ''}`}>
                <span className="social-bublina-text">{z.text}</span>
                <span className="social-bublina-cas">{cas(z.createdAt)}</span>
              </div>

              {!smazana && (
                <div className="social-bublina-akce">
                  {moje ? (
                    <button
                      className="social-mini-btn"
                      onClick={async () => {
                        const v = await api.smazatZpravu(z.id)
                        if (v.ok) {
                          // Patchneme tenhle jeden řádek na místě — stejný
                          // důvod jako u odeslání, refetch by mohl zahodit
                          // starší historii načtenou přes "Načíst starší".
                          setZpravy((s) =>
                            s.map((m) =>
                              m.id === z.id
                                ? { ...m, text: 'Zpráva smazána', smazanoAt: new Date().toISOString() }
                                : m
                            )
                          )
                        } else {
                          stav.rekni(v.chyba ?? 'Smazat se nepovedlo.')
                        }
                      }}
                    >
                      <SocialIcon name="trash" size={12} />
                      Smazat
                    </button>
                  ) : (
                    <button
                      className="social-mini-btn"
                      onClick={() => setNahlasit({ userId: z.odesilatelId, zpravaId: z.id })}
                    >
                      <SocialIcon name="flag" size={12} />
                      Nahlásit
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}

        <div ref={konecRef} />
      </div>

      {pisouId && (
        <p className="social-pise-oznam">
          {chat.ucastnici.find((u) => u.id === pisouId)?.displayName ?? 'Někdo'} píše…
        </p>
      )}

      <form className="social-psani" onSubmit={odeslat}>
        <input
          className="social-input social-input--zprava"
          placeholder="Napiš zprávu…"
          value={text}
          maxLength={4000}
          onChange={(e) => napovedPsani(e.target.value)}
          disabled={posila}
        />
        <button
          className={`social-send-btn ${odeslano ? 'je-odeslano' : ''}`}
          type="submit"
          disabled={posila || !text.trim()}
        >
          <SocialIcon name={odeslano ? 'check' : 'send'} size={18} />
        </button>
      </form>

      {nahlasit && (
        <NahlasitDialog
          userId={nahlasit.userId}
          zpravaId={nahlasit.zpravaId}
          stav={stav}
          onZavrit={() => setNahlasit(null)}
        />
      )}

      {spravaOtevrena && (
        <SpravaSkupinyDialog chat={chat} stav={stav} onZavrit={() => setSpravaOtevrena(false)} />
      )}
    </div>
  )
}
