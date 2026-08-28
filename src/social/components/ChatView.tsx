import React, { useEffect, useRef, useState } from 'react'
import { SocialIcon } from './SocialIcon'
import { NahlasitDialog } from './NahlasitDialog'
import { SpravaSkupinyDialog } from './SpravaSkupinyDialog'
import * as api from '../api'
import { EMOJI_REAKCI, VYCHOZI_POPISEK_MEDIA, type Chat, type Reakce, type Zprava } from '../types'
import type { SocialStav } from '../useSocial'
import { requestNotificationPermission } from '@/core/utils/notify'

// Podepsaný odkaz na fotku/video se vyžaduje jednou za bublinu, ne při
// každém vykreslení — vlastní malá komponenta místo inline logiky přímo
// v mapě zpráv, ať se hook (useEffect) drží u jedné konkrétní zprávy.
const ZpravaMedium: React.FC<{ path: string; typ: 'image' | 'video' }> = ({ path, typ }) => {
  const [url, setUrl] = useState<string | null>(null)
  const [selhalo, setSelhalo] = useState(false)

  useEffect(() => {
    let platne = true
    setUrl(null)
    setSelhalo(false)
    void api.ziskejUrlMedia(path).then((u) => {
      if (!platne) return
      if (u) setUrl(u)
      else setSelhalo(true)
    })
    return () => {
      platne = false
    }
  }, [path])

  if (selhalo) return <p className="social-media-chyba">Médium se nepodařilo načíst.</p>
  if (!url) return <div className="social-media-nacita" aria-hidden="true" />

  return typ === 'video' ? (
    <video className="social-bublina-media" src={url} controls playsInline />
  ) : (
    <img className="social-bublina-media" src={url} alt="" />
  )
}

// Feature-detekce jednou při načtení modulu, ne při každém vykreslení —
// prostředí se za běhu nemění. Bez MediaRecorder appka mic tlačítko
// vůbec nenabídne (viz JSX composeru níž), stejný "radši schovej, než
// nabídni něco nefunkčního" přístup jako u BuddyOverlay.tsx.
const PODPORUJE_NAHRAVANI_HLASU =
  typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia

// mm:ss — hlasovky appka nedrží dost dlouhé na to, aby se hodily hodiny.
const formatDelku = (s: number): string => {
  const cele = Math.max(0, Math.round(s))
  return `${Math.floor(cele / 60)}:${String(cele % 60).padStart(2, '0')}`
}

// Vlastní přehrávač místo <video controls> u obrázku/videa výš —
// hlasovka je jen zvuk, prohlížečův výchozí <audio controls> na malé
// šířce bubliny nevejde a vypadá cize proti zbytku appky. Skutečný
// <audio> element zůstává v DOMu jen jako zdroj přehrávání, appka mu
// nikdy neukazuje jeho vlastní ovládací prvky.
const ZpravaHlasovka: React.FC<{ path: string }> = ({ path }) => {
  const [url, setUrl] = useState<string | null>(null)
  const [selhalo, setSelhalo] = useState(false)
  const [hraje, setHraje] = useState(false)
  const [delka, setDelka] = useState(0)
  const [pozice, setPozice] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    let platne = true
    setUrl(null)
    setSelhalo(false)
    void api.ziskejUrlMedia(path).then((u) => {
      if (!platne) return
      if (u) setUrl(u)
      else setSelhalo(true)
    })
    return () => {
      platne = false
    }
  }, [path])

  if (selhalo) return <p className="social-media-chyba">Hlasovku se nepodařilo načíst.</p>
  if (!url) return <div className="social-media-nacita social-media-nacita--hlas" aria-hidden="true" />

  return (
    <div className="social-hlasovka">
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onLoadedMetadata={(e) => setDelka(e.currentTarget.duration || 0)}
        onTimeUpdate={(e) => setPozice(e.currentTarget.currentTime)}
        onEnded={() => {
          setHraje(false)
          setPozice(0)
        }}
      />
      <button
        type="button"
        className="social-hlasovka-prehrat"
        aria-label={hraje ? 'Pozastavit' : 'Přehrát hlasovku'}
        onClick={() => {
          if (!audioRef.current) return
          if (hraje) audioRef.current.pause()
          else void audioRef.current.play()
          setHraje(!hraje)
        }}
      >
        <SocialIcon name={hraje ? 'pause' : 'play'} size={15} />
      </button>
      <div className="social-hlasovka-pruh">
        <div
          className="social-hlasovka-vyplneni"
          style={{ width: `${delka > 0 ? (pozice / delka) * 100 : 0}%` }}
        />
      </div>
      <span className="social-hlasovka-cas">{formatDelku(hraje || pozice > 0 ? pozice : delka)}</span>
    </div>
  )
}

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
  // Nahrávání média blokuje jen tlačítko sponky, ne celý composer —
  // text jde psát dál, i když se zrovna nahrává fotka z minulého klepnutí.
  const [nahravaMedium, setNahravaMedium] = useState(false)
  const souborInputRef = useRef<HTMLInputElement>(null)
  // Nahrávání hlasovky — na rozdíl od nahravaMedium výš (jedno klepnutí,
  // pozadí) tohle je stavový stroj (nic → nahrávám → poslat/zrušit)
  // s viditelnou hodinkou, proto vlastní composer řádek, ne jen ikona.
  const [nahravaHlas, setNahravaHlas] = useState(false)
  const [hlasovyCasS, setHlasovyCasS] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const zvukChunkyRef = useRef<Blob[]>([])
  const zvukStreamRef = useRef<MediaStream | null>(null)
  const hlasovyIntervalRef = useRef<number | null>(null)
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

  // Sponka: vybraný soubor se nejdřív nahraje do Storage (nahratChatMedium),
  // teprve pak vznikne samotná zpráva s odkazem na něj — stejné pořadí
  // jako u avatara/banneru, jen tady výsledkem není sloupec v profiles,
  // ale nová řádka v messages. Text v composeru (pokud nějaký je) jde
  // jako popisek spolu s médiem, ne jako samostatná druhá zpráva.
  const poslatMedium = async (soubor: File) => {
    requestNotificationPermission()
    setNahravaMedium(true)

    const medium = await api.nahratChatMedium(chat.id, soubor)
    if (!medium) {
      setNahravaMedium(false)
      stav.rekni('Soubor se nepovedlo nahrát — zkontroluj typ a velikost (max 25 MB).')
      return
    }

    const vysledek = await api.poslatZpravu(chat.id, text, odpovidamNa?.id ?? null, medium)
    setNahravaMedium(false)

    if (vysledek.ok && vysledek.zprava) {
      setText('')
      setOdpovidamNa(null)
      setZpravy((s) => [...s, vysledek.zprava as Zprava])
    } else {
      stav.rekni(vysledek.chyba ?? 'Zpráva neodešla.')
    }
  }

  // Mikrofon: klepnutí na "mic" spustí nahrávání (nahrazuje odesílací
  // tlačítko, dokud je composer prázdný — viz JSX níž), druhé klepnutí
  // ho ukončí a buď pošle, nebo zahodí. Feature-detekce jako u
  // BuddyOverlay.tsx/SkenovatKodDialog.tsx — appka radši tlačítko
  // schová (viz JSX), než aby nabídla něco, co stejně selže.
  const zacitNahravaniHlasu = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      zvukStreamRef.current = stream

      const typ = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((t) =>
        MediaRecorder.isTypeSupported(t)
      )
      const recorder = new MediaRecorder(stream, typ ? { mimeType: typ } : undefined)
      zvukChunkyRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) zvukChunkyRef.current.push(e.data)
      }
      mediaRecorderRef.current = recorder
      recorder.start()

      setNahravaHlas(true)
      setHlasovyCasS(0)
      hlasovyIntervalRef.current = window.setInterval(() => setHlasovyCasS((s) => s + 1), 1000)
    } catch {
      stav.rekni('Přístup k mikrofonu se nepovedlo získat.')
    }
  }

  // Uklidí mikrofon/časovač vždycky, poslání je jen volitelný krok navíc
  // uvnitř — stejná struktura jako "Zkusit znovu" na jiných místech appky,
  // kde úklid nesmí záviset na tom, jak akce dopadla.
  const ukoncitNahravaniHlasu = (poslatZaznam: boolean) => {
    const recorder = mediaRecorderRef.current
    if (!recorder) return

    if (hlasovyIntervalRef.current) window.clearInterval(hlasovyIntervalRef.current)
    hlasovyIntervalRef.current = null

    recorder.onstop = () => {
      zvukStreamRef.current?.getTracks().forEach((t) => t.stop())
      zvukStreamRef.current = null
      mediaRecorderRef.current = null
      setNahravaHlas(false)

      const kusy = zvukChunkyRef.current
      zvukChunkyRef.current = []
      if (!poslatZaznam || kusy.length === 0) return

      const blob = new Blob(kusy, { type: recorder.mimeType || 'audio/webm' })
      const pripona = recorder.mimeType?.includes('mp4') ? 'm4a' : 'webm'
      const soubor = new File([blob], `hlasovka-${Date.now()}.${pripona}`, { type: blob.type })
      void poslatMedium(soubor)
    }

    recorder.stop()
  }

  // Odchod z chatu (i uprostřed nahrávání) nesmí nechat mikrofon svítit
  // na pozadí — stejná disciplína jako usePoseEngine.ts's úklid kamery.
  useEffect(() => {
    return () => {
      if (hlasovyIntervalRef.current) window.clearInterval(hlasovyIntervalRef.current)
      zvukStreamRef.current?.getTracks().forEach((t) => t.stop())
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
    }
  }, [])

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
                {z.mediaPath && z.mediaType && !smazana && (
                  z.mediaType === 'audio' ? (
                    <ZpravaHlasovka path={z.mediaPath} />
                  ) : (
                    <ZpravaMedium path={z.mediaPath} typ={z.mediaType} />
                  )
                )}
                <span className="social-bublina-radek">
                  {/* Automatický popisek ("📷 Fotka"/"🎥 Video", viz
                      poslatZpravu v api.ts) se pod médiem znovu nevypisuje
                      jako by ho někdo napsal — ukáže se jen skutečný,
                      uživatelem zadaný popisek. */}
                  {!(z.mediaPath && z.mediaType && z.text === VYCHOZI_POPISEK_MEDIA[z.mediaType]) && (
                    <span className="social-bublina-text">{z.text}</span>
                  )}
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

      {/* Dokud se nahrává hlasovka, composer schová celý formulář za tenhle
          řádek — psát ani přikládat souběžně nejde, stejně jako appka
          nedovolí odeslat prázdnou zprávu. */}
      {nahravaHlas ? (
        <div className="social-psani social-nahravani-hlasu">
          <span className="social-nahravani-tecka" aria-hidden="true" />
          <span className="social-nahravani-cas">{formatDelku(hlasovyCasS)}</span>
          <span className="social-nahravani-popis">Nahrávám hlasovku…</span>
          <button
            type="button"
            className="social-icon-btn social-icon-btn--ne"
            aria-label="Zrušit nahrávku"
            onClick={() => ukoncitNahravaniHlasu(false)}
          >
            <SocialIcon name="x" size={18} />
          </button>
          <button
            type="button"
            className="social-send-btn"
            aria-label="Odeslat hlasovku"
            onClick={() => ukoncitNahravaniHlasu(true)}
          >
            <SocialIcon name="check" size={18} />
          </button>
        </div>
      ) : (
        <form className="social-psani" onSubmit={odeslat}>
          <input
            ref={souborInputRef}
            type="file"
            accept="image/*,video/*"
            className="social-soubor-input"
            onChange={(e) => {
              const soubor = e.target.files?.[0]
              e.target.value = '' // stejný soubor jde vybrat i podruhé za sebou
              if (soubor) void poslatMedium(soubor)
            }}
          />
          <button
            type="button"
            className="social-icon-btn"
            aria-label="Přiložit fotku nebo video"
            disabled={nahravaMedium}
            onClick={() => souborInputRef.current?.click()}
          >
            <SocialIcon name={nahravaMedium ? 'send' : 'attach'} size={18} />
          </button>
          <input
            className="social-input social-input--zprava"
            placeholder="Napiš zprávu…"
            value={text}
            maxLength={4000}
            onChange={(e) => napovedPsani(e.target.value)}
            disabled={posila}
          />
          {/* Mikrofon nahrazuje odesílací tlačítko, dokud je pole prázdné —
              stejný vzor jako Messenger/WhatsApp, ať appka nemusí mít dvě
              tlačítka vedle sebe napořád. Text má vždycky přednost: jakmile
              je co odeslat jako text, mic zmizí. */}
          {!text.trim() && PODPORUJE_NAHRAVANI_HLASU ? (
            <button
              type="button"
              className="social-send-btn"
              aria-label="Nahrát hlasovou zprávu"
              disabled={posila || nahravaMedium}
              onClick={() => void zacitNahravaniHlasu()}
            >
              <SocialIcon name="mic" size={18} />
            </button>
          ) : (
            <button
              className={`social-send-btn ${odeslano ? 'je-odeslano' : ''}`}
              type="submit"
              aria-label="Odeslat"
              disabled={posila || !text.trim()}
            >
              <SocialIcon name={odeslano ? 'check' : 'send'} size={18} />
            </button>
          )}
        </form>
      )}

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
