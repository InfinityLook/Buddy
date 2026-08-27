import React, { useEffect, useRef, useState } from 'react'
import { SocialIcon } from './SocialIcon'
import { NahlasitDialog } from './NahlasitDialog'
import { SpravaSkupinyDialog } from './SpravaSkupinyDialog'
import * as api from '../api'
import { EMOJI_REAKCI, type Chat, type Reakce, type Zprava } from '../types'
import type { SocialStav } from '../useSocial'
import { requestNotificationPermission } from '@/core/utils/notify'

interface Props {
  chat: Chat
  stav: SocialStav
  onZpet: () => void
  onOtevritProfil: (userId: string) => void
}

const cas = (iso: string) =>
  new Date(iso).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })

// Krátký náhled do citace nad composerem/uvnitř bubliny — celá zpráva by
// v jednom řádku citace zabrala moc místa.
const zkratit = (text: string, delka = 60): string =>
  text.length > delka ? `${text.slice(0, delka).trimEnd()}…` : text

export const ChatView: React.FC<Props> = ({ chat, stav, onZpet, onOtevritProfil }) => {
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
  // Na koho se právě odpovídá — null = běžná nová zpráva. Zobrazí se
  // jako citace nad composerem, dokud se buď neodešle, nebo nezruší.
  const [odpovidamNa, setOdpovidamNa] = useState<Zprava | null>(null)
  // Reakce celého chatu naráz (viz nactiReakce v api.ts), ne po jedné
  // za zprávu — levnější dotaz a jednodušší živé doručování.
  const [reakce, setReakce] = useState<Reakce[]>([])
  // Id zprávy, u které je zrovna otevřená malá nabídka emoji — jen jedna
  // najednou, druhé klepnutí tu první zavře.
  const [pickerPro, setPickerPro] = useState<string | null>(null)
  // last_read_at ostatních členů — u dvojice z toho ChatView spočítá
  // "Přečteno" pod vlastní poslední zprávou (viz níž).
  const [prectenost, setPrectenost] = useState<Record<string, string>>({})
  // Optimistické zrcadlo chat.mujMuted — přepínač v hlavičce reaguje
  // hned, ne až po dokončení požadavku na server.
  const [ztlumeno, setZtlumeno] = useState(chat.mujMuted)
  const konecRef = useRef<HTMLDivElement>(null)
  const oznamPsaniRef = useRef<(() => void) | null>(null)
  const posledniOznamRef = useRef(0)
  const pisePricasRef = useRef<number | null>(null)
  // Načtení starších zpráv je prepend, ne nová zpráva na konci — bez
  // téhle pojistky by efekt níž po každém "Načíst starší" odskočil
  // pohled zpátky dolů, přesně tam, odkud se uživatel snažil odejít.
  const preskocitScrollRef = useRef(false)

  useEffect(() => setZtlumeno(chat.mujMuted), [chat.mujMuted])

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
    void api.nactiReakce(chat.id).then((r) => platne && setReakce(r))
    void api.nactiPrectenost(chat.id).then((p) => platne && setPrectenost(p))

    const zrusitZpravy = api.sledovatChat(chat.id, (nova) => {
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

    const zrusitReakce = api.sledovatReakce(
      chat.id,
      (r) => setReakce((stare) => (stare.some((s) => s.id === r.id) ? stare : [...stare, r])),
      (id) => setReakce((stare) => stare.filter((r) => r.id !== id))
    )

    const zrusitPrectenost = api.sledovatPrectenost(chat.id, (userId, lastReadAt) =>
      setPrectenost((stare) => ({ ...stare, [userId]: lastReadAt }))
    )

    return () => {
      platne = false
      zrusitZpravy()
      zrusitReakce()
      zrusitPrectenost()
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
    const vysledek = await api.poslatZpravu(chat.id, text, odpovidamNa?.id ?? null)
    setPosila(false)

    if (vysledek.ok && vysledek.zprava) {
      setText('')
      setOdpovidamNa(null)
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

  const prepnoutZtlumeni = async () => {
    const nove = !ztlumeno
    setZtlumeno(nove)
    const v = await api.ztlumitChat(chat.id, nove)
    if (!v.ok) {
      setZtlumeno(!nove)
      stav.rekni(v.chyba ?? 'Ztlumení se nepovedlo.')
    } else {
      // Ať se ChatyPanel.tsx a souhrnný odznak srovnají se serverem
      void stav.obnovit()
    }
  }

  const prepnoutReakci = async (messageId: string, emoji: string) => {
    setPickerPro(null)
    const moje = reakce.find(
      (r) => r.messageId === messageId && r.userId === stav.mujId && r.emoji === emoji
    )

    if (moje) {
      // Optimisticky hned pryč, server jen potvrzuje
      setReakce((s) => s.filter((r) => r.id !== moje.id))
      const v = await api.odebratReakci(messageId, emoji)
      if (!v.ok) setReakce((s) => [...s, moje])
      return
    }

    const v = await api.pridatReakci(messageId, emoji)
    if (v.ok && v.reakce) {
      setReakce((s) => (s.some((r) => r.id === v.reakce!.id) ? s : [...s, v.reakce as Reakce]))
    } else if (!v.ok) {
      stav.rekni(v.chyba ?? 'Reakce se nepovedla.')
    }
  }

  // "Přečteno" dává smysl jen u dvojice — u skupiny by šlo o "přečteno
  // N z M", záměrně (zatím) nepostavené.
  const protejsek = !chat.jeSkupina ? chat.ucastnici[0] : undefined
  const posledniModId = (() => {
    for (let i = zpravy.length - 1; i >= 0; i--) {
      if (zpravy[i].odesilatelId === stav.mujId) return zpravy[i].id
    }
    return null
  })()
  const posledniModCas = posledniModId ? zpravy.find((z) => z.id === posledniModId)?.createdAt : undefined
  const protejsekPrectenoAz = protejsek ? prectenost[protejsek.id] : undefined
  const jePrecteno =
    !!posledniModCas && !!protejsekPrectenoAz && protejsekPrectenoAz >= posledniModCas

  return (
    <div className="social-chat-view">
      <header className="social-chat-header">
        <button className="social-icon-btn" onClick={onZpet} aria-label="Zpět na chaty">
          <SocialIcon name="arrow-left" size={18} />
        </button>

        {/* Skupina nemá jeden profil k zobrazení, jen zůstává statický
            titulek — profil jde otevřít jen u dvojice, kde je jasné, čí. */}
        {!chat.jeSkupina && chat.ucastnici[0] ? (
          <button
            className="social-chat-title social-chat-title--klikatelny"
            onClick={() => onOtevritProfil(chat.ucastnici[0].id)}
          >
            <span className="social-chat-nazev-radek">
              {online.has(chat.ucastnici[0].id) && (
                <span className="social-online-tecka" aria-label="Je v chatu online" title="Online" />
              )}
              {chat.nazev}
            </span>
          </button>
        ) : (
          <span className="social-chat-title">
            <span className="social-chat-nazev-radek">{chat.nazev}</span>
            {chat.jeSkupina && (
              <span className="social-chat-pocet">
                {chat.ucastnici.length + 1} lidí
                {online.size > 0 && ` · ${online.size} tu teď`}
              </span>
            )}
          </span>
        )}

        <button
          className="social-icon-btn"
          aria-label={ztlumeno ? 'Zapnout notifikace' : 'Ztlumit chat'}
          title={ztlumeno ? 'Zapnout notifikace' : 'Ztlumit chat'}
          onClick={prepnoutZtlumeni}
        >
          <SocialIcon name={ztlumeno ? 'bell-off' : 'bell'} size={17} />
        </button>

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
          // Náhled citace se hledá jen v už načtené stránce — u starší,
          // ještě nenačtené zprávy se ukáže obecná náhrada bez textu.
          const puvodni = z.replyToId ? zpravy.find((m) => m.id === z.replyToId) : null

          const reakceZpravy = reakce.filter((r) => r.messageId === z.id)
          const reakceSkupiny = Object.values(
            reakceZpravy.reduce<Record<string, Reakce[]>>((acc, r) => {
              ;(acc[r.emoji] ??= []).push(r)
              return acc
            }, {})
          )

          return (
            <div key={z.id} className={`social-bublina-obal ${moje ? 'je-moje' : ''}`}>
              {/* Ve skupině je potřeba vědět, kdo píše */}
              {chat.jeSkupina && !moje && (
                <span className="social-bublina-jmeno">
                  {odesilatel?.displayName ?? 'Neznámý'}
                </span>
              )}

              <div className={`social-bublina ${moje ? 'je-moje' : ''} ${smazana ? 'je-smazana' : ''}`}>
                {z.replyToId && (
                  <div className="social-bublina-citace">
                    {puvodni && !puvodni.smazanoAt ? (
                      <>
                        <span className="social-bublina-citace-jmeno">
                          {puvodni.odesilatelId === stav.mujId
                            ? 'Ty'
                            : chat.ucastnici.find((u) => u.id === puvodni.odesilatelId)?.displayName ??
                              'Někdo'}
                        </span>
                        <span className="social-bublina-citace-text">{zkratit(puvodni.text)}</span>
                      </>
                    ) : (
                      <span className="social-bublina-citace-text">Odpověď na dřívější zprávu</span>
                    )}
                  </div>
                )}
                <span className="social-bublina-radek">
                  <span className="social-bublina-text">{z.text}</span>
                  <span className="social-bublina-cas">{cas(z.createdAt)}</span>
                </span>
              </div>

              {reakceSkupiny.length > 0 && (
                <div className="social-reakce-pruh">
                  {reakceSkupiny.map((skupina) => {
                    const jeMoje = skupina.some((r) => r.userId === stav.mujId)
                    return (
                      <button
                        key={skupina[0].emoji}
                        className={`social-reakce-pil ${jeMoje ? 'je-moje' : ''}`}
                        onClick={() => prepnoutReakci(z.id, skupina[0].emoji)}
                      >
                        {skupina[0].emoji} {skupina.length}
                      </button>
                    )
                  })}
                </div>
              )}

              {!smazana && (
                <div className="social-bublina-akce">
                  <button
                    className="social-mini-btn"
                    onClick={() => setPickerPro((p) => (p === z.id ? null : z.id))}
                  >
                    <SocialIcon name="smile" size={12} />
                    Reagovat
                  </button>

                  <button className="social-mini-btn" onClick={() => setOdpovidamNa(z)}>
                    <SocialIcon name="reply" size={12} />
                    Odpovědět
                  </button>

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

              {pickerPro === z.id && (
                <div className="social-reakce-picker">
                  {EMOJI_REAKCI.map((emoji) => (
                    <button key={emoji} onClick={() => prepnoutReakci(z.id, emoji)}>
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              {moje && z.id === posledniModId && jePrecteno && (
                <span className="social-precteno">Přečteno</span>
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

      {odpovidamNa && (
        <div className="social-odpoved-lista">
          <span className="social-odpoved-text">
            Odpovídáš na: {zkratit(odpovidamNa.text, 80)}
          </span>
          <button
            className="social-icon-btn"
            aria-label="Zrušit odpověď"
            onClick={() => setOdpovidamNa(null)}
          >
            <SocialIcon name="x" size={14} />
          </button>
        </div>
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
          aria-label="Odeslat"
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
        <SpravaSkupinyDialog
          chat={chat}
          stav={stav}
          onZavrit={() => setSpravaOtevrena(false)}
          onOtevritProfil={onOtevritProfil}
        />
      )}
    </div>
  )
}
