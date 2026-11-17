import type { RefObject } from 'react'
import { AppIcon } from '@/pages/app/components/AppIcon'
import { SocialIcon } from '@/social/components/SocialIcon'
import { druhDilaNazev, licenceNazev, vekNazev, type KatalogDilo } from '../libraryTypes'

interface Props {
  dilo: KatalogDilo
  naPolici: boolean
  onUlozit: () => void
  onOtevrit: () => void
  otevritRef: RefObject<HTMLButtonElement>
}

export function LibraryDetail({ dilo, naPolici, onUlozit, onOtevrit, otevritRef }: Props) {
  const maUkazku = Boolean(dilo.ukazka)
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
        disabled={!maUkazku}
        aria-describedby={maUkazku ? undefined : 'library-ctecka-brzy'}
      >
        <span aria-hidden="true">
          <AppIcon name="book" size={17} />
        </span>
        {maUkazku ? 'Otevřít ukázku' : 'Čtečka přibude brzy'}
        {maUkazku && (
          <span aria-hidden="true">
            <AppIcon name="arrow-right" size={16} />
          </span>
        )}
      </button>
      {!maUkazku && (
        <p id="library-ctecka-brzy" className="library-hint">
          Dílo si můžeš uložit na polici. Čtení v appce se připravuje.
        </p>
      )}
    </section>
  )
}
