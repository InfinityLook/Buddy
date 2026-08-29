import { forwardRef, useEffect, useRef, useState } from 'react'
import { SocialAvatar } from './SocialAvatar'
import { SocialIcon } from './SocialIcon'
import * as api from '../api'
import { useDoubleTapLike } from '../useDoubleTapLike'
import type { Prispevek, SocialProfil, VztahKPrispevku } from '../types'

interface Props {
  prispevek: Prispevek
  autor: SocialProfil | null
  /** Je tenhle příspěvek zrovna ten, na kterém uživatel je (viz
   *  IntersectionObserver ve Feed.tsx) — jedině tehdy smí video hrát.
   *  Bez tohohle by na jedné obrazovce najednou hrálo (a mlčky
   *  spotřebovávalo) zvuk/výkon i video, které uživatel vůbec nevidí. */
  aktivni: boolean
  online: boolean
  onOtevritProfil: () => void
  onOtevritDetail: () => void
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
  { prispevek, autor, aktivni, online, onOtevritProfil, onOtevritDetail },
  ref
) {
  const [vztah, setVztah] = useState<VztahKPrispevku | null>(null)
  const [meniLajk, setMeniLajk] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    let platne = true
    void api.nactiVztahKPrispevku(prispevek.id).then((v) => platne && setVztah(v))
    return () => {
      platne = false
    }
  }, [prispevek.id])

  // Video hraje jen na aktivní stránce feedu — jinak by na pozadí dál
  // běželo, i když ho uživatel vůbec nevidí (zbytečný výkon i data).
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

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

  const { zpracovatKliknuti, srdceViditelne } = useDoubleTapLike(prispevek.id, vztah, setVztah, onOtevritDetail)

  return (
    <article className="social-feed-post" ref={ref} data-post-id={prispevek.id}>
      {prispevek.mediaType === 'video' ? (
        <video
          ref={videoRef}
          src={prispevek.mediaUrl}
          className="social-feed-video"
          muted
          loop
          playsInline
          onClick={zpracovatKliknuti}
        />
      ) : (
        <img
          src={prispevek.mediaUrl}
          alt=""
          className="social-feed-media"
          onClick={zpracovatKliknuti}
        />
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
          <span className="social-feed-akce-kruh">
            <SocialIcon name={vztah?.lajkujiJa ? 'heart-filled' : 'heart'} size={21} />
          </span>
          <span className="social-feed-akce-pocet">{vztah?.pocetLajku ?? ''}</span>
        </button>

        <button className="social-feed-akce-btn" onClick={onOtevritDetail} aria-label="Komentáře">
          <span className="social-feed-akce-kruh">
            <SocialIcon name="chat" size={19} />
          </span>
        </button>
      </div>
    </article>
  )
})
