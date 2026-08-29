import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { SocialIcon } from './SocialIcon'
import { SocialAvatar } from './SocialAvatar'
import { NahlasitDialog } from './NahlasitDialog'
import { SdiletPrispevekDialog } from './SdiletPrispevekDialog'
import * as api from '../api'
import { useDoubleTapLike } from '../useDoubleTapLike'
import type { Komentar, Prispevek, VztahKPrispevku } from '../types'
import type { SocialStav } from '../useSocial'

interface Props {
  prispevek: Prispevek
  /** Smazat smí jen autor — na vlastním profilu appka žádnou jinou
   *  mřížku nikdy nezobrazí, ale VerejnyProfilDialog.tsx (cizí profil)
   *  ukazuje tenhle prohlížeč i nad příspěvky, které přihlášenému
   *  nepatří, takže tlačítko smazání se tu (na rozdíl od dřívější
   *  verze, která žila jen v pages/profil/) musí umět skrýt. */
  jeMoje: boolean
  /** Kdo je přihlášený — potřeba na "je tenhle komentář můj?" (smím ho
   *  smazat i bez toho, abych byl majitel příspěvku) a na obarvení
   *  vlastního srdíčka. */
  mujId: string | null
  /** NahlasitDialog.tsx (hláška po odeslání, obnovit stav po
   *  zablokování) a SdiletPrispevekDialog.tsx (seznam přátel, hláška
   *  po odeslání) — appka nikde jinde v tomhle prohlížeči Social stav
   *  nepotřebuje. */
  stav: SocialStav
  onZavrit: () => void
  onSmazano: () => void
}

/**
 * Celoobrazovkové zobrazení jednoho příspěvku z mřížky — sdílené mezi
 * appčiným vlastním profilem a cizím profilem tady v Social, stejný
 * "jedna komponenta, ne dvě skoro identické" princip jako u
 * VerejnyProfilDialog.tsx samotného.
 *
 * Lajky a komentáře appka natáhne, až se prohlížeč otevře — ne pro
 * celou mřížku najednou, stejný "jen na vyžádání" princip jako
 * VerejnyProfilDialog.tsx's vztah/spolecni.
 */
export const PrispevekProhlizec: React.FC<Props> = ({ prispevek, jeMoje, mujId, stav, onZavrit, onSmazano }) => {
  const [vztah, setVztah] = useState<VztahKPrispevku | null>(null)
  const [meniLajk, setMeniLajk] = useState(false)
  const [komentare, setKomentare] = useState<Komentar[]>([])
  const [novyKomentar, setNovyKomentar] = useState('')
  const [odesila, setOdesila] = useState(false)
  const [nahlasit, setNahlasit] = useState(false)
  const [sdilet, setSdilet] = useState(false)
  const [ulozeno, setUlozeno] = useState<boolean | null>(null)
  const [meniUlozeni, setMeniUlozeni] = useState(false)
  const [odpovidamNaKomentar, setOdpovidamNaKomentar] = useState<{ id: string; jmeno: string } | null>(null)
  // Popisek/editedAt drží appka jako vlastní stav, ne přímo z props —
  // prispevek přichází jako neměnná hodnota od rodiče (mřížka/feed),
  // který se po úpravě sám znovu nenačte, dokud se prohlížeč nezavře.
  const [popisek, setPopisek] = useState(prispevek.caption)
  const [editovanoAt, setEditovanoAt] = useState(prispevek.editedAt)
  const [upravujePopisek, setUpravujePopisek] = useState(false)
  const [novyPopisek, setNovyPopisek] = useState('')
  const [ukladaPopisek, setUkladaPopisek] = useState(false)

  const zacitUpravovatPopisek = () => {
    setNovyPopisek(popisek ?? '')
    setUpravujePopisek(true)
  }

  const ulozitPopisek = async () => {
    setUkladaPopisek(true)
    const vysledek = await api.upravitPopisekPrispevku(prispevek.id, novyPopisek)
    setUkladaPopisek(false)
    if (vysledek.ok) {
      setPopisek(novyPopisek.trim() || null)
      setEditovanoAt(new Date().toISOString())
      setUpravujePopisek(false)
    } else {
      stav.rekni(vysledek.chyba ?? 'Nepovedlo se to.')
    }
  }

  useEffect(() => {
    let platne = true
    void api.nactiVztahKPrispevku(prispevek.id).then((v) => platne && setVztah(v))
    void api.nactiKomentare(prispevek.id).then((k) => platne && setKomentare(k))
    void api.jeUlozenyPrispevek(prispevek.id).then((u) => platne && setUlozeno(u))
    return () => {
      platne = false
    }
  }, [prispevek.id])

  // Uloženo je appka na rozdíl od lajku nikde neukazuje veřejně — jen
  // tobě samotnému, přepnutí proto server znovu nekontroluje, jestli
  // je post pořád vidět, ale to samé dělá zvlášť nacti_ulozene_prispevky()
  // při čtení Uloženého seznamu (viz komentář v api.ts).
  const prepnoutUlozeni = async () => {
    if (ulozeno === null || meniUlozeni) return
    setMeniUlozeni(true)
    const akce = ulozeno ? api.odebratUlozenyPrispevek : api.ulozitPrispevek
    const vysledek = await akce(prispevek.id)
    if (vysledek.ok) setUlozeno(!ulozeno)
    setMeniUlozeni(false)
  }

  const smazat = async () => {
    if (!window.confirm('Smazat tenhle příspěvek?')) return
    const vysledek = await api.smazatPrispevek(prispevek.id)
    if (vysledek.ok) onSmazano()
  }

  // Appka si počet i "lajkuji já?" vždycky znovu natáhne z databáze po
  // akci, ne že by si je jen sama o jedno posunula — server je jediná
  // pravda, stejný vzor jako prepnoutSledovani ve VerejnyProfilDialog.tsx.
  const prepnoutLajk = async () => {
    if (!vztah || meniLajk) return
    setMeniLajk(true)
    const akce = vztah.lajkujiJa ? api.odebratLajk : api.pridatLajk
    const vysledek = await akce(prispevek.id)
    if (vysledek.ok) void api.nactiVztahKPrispevku(prispevek.id).then(setVztah)
    setMeniLajk(false)
  }

  const odeslatKomentar = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = novyKomentar.trim()
    if (!text || odesila) return

    setOdesila(true)
    const vysledek = await api.pridatKomentar(prispevek.id, text, odpovidamNaKomentar?.id)
    if (vysledek.ok) {
      setNovyKomentar('')
      setOdpovidamNaKomentar(null)
      void api.nactiKomentare(prispevek.id).then(setKomentare)
    }
    setOdesila(false)
  }

  const smazatKomentar = async (id: string) => {
    const vysledek = await api.smazatKomentar(id)
    if (vysledek.ok) setKomentare((k) => k.filter((x) => x.id !== id))
  }

  const [zpracovavaLajkKomentare, setZpracovavaLajkKomentare] = useState<string | null>(null)

  // Stejný "server je jediná pravda" vzor jako prepnoutLajk výš u
  // příspěvku samotného — po akci appka znovu natáhne celý seznam
  // komentářů (má ho beztak celý načtený najednou), ne že by si počet
  // jen sama posunula o jedno.
  const prepnoutLajkKomentare = async (k: Komentar) => {
    if (zpracovavaLajkKomentare) return
    setZpracovavaLajkKomentare(k.id)
    const akce = k.lajkujiJa ? api.odebratLajkKomentare : api.pridatLajkKomentare
    const vysledek = await akce(k.id)
    if (vysledek.ok) void api.nactiKomentare(prispevek.id).then(setKomentare)
    setZpracovavaLajkKomentare(null)
  }

  // Appka drží vlákno jen jednu úroveň hluboko (viz Komentar.replyToId)
  // — odpověď na odpověď se přiřadí ke stejnému kořenovému komentáři,
  // ne do dalšího zanoření, stejná plochá hloubka jako u Instagramu.
  const korenoveKomentare = komentare.filter((k) => !k.replyToId)
  const odpovediPodleRodice = new Map<string, Komentar[]>()
  for (const k of komentare) {
    if (!k.replyToId) continue
    const seznam = odpovediPodleRodice.get(k.replyToId) ?? []
    seznam.push(k)
    odpovediPodleRodice.set(k.replyToId, seznam)
  }

  const komentarRadek = (k: Komentar, jeOdpoved: boolean) => (
    <div key={k.id} className={`social-prispevek-komentar ${jeOdpoved ? 'social-prispevek-komentar--odpoved' : ''}`}>
      <SocialAvatar id={k.autor.id} jmeno={k.autor.displayName} avatarUrl={k.autor.avatarUrl} velikost={jeOdpoved ? 22 : 26} />
      <span className="social-prispevek-komentar-text">
        <strong>{k.autor.displayName}</strong> {k.text}
        <button
          className="social-prispevek-komentar-odpovedet"
          onClick={() => setOdpovidamNaKomentar({ id: k.replyToId ?? k.id, jmeno: k.autor.displayName })}
        >
          Odpovědět
        </button>
        {k.pocetLajku > 0 && <span className="social-prispevek-komentar-lajku">{k.pocetLajku}×❤️</span>}
      </span>
      <button
        className={`social-prispevek-komentar-lajk ${k.lajkujiJa ? 'je-lajknuto' : ''}`}
        aria-label={k.lajkujiJa ? 'Odebrat lajk komentáře' : 'Lajkovat komentář'}
        disabled={zpracovavaLajkKomentare === k.id}
        onClick={() => prepnoutLajkKomentare(k)}
      >
        <SocialIcon name={k.lajkujiJa ? 'heart-filled' : 'heart'} size={13} />
      </button>
      {(k.autor.id === mujId || jeMoje) && (
        <button
          className="social-prispevek-komentar-smazat"
          aria-label="Smazat komentář"
          onClick={() => smazatKomentar(k.id)}
        >
          <SocialIcon name="x" size={14} />
        </button>
      )}
    </div>
  )

  // Tady na rozdíl od FeedPrispevek.tsx klik na obrázek dnes nic
  // nedělá — žádný onJedenKlik se nepředává, takže dvojklik-lajk
  // nezavádí žádné zpoždění jednoho kliknutí.
  const { zpracovatKliknuti, srdceViditelne } = useDoubleTapLike(prispevek.id, vztah, setVztah)

  // Karusel — první položka zůstává prispevek.mediaUrl/mediaType, další
  // přijdou z prispevek.dalsiMedia (viz types.ts). Posun appka nechává
  // na nativním scroll-snap (žádný gesture kód navíc), jen si sleduje
  // aktivní index přes onScroll, ať má co ukázat v tečkovém indikátoru.
  const vsechnaMedia = [
    { mediaUrl: prispevek.mediaUrl, mediaType: prispevek.mediaType },
    ...prispevek.dalsiMedia,
  ]
  const [aktivniMedium, setAktivniMedium] = useState(0)
  const karuselRef = useRef<HTMLDivElement>(null)

  return createPortal(
    <div className="social-story-prohlizec" role="dialog" aria-modal="true" aria-label="Příspěvek">
      <div className="social-story-prohlizec-hlavicka">
        <span className="social-story-autor-jmeno" />
        {jeMoje ? (
          <button className="social-story-akce-btn" onClick={smazat} aria-label="Smazat příspěvek">
            <SocialIcon name="trash" size={18} />
          </button>
        ) : (
          <button className="social-story-akce-btn" onClick={() => setNahlasit(true)} aria-label="Nahlásit příspěvek">
            <SocialIcon name="flag" size={18} />
          </button>
        )}
        <button className="social-story-zavrit" onClick={onZavrit} aria-label="Zavřít">
          <SocialIcon name="x" size={22} />
        </button>
      </div>

      <div className="social-story-plocha" onClick={zpracovatKliknuti}>
        {vsechnaMedia.length > 1 ? (
          <div
            className="social-prispevek-karusel"
            ref={karuselRef}
            onScroll={(e) => {
              const el = e.currentTarget
              if (el.clientWidth > 0) setAktivniMedium(Math.round(el.scrollLeft / el.clientWidth))
            }}
          >
            {vsechnaMedia.map((m, i) =>
              m.mediaType === 'video' ? (
                <video key={i} src={m.mediaUrl} className="social-prispevek-karusel-snimek" controls playsInline />
              ) : (
                <img key={i} src={m.mediaUrl} alt="" className="social-prispevek-karusel-snimek" />
              )
            )}
          </div>
        ) : prispevek.mediaType === 'video' ? (
          <video src={prispevek.mediaUrl} className="social-story-obrazek" controls playsInline autoPlay />
        ) : (
          <img src={prispevek.mediaUrl} alt="" className="social-story-obrazek" />
        )}
        {srdceViditelne && (
          <span className="social-feed-dvojklik-srdce" aria-hidden="true">
            <SocialIcon name="heart-filled" size={90} />
          </span>
        )}
        {vsechnaMedia.length > 1 && (
          <div className="social-prispevek-karusel-tecky" aria-hidden="true">
            {vsechnaMedia.map((_, i) => (
              <span key={i} className={`social-prispevek-karusel-tecka ${i === aktivniMedium ? 'je-aktivni' : ''}`} />
            ))}
          </div>
        )}
      </div>

      {upravujePopisek ? (
        <div className="social-prispevek-popisek-uprava">
          <input
            className="social-input social-input--full"
            value={novyPopisek}
            maxLength={200}
            onChange={(e) => setNovyPopisek(e.target.value)}
            autoFocus
          />
          <button className="social-btn social-btn--small" onClick={ulozitPopisek} disabled={ukladaPopisek}>
            Uložit
          </button>
          <button
            className="social-btn social-btn--small social-btn--tlumene"
            onClick={() => setUpravujePopisek(false)}
            disabled={ukladaPopisek}
          >
            Zrušit
          </button>
        </div>
      ) : (
        (popisek || jeMoje) && (
          <p className="social-story-popisek">
            {popisek}
            {jeMoje && (
              <button className="social-prispevek-popisek-upravit" onClick={zacitUpravovatPopisek} aria-label="Upravit popisek">
                <SocialIcon name="pencil" size={13} />
              </button>
            )}
            {editovanoAt && <span className="social-prispevek-popisek-editovano"> (upraveno)</span>}
          </p>
        )
      )}

      <div className="social-prispevek-lajk-radek">
        <button
          className={`social-prispevek-lajk-btn ${vztah?.lajkujiJa ? 'je-lajknuto' : ''}`}
          onClick={prepnoutLajk}
          disabled={!vztah || meniLajk}
          aria-label={vztah?.lajkujiJa ? 'Odebrat lajk' : 'Lajkovat'}
        >
          <SocialIcon name={vztah?.lajkujiJa ? 'heart-filled' : 'heart'} size={20} />
        </button>
        <span className="social-prispevek-lajk-pocet">
          {vztah?.pocetLajku ? `${vztah.pocetLajku} ${vztah.pocetLajku === 1 ? 'lajk' : vztah.pocetLajku < 5 ? 'lajky' : 'lajků'}` : 'Zatím žádný lajk'}
        </span>

        <button
          className="social-prispevek-ulozit-btn"
          onClick={prepnoutUlozeni}
          disabled={ulozeno === null || meniUlozeni}
          aria-label={ulozeno ? 'Odebrat z uloženého' : 'Uložit příspěvek'}
        >
          <SocialIcon name={ulozeno ? 'bookmark-filled' : 'bookmark'} size={20} />
        </button>

        <button className="social-prispevek-sdilet-btn" onClick={() => setSdilet(true)} aria-label="Poslat příspěvek">
          <SocialIcon name="share" size={20} />
        </button>
      </div>

      <div className="social-prispevek-komentare">
        {komentare.length === 0 ? (
          <p className="social-empty-note">Zatím žádné komentáře. Buď první.</p>
        ) : (
          korenoveKomentare.map((k) => (
            <React.Fragment key={k.id}>
              {komentarRadek(k, false)}
              {(odpovediPodleRodice.get(k.id) ?? []).map((o) => komentarRadek(o, true))}
            </React.Fragment>
          ))
        )}
      </div>

      {odpovidamNaKomentar && (
        <div className="social-odpoved-lista">
          <span className="social-odpoved-text">Odpovídáš {odpovidamNaKomentar.jmeno}</span>
          <button
            className="social-icon-btn"
            aria-label="Zrušit odpověď"
            onClick={() => setOdpovidamNaKomentar(null)}
          >
            <SocialIcon name="x" size={14} />
          </button>
        </div>
      )}

      <form className="social-prispevek-komentar-formular" onSubmit={odeslatKomentar}>
        <input
          className="social-input social-input--full"
          placeholder={odpovidamNaKomentar ? `Odpověz ${odpovidamNaKomentar.jmeno}…` : 'Napiš komentář…'}
          value={novyKomentar}
          maxLength={500}
          onChange={(e) => setNovyKomentar(e.target.value)}
        />
        <button
          className="social-btn social-btn--small"
          type="submit"
          disabled={!novyKomentar.trim() || odesila}
        >
          <SocialIcon name="send" size={16} />
        </button>
      </form>

      {nahlasit && (
        <NahlasitDialog
          userId={prispevek.autorId}
          postId={prispevek.id}
          stav={stav}
          onZavrit={() => setNahlasit(false)}
        />
      )}

      {sdilet && <SdiletPrispevekDialog postId={prispevek.id} stav={stav} onZavrit={() => setSdilet(false)} />}
    </div>,
    // Portál do document.body — stejný důvod jako u StoryProhlizec.tsx/
    // pages/profil/components/PridatPrispevekDialog.tsx.
    document.body
  )
}
