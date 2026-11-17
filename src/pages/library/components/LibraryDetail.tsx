import { useEffect, useState, type RefObject } from 'react'
import { AppIcon } from '@/pages/app/components/AppIcon'
import { SocialIcon } from '@/social/components/SocialIcon'
import type { PostupZaznam } from '@/core/utils/libraryShelfValidation'
import { nactiTextOffline, smazTextOffline } from '../libraryOffline'
import { stahnoutOffline } from '../libraryTextApi'
import { druhDilaNazev, jeCitelne, licenceNazev, vekNazev, type KatalogDilo } from '../libraryTypes'

interface Props {
  dilo: KatalogDilo
  postup?: PostupZaznam
  naPolici: boolean
  onUlozit: () => void
  onOtevrit: () => void
  otevritRef: RefObject<HTMLButtonElement>
}

type OfflineStav = 'zjistuji' | 'ne' | 'stahuji' | 'ano' | 'chyba'

/** Tlačítko pro čtení bez připojení — jen u děl z katalogu (ukázky jsou v appce natvrdo). */
function OfflineKopie({ workId }: { workId: string }) {
  const [stav, setStav] = useState<OfflineStav>('zjistuji')

  useEffect(() => {
    let zruseno = false
    setStav('zjistuji')
    void nactiTextOffline(workId).then((k) => {
      if (!zruseno) setStav(k ? 'ano' : 'ne')
    })
    return () => {
      zruseno = true
    }
  }, [workId])

  const stahni = async () => {
    setStav('stahuji')
    setStav((await stahnoutOffline(workId)) ? 'ano' : 'chyba')
  }
  const smaz = async () => {
    await smazTextOffline(workId)
    setStav('ne')
  }

  if (stav === 'zjistuji') return null
  return (
    <div className="library-offline">
      {stav === 'ano' ? (
        <>
          <p className="library-hint">Uloženo pro čtení bez připojení.</p>
          <button type="button" className="library-secondary" onClick={() => void smaz()}>Smazat offline kopii</button>
        </>
      ) : (
        <>
          <button type="button" className="library-secondary" onClick={() => void stahni()} disabled={stav === 'stahuji'}>
            {stav === 'stahuji' ? 'Stahuji…' : 'Stáhnout pro čtení offline'}
          </button>
          {stav === 'chyba' && <p className="library-hint" role="alert">Stažení se nepovedlo. Zkontroluj připojení.</p>}
        </>
      )}
    </div>
  )
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
      {lzeCist && dilo.zdroj === 'katalog' && <OfflineKopie workId={dilo.id} />}
      {!lzeCist && (
        <p id="library-ctecka-brzy" className="library-hint">
          Dílo si můžeš uložit na polici. Čtení v appce se připravuje.
        </p>
      )}
    </section>
  )
}
