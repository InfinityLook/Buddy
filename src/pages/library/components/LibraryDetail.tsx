import type { RefObject } from 'react'
import { AppIcon } from '@/pages/app/components/AppIcon'
import { SocialIcon } from '@/social/components/SocialIcon'
import type { PostupZaznam } from '@/core/utils/libraryShelfValidation'
import { druhDilaNazev, jeCitelne, licenceNazev, vekNazev, type KatalogDilo } from '../libraryTypes'

interface Props {
  dilo: KatalogDilo
  postup?: PostupZaznam
  naPolici: boolean
  onUlozit: () => void
  onOtevrit: () => void
  otevritRef: RefObject<HTMLButtonElement>
}

export function LibraryDetail({ dilo, postup, naPolici, onUlozit, onOtevrit, otevritRef }: Props) {
  const lzeCist = jeCitelne(dilo)
  const zacato = !!postup && postup.percent > 0
  const dokonceno = !!postup?.finishedAt
  const popisek = !lzeCist
    ? 'Čtečka přibude brzy'
    : dilo.ukazka ? 'Otevřít ukázku' : dokonceno ? 'Číst znovu' : zacato ? 'Pokračovat ve čtení' : 'Číst'
  return (
    <section className="library-detail" aria-label="Vybrané dílo">
      <div className="library-detail-top">
        <div className="library-description">
          <p className="library-kind">
            {druhDilaNazev(dilo.druh)}
            {dilo.zdroj === 'ukazka' && ' · ukázka'}
          </p>
          <h2>{dilo.title}</h2>
          <p className="library-author">{dilo.autor}</p>
          <p className="library-summary">{dilo.summary}</p>
          <ul className="library-meta" aria-label="Údaje o díle">
            <li>{vekNazev(dilo.vek)}</li>
            <li>{licenceNazev(dilo.licence)}</li>
            {dilo.zanry.map((zanr) => (
              <li key={zanr}>{zanr}</li>
            ))}
          </ul>
        </div>
        <button
          type="button"
          className="library-icon-button library-save"
          aria-pressed={naPolici}
          aria-label={naPolici ? 'Odebrat z mé police' : 'Uložit na mou polici'}
          onClick={onUlozit}
        >
          <span aria-hidden="true">
            <SocialIcon name={naPolici ? 'bookmark-filled' : 'bookmark'} />
          </span>
        </button>
      </div>
      <button
        type="button"
        className="library-primary"
        ref={otevritRef}
        onClick={onOtevrit}
        disabled={!lzeCist}
        aria-describedby={lzeCist ? undefined : 'library-ctecka-brzy'}
      >
        <span aria-hidden="true">
          <AppIcon name="book" size={17} />
        </span>
        {popisek}
        {lzeCist && (
          <span aria-hidden="true">
            <AppIcon name="arrow-right" size={16} />
          </span>
        )}
      </button>
      {lzeCist && dilo.zdroj === 'katalog' && zacato && (
        <div className="library-postup">
          <div className="library-text-pruh" role="progressbar" aria-label="Přečteno" aria-valuemin={0} aria-valuemax={100}
            aria-valuenow={Math.round(postup!.percent)}>
            <span style={{ width: `${postup!.percent}%` }} />
          </div>
          <p className="library-hint">{dokonceno ? 'Dočteno' : `Přečteno ${Math.round(postup!.percent)} %`}</p>
        </div>
      )}
      {!lzeCist && (
        <p id="library-ctecka-brzy" className="library-hint">
          Dílo si můžeš uložit na polici. Čtení v appce se připravuje.
        </p>
      )}
    </section>
  )
}
