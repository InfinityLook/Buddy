import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { SocialIcon } from './SocialIcon'
import { SocialAvatar } from './SocialAvatar'
import { NahlasitDialog } from './NahlasitDialog'
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
  /** Jen kvůli NahlasitDialog.tsx (hláška po odeslání, obnovit stav
   *  po zablokování) — appka nikde jinde v tomhle prohlížeči Social
   *  stav nepotřebuje. */
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
  const [ulozeno, setUlozeno] = useState<boolean | null>(null)
  const [meniUlozeni, setMeniUlozeni] = useState(false)

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
    const vysledek = await api.pridatKomentar(prispevek.id, text)
    if (vysledek.ok) {
      setNovyKomentar('')
      void api.nactiKomentare(prispevek.id).then(setKomentare)
    }
    setOdesila(false)
  }

  const smazatKomentar = async (id: string) => {
    const vysledek = await api.smazatKomentar(id)
    if (vysledek.ok) setKomentare((k) => k.filter((x) => x.id !== id))
  }

  // Tady na rozdíl od FeedPrispevek.tsx klik na obrázek dnes nic
  // nedělá — žádný onJedenKlik se nepředává, takže dvojklik-lajk
  // nezavádí žádné zpoždění jednoho kliknutí.
  const { zpracovatKliknuti, srdceViditelne } = useDoubleTapLike(prispevek.id, vztah, setVztah)

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
        {prispevek.mediaType === 'video' ? (
          <video src={prispevek.mediaUrl} className="social-story-obrazek" controls playsInline autoPlay />
        ) : (
          <img src={prispevek.mediaUrl} alt="" className="social-story-obrazek" />
        )}
        {srdceViditelne && (
          <span className="social-feed-dvojklik-srdce" aria-hidden="true">
            <SocialIcon name="heart-filled" size={90} />
          </span>
        )}
      </div>

      {prispevek.caption && <p className="social-story-popisek">{prispevek.caption}</p>}

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
      </div>

      <div className="social-prispevek-komentare">
        {komentare.length === 0 ? (
          <p className="social-empty-note">Zatím žádné komentáře. Buď první.</p>
        ) : (
          komentare.map((k) => (
            <div key={k.id} className="social-prispevek-komentar">
              <SocialAvatar id={k.autor.id} jmeno={k.autor.displayName} avatarUrl={k.autor.avatarUrl} velikost={26} />
              <span className="social-prispevek-komentar-text">
                <strong>{k.autor.displayName}</strong> {k.text}
              </span>
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
          ))
        )}
      </div>

      <form className="social-prispevek-komentar-formular" onSubmit={odeslatKomentar}>
        <input
          className="social-input social-input--full"
          placeholder="Napiš komentář…"
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
    </div>,
    // Portál do document.body — stejný důvod jako u StoryProhlizec.tsx/
    // pages/profil/components/PridatPrispevekDialog.tsx.
    document.body
  )
}
