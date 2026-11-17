import { useEffect, useState } from 'react'
import { nactiKatalog } from './libraryApi'
import { UKAZKOVA_DILA } from './libraryCatalog'
import type { KatalogDilo } from './libraryTypes'

export interface StavKatalogu {
  dila: readonly KatalogDilo[]
  nacitani: boolean
  /** true = v databázi zatím nic není, ukazují se zabudované ukázky. */
  ukazkovyRezim: boolean
}

/** Katalog z databáze; když je prázdný nebo nedostupný, ukázkové tituly. */
export function useLibraryKatalog(): StavKatalogu {
  const [stav, setStav] = useState<StavKatalogu>({ dila: UKAZKOVA_DILA, nacitani: true, ukazkovyRezim: true })

  useEffect(() => {
    let zruseno = false
    void nactiKatalog().then((dila) => {
      if (zruseno) return
      setStav(
        dila.length > 0
          ? { dila, nacitani: false, ukazkovyRezim: false }
          : { dila: UKAZKOVA_DILA, nacitani: false, ukazkovyRezim: true },
      )
    })
    return () => {
      zruseno = true
    }
  }, [])

  return stav
}
