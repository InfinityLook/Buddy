import { useRef, useState } from 'react'
import * as api from './api'
import type { VztahKPrispevku } from './types'

const OKNO_DVOJKLIKU_MS = 300
const TRVANI_SRDCE_MS = 800

// ==========================================
// Dvojklik/dvojťuk na obrázek či video příspěvku = lajk, ve stylu
// Instagramu: druhé kliknutí do OKNO_DVOJKLIKU_MS od prvního vždy jen
// *přidá* lajk (nikdy neodebere existující — stejná jednosměrnost jako
// samotný IG, kde dvojťuk nikdy neodlajkuje), a na chvíli zobrazí přes
// médium velké srdce. pridatLajk() je navíc idempotentní (viz komentář
// tam — dvojí klepnutí narazí na kolizi primárního klíče, ne na
// skutečnou chybu), takže dvojklik na už lajknutý příspěvek je bezpečný
// no-op i bez kontroly stavu tady.
//
// Volitelný onJedenKlik dostane šanci proběhnout jen tehdy, když druhé
// kliknutí v okně doopravdy nepřijde — appka totiž nemá jak dopředu
// poznat, jestli je zrovna prováděné kliknutí první z dvojice, dokud
// neuplyne stejné okno. FeedPrispevek.tsx tím posouvá otevření celého
// příspěvku o těch pár desítek milisekund; PrispevekProhlizec.tsx
// (kde klik na obrázek dnes nic nedělá) žádný onJedenKlik nepředává,
// takže tam se nic neposouvá.
//
// Sdíleno mezi oběma místy, ať tahle logika nežije zvlášť na dvou
// místech, které by se dřív nebo později rozešly.
export const useDoubleTapLike = (
  postId: string,
  vztah: VztahKPrispevku | null,
  setVztah: (v: VztahKPrispevku) => void,
  onJedenKlik?: () => void
) => {
  const posledniKlikRef = useRef(0)
  const casovacRef = useRef<number | null>(null)
  const [srdceViditelne, setSrdceViditelne] = useState(false)

  const zpracovatKliknuti = () => {
    const ted = Date.now()

    if (ted - posledniKlikRef.current < OKNO_DVOJKLIKU_MS) {
      if (casovacRef.current !== null) {
        window.clearTimeout(casovacRef.current)
        casovacRef.current = null
      }
      posledniKlikRef.current = 0

      setSrdceViditelne(true)
      window.setTimeout(() => setSrdceViditelne(false), TRVANI_SRDCE_MS)

      if (!vztah?.lajkujiJa) {
        void api.pridatLajk(postId).then((v) => {
          if (v.ok) void api.nactiVztahKPrispevku(postId).then(setVztah)
        })
      }
      return
    }

    posledniKlikRef.current = ted
    if (onJedenKlik) {
      casovacRef.current = window.setTimeout(() => {
        casovacRef.current = null
        onJedenKlik()
      }, OKNO_DVOJKLIKU_MS)
    }
  }

  return { zpracovatKliknuti, srdceViditelne }
}
