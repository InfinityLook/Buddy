import { useCallback, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { sousedniStranky, type ModulovaStranka } from './moduloveStranky'

// ==========================================
// Fáze 5 Social nav reworku (viz CLAUDE.md) — vodorovný swipe mezi
// Hub/Apps/Profil/Nastavení, čistě z touchstart/touchend (žádný
// touchmove, žádný preventDefault). React od verze 17 registruje
// touchmove na kořeni jako pasivní kvůli výkonu scrollování — volání
// preventDefault() uvnitř syntetického onTouchMove handleru by tak
// stejně nic nezablokovalo (jen by to prohlížeč nahlásil do konzole),
// takže appka to ani nezkouší. Místo toho appka jen porovná, kam prst
// dorazil na konci gesta — vodorovné svištění po obrazovce appka
// pozná od svislého scrollování stránky (Profil/Apps/Nastavení se
// samy posouvají nahoru/dolů) tím, že vodorovná dráha musí výrazně
// převažovat nad svislou, ne jen být nenulová.
//
// `moznosti.sousedni` a `moznosti.onPrejit` jsou nové — appka je
// dřív vůbec neměla, protože jediný volající (Hub/Apps/Profil/
// Nastavení) vždycky chtěl sousedniStranky() a obyčejný navigate().
// FlagshipShell.tsx (swipe mezi vlajkovými Roomy) potřebuje jinou
// řadu (sousedniRoom(), zacyklující) a animovaný přechod
// (useModulovyPrechod()) místo obyčejného navigate() — proto obojí
// jde přepsat, s výchozími hodnotami, co drží appčino už dřív
// existující chování beze změny pro všechny čtyři starší volající.
// ==========================================

const PRAH_PX = 70
const POMER_SMERU = 1.5

interface Moznosti {
  sousedni?: (pathname: string) => { predchozi: ModulovaStranka | null; dalsi: ModulovaStranka | null }
  onPrejit?: (cesta: string, smer: 'vpravo' | 'vlevo') => void
}

export const useModulovySwipe = (moznosti?: Moznosti) => {
  const location = useLocation()
  const navigate = useNavigate()
  const zacatek = useRef<{ x: number; y: number } | null>(null)
  const sousedniFn = moznosti?.sousedni ?? sousedniStranky
  const onPrejit = moznosti?.onPrejit

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0]
    if (t) zacatek.current = { x: t.clientX, y: t.clientY }
  }, [])

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const zac = zacatek.current
      zacatek.current = null
      const t = e.changedTouches[0]
      if (!zac || !t) return

      const dx = t.clientX - zac.x
      const dy = t.clientY - zac.y
      if (Math.abs(dx) < PRAH_PX || Math.abs(dx) < Math.abs(dy) * POMER_SMERU) return

      const { predchozi, dalsi } = sousedniFn(location.pathname)
      if (dx < 0 && dalsi) {
        if (onPrejit) onPrejit(dalsi.cesta, 'vpravo')
        else navigate(dalsi.cesta)
      } else if (dx > 0 && predchozi) {
        if (onPrejit) onPrejit(predchozi.cesta, 'vlevo')
        else navigate(predchozi.cesta)
      }
    },
    [location.pathname, navigate, sousedniFn, onPrejit]
  )

  return { onTouchStart, onTouchEnd }
}
