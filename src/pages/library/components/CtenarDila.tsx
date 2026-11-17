import { useEffect, useState } from 'react'
import { nactiTextDila, type TextDilo } from '../libraryTextApi'
import { useLibraryPostup } from '../useLibraryPostup'
import { useLibraryAnnotations } from '../useLibraryAnnotations'
import type { KatalogDilo } from '../libraryTypes'
import { TextovaCtecka, type PostupCteni } from './TextovaCtecka'

// Načte text díla z databáze, nasadí uložený postup a ukládá nový.
type Stav = { faze: 'nacitam' } | { faze: 'chyba' } | { faze: 'prazdne' } | { faze: 'hotovo'; dilo: TextDilo }

export function CtenarDila({ dilo, onBack }: { dilo: KatalogDilo; onBack: () => void }) {
  const [stav, setStav] = useState<Stav>({ faze: 'nacitam' })
  const [pokus, setPokus] = useState(0)
  const ulozPostup = useLibraryPostup((s) => s.ulozPostup)
  const vsechnyAnotace = useLibraryAnnotations((s) => s.anotace)

  useEffect(() => {
    let zruseno = false
    setStav({ faze: 'nacitam' })
    void nactiTextDila(dilo.id).then((text) => {
      if (zruseno) return
      if (!text) setStav({ faze: 'chyba' })
      else if (text.kapitoly.every((k) => k.bloky.length === 0)) setStav({ faze: 'prazdne' })
      else setStav({ faze: 'hotovo', dilo: text })
    })
    return () => {
      zruseno = true
    }
  }, [dilo.id, pokus])

  if (stav.faze === 'nacitam') {
    return <section className="library-empty" aria-busy="true"><h2>Načítám text…</h2></section>
  }
  if (stav.faze === 'chyba' || stav.faze === 'prazdne') {
    return (
      <section className="library-empty">
        <h2>{stav.faze === 'chyba' ? 'Dílo se nepodařilo načíst' : 'Tohle dílo zatím nemá žádný text'}</h2>
        <p>{stav.faze === 'chyba' ? 'Zkontroluj připojení a zkus to znovu.' : 'Zkus to později.'}</p>
        {stav.faze === 'chyba' && (
          <button type="button" className="library-secondary" onClick={() => setPokus((p) => p + 1)}>Zkusit znovu</button>
        )}
        <button type="button" className="library-secondary" onClick={onBack}>Zpět na polici</button>
      </section>
    )
  }

  const { versionId, kapitoly } = stav.dilo
  // Postup se čte jednou při otevření; průběžné změny řeší čtečka sama.
  const ulozeny = useLibraryPostup.getState().postupy.find((p) => p.id === dilo.id)
  const jeStejnaVerze = !ulozeny?.versionId || ulozeny.versionId === versionId
  const start = ulozeny && jeStejnaVerze && !ulozeny.finishedAt
    ? { kapitolaIdx: ulozeny.chapterPos, blockIdx: ulozeny.blockIdx }
    : { kapitolaIdx: 0, blockIdx: 0 }

  const anotaceDila = vsechnyAnotace.filter((a) => a.workId === dilo.id && !a.deletedAt)

  const hlasit = (p: PostupCteni) =>
    ulozPostup(dilo.id, {
      versionId,
      chapterPos: p.kapitolaIdx,
      blockIdx: p.blockIdx,
      percent: p.percent,
      secondsRead: p.secondsRead,
      finishedAt: p.dokonceno ? (ulozeny?.finishedAt ?? Date.now()) : (ulozeny?.finishedAt ?? null),
    })

  return (
    <TextovaCtecka
      dilo={dilo}
      kapitoly={kapitoly}
      start={start}
      zacatekSekund={ulozeny?.secondsRead ?? 0}
      versionId={versionId}
      zOffline={!!stav.dilo.zOffline}
      anotace={anotaceDila}
      onProgress={hlasit}
      onBack={onBack}
    />
  )
}
