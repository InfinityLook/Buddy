import { forwardRef, useEffect, useRef, useState } from 'react'
import { SocialAvatar } from './SocialAvatar'
import { SocialIcon } from './SocialIcon'
import { SdiletPrispevekDialog } from './SdiletPrispevekDialog'
import * as api from '../api'
import { useDoubleTapLike } from '../useDoubleTapLike'
import type { Prispevek, SocialProfil, VztahKPrispevku } from '../types'
import type { SocialStav } from '../useSocial'

interface Props {
  prispevek: Prispevek
  autor: SocialProfil | null
  /** Je tenhle příspěvek zrovna ten, na kterém uživatel je (viz
   *  IntersectionObserver ve Feed.tsx) — jedině tehdy smí video hrát.
   *  Bez tohohle by na jedné obrazovce najednou hrálo (a mlčky
   *  spotřebovávalo) zvuk/výkon i video, které uživatel vůbec nevidí. */
  aktivni: boolean
  online: boolean
  /** Jedna společná preference pro celý feed (viz DomuPanel.tsx), ne
   *  vlastní stav tady — appka si zvuk pamatuje mezi příspěvky. */
  zvukZapnuty: boolean
  onPrepnoutZvuk: () => void
  onOtevritProfil: () => void
  onOtevritDetail: () => void
  /** Jen pro dialog sdílení (SdiletPrispevekDialog) níž — appka to tahá
   *  přes DomuPanel.tsx, žádný jiný kus komponenty to nepotřebuje. */
  stav: SocialStav
}

/**
 * Jedna "stránka" feedu na Domů — celoobrazovkový příspěvek ve stylu
 * TikToku (médium přes celou dostupnou výšku, akce přes průsvitný
 * kruh vpravo, autor/popisek dole vlevo), ale appčin vlastní vzhled
 * (skleněné kruhy jako .social-icon-btn, ne stínovaná ikona), ne
 * okopírovaný. Lajk jde dát přímo tady bez otevření celého příspěvku;
 * na komentáře appka pošle do PrispevekProhlizec.tsx (onOtevritDetail) —
 * ten samý, co používá mřížka na profilu, ne druhá komponenta pro to
 * samé.
 */
// forwardRef — DomuPanel.tsx potřebuje skutečný DOM uzel kořenového
// <article> pro IntersectionObserver (kdo je "na obrazovce", řídí
// video autoplay i dotažení další stránky), ne kvůli imperativnímu
// volání metod na komponentě samotné.
export const FeedPrispevek = forwardRef<HTMLElement, Props>(function FeedPrispevek(
  { prispevek, autor, aktivni, online, zvukZapnuty, onPrepnoutZvuk, onOtevritProfil, onOtevritDetail, stav },
  ref
) {
  const [vztah, setVztah] = useState<VztahKPrispevku | null>(null)
  const [meniLajk, setMeniLajk] = useState(false)
  const [jeUlozeno, setJeUlozeno] = useState<boolean | null>(null)
  const [meniUlozeni, setMeniUlozeni] = useState(false)
  const [otevrenoSdileni, setOtevrenoSdileni] = useState(false)
  const [videoProgres, setVideoProgres] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    let platne = true
    void api.nactiVztahKPrispevku(prispevek.id).then((v) => platne && setVztah(v))
    void api.jeUlozenyPrispevek(prispevek.id).then((u) => platne && setJeUlozeno(u))
    return () => {
      platne = false
    }
  }, [prispevek.id])

  // Video hraje jen na aktivní stránce feedu — jinak by na pozadí dál
  // běželo, i když ho uživatel vůbec nevidí (zbytečný výkon i data).
  // Appka při každém (zne)aktivnění zároveň vynuluje i ukazatel postupu
  // (.social-feed-video-progres níž) — jinak by starý postup z
  // předchozího zhlédnutí na okamžik probleskl, než timeupdate dorazí.
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    setVideoProgres(0)
    if (aktivni) {
      video.currentTime = 0
      void video.play().catch(() => {})
    } else {
      video.pause()
    }
  }, [aktivni])

  const prepnoutLajk = async () => {
    if (!vztah || meniLajk) return
    setMeniLajk(true)
    const akce = vztah.lajkujiJa ? api.odebratLajk : api.pridatLajk
    const vysledek = await akce(prispevek.id)
    if (vysledek.ok) void api.nactiVztahKPrispevku(prispevek.id).then(setVztah)
    setMeniLajk(false)
  }

  const prepnoutUlozeni = async () => {
    if (jeUlozeno === null || meniUlozeni) return
    setMeniUlozeni(true)
    const akce = jeUlozeno ? api.odebratUlozenyPrispevek : api.ulozitPrispevek
    const vysledek = await akce(prispevek.id)
    if (vysledek.ok) setJeUlozeno(!jeUlozeno)
    setMeniUlozeni(false)
  }

  const { zpracovatKliknuti, srdceViditelne } = useDoubleTapLike(prispevek.id, vztah, setVztah, onOtevritDetail)

  // "Pop" animace srdce v akčním sloupci — appka stejně jako Hub.tsx's
  // vlastní +XP bublina porovnává novou hodnotu proti předchozí (ref),
  // a jen při SKUTEČNÉM přechodu "nelajknuto → lajknuto" (ať už z tlačítka
  // níž nebo z dvojkliku výš, appka neví a nepotřebuje vědět, odkud lajk
  // přišel) na chvíli přidá třídu se zvětšovací animací. Appka schválně
  // první načtení vztahu (null → cokoli) jako "přechod" nepočítá, jinak
  // by se už lajknutý příspěvek hecnul hned, jakmile appka doplní data,
  // ne jen při skutečné uživatelově akci — inicializacniRef hlídá přesně
  // tenhle rozdíl.
  const inicializovanoRef = useRef(false)
  const predchoziLajkRef = useRef(false)
  const [lajkPop, setLajkPop] = useState(false)

  useEffect(() => {
    if (!vztah) return
    if (!inicializovanoRef.current) {
      inicializovanoRef.current = true
      predchoziLajkRef.current = vztah.lajkujiJa
      return
    }
    const predchozi = predchoziLajkRef.current
    predchoziLajkRef.current = vztah.lajkujiJa
    if (!predchozi && vztah.lajkujiJa) {
      setLajkPop(true)
      const t = window.setTimeout(() => setLajkPop(false), 400)
      return () => window.clearTimeout(t)
    }
  }, [vztah])

  return (
    <article className="social-feed-post" ref={ref} data-post-id={prispevek.id}>
      {prispevek.mediaType === 'video' ? (
        <video
          ref={videoRef}
          src={prispevek.mediaUrl}
          className="social-feed-video"
          muted={!zvukZapnuty}
          loop
          playsInline
          onClick={zpracovatKliknuti}
          onTimeUpdate={(e) => {
            const v = e.currentTarget
            if (v.duration) setVideoProgres((v.currentTime / v.duration) * 100)
          }}
        />
      ) : (
        <img
          src={prispevek.mediaUrl}
          alt=""
          className="social-feed-media"
          onClick={zpracovatKliknuti}
        />
      )}

      {/* Tenký ukazatel postupu přehrávání — appka video odjakživa
          přehrává, jen nikde neřekla, jak daleko je (jako TikTok/Reels
          nahoře přes médium). Jen pro video, appka ho nedrží jako
          samostatný div navíc u fotky, kde by neměl co ukazovat. */}
      {prispevek.mediaType === 'video' && (
        <div className="social-feed-video-progres" aria-hidden="true">
          <div className="social-feed-video-progres-vypln" style={{ width: `${videoProgres}%` }} />
        </div>
      )}

      {srdceViditelne && (
        <span className="social-feed-dvojklik-srdce" aria-hidden="true">
          <SocialIcon name="heart-filled" size={90} />
        </span>
      )}

      {/* Karusel se ve feedu neprohrabává (svislé listování mezi
          příspěvky by se rvalo o gesto s vodorovným posunem uvnitř
          jednoho) — jen značka, ať appka řekne "je jich tu víc", víc
          jich uvidí až v detailu (onOtevritDetail). */}
      {prispevek.dalsiMedia.length > 0 && (
        <span className="social-prispevek-karusel-znacka social-prispevek-karusel-znacka--feed">
          <SocialIcon name="layers" size={16} />
        </span>
      )}

      <div className="social-feed-zavoj" aria-hidden="true" />

      <div className="social-feed-info">
        <button className="social-feed-autor" onClick={onOtevritProfil}>
          <SocialAvatar
            id={autor?.id ?? prispevek.autorId}
            jmeno={autor?.displayName ?? '…'}
            avatarUrl={autor?.avatarUrl ?? null}
            online={online}
            velikost={34}
          />
          <span className="social-feed-autor-jmeno">{autor?.displayName ?? '…'}</span>
        </button>
        {prispevek.caption && <p className="social-feed-popisek">{prispevek.caption}</p>}
      </div>

      <div className="social-feed-akce">
        <button
          className={`social-feed-akce-btn ${vztah?.lajkujiJa ? 'je-lajknuto' : ''}`}
          onClick={prepnoutLajk}
          disabled={!vztah || meniLajk}
          aria-label={vztah?.lajkujiJa ? 'Odebrat lajk' : 'Lajkovat'}
        >
          <span className={`social-feed-akce-kruh ${lajkPop ? 'je-pop' : ''}`}>
            <SocialIcon name={vztah?.lajkujiJa ? 'heart-filled' : 'heart'} size={21} />
          </span>
          <span className="social-feed-akce-pocet">{vztah?.pocetLajku ?? ''}</span>
        </button>

        <button className="social-feed-akce-btn" onClick={onOtevritDetail} aria-label="Komentáře">
          <span className="social-feed-akce-kruh">
            <SocialIcon name="chat" size={19} />
          </span>
        </button>

        {/* Uložit a Sdílet appka ve feedu dřív vůbec neměla — obě akce
            už appka má hotové a používá je v detailu příspěvku
            (PrispevekProhlizec.tsx), jen tady v rychlém sloupci chyběly. */}
        <button
          className={`social-feed-akce-btn ${jeUlozeno ? 'je-ulozeno' : ''}`}
          onClick={prepnoutUlozeni}
          disabled={jeUlozeno === null || meniUlozeni}
          aria-label={jeUlozeno ? 'Odebrat z Uloženého' : 'Uložit příspěvek'}
        >
          <span className="social-feed-akce-kruh">
            <SocialIcon name={jeUlozeno ? 'bookmark-filled' : 'bookmark'} size={19} />
          </span>
        </button>

        <button
          className="social-feed-akce-btn"
          onClick={() => setOtevrenoSdileni(true)}
          aria-label="Sdílet příspěvek"
        >
          <span className="social-feed-akce-kruh">
            <SocialIcon name="send" size={19} />
          </span>
        </button>

        {prispevek.mediaType === 'video' && (
          <button
            className="social-feed-akce-btn"
            onClick={onPrepnoutZvuk}
            aria-label={zvukZapnuty ? 'Ztlumit' : 'Zapnout zvuk'}
          >
            <span className="social-feed-akce-kruh">
              <SocialIcon name={zvukZapnuty ? 'volume' : 'volume-off'} size={19} />
            </span>
          </button>
        )}
      </div>

      {otevrenoSdileni && (
        <SdiletPrispevekDialog
          postId={prispevek.id}
          stav={stav}
          onZavrit={() => setOtevrenoSdileni(false)}
        />
      )}
    </article>
  )
})
